import { callGemini, GeminiTimeoutError } from "./src/gemini"
import { buildPrompt } from "./src/prompt"
import { parseReviewOutput, filterDuplicates, postReviewComments } from "./src/steps"

const DEBUG_DIR = ".gemini-debug"

async function dumpDebug(prompt: string, error: Error) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const dir = DEBUG_DIR

  await Bun.write(`${dir}/prompt-${timestamp}.md`, prompt)
  await Bun.write(`${dir}/error-${timestamp}.txt`, `${error.name}: ${error.message}\n\n${error.stack}`)

  console.error(`Debug files written to ${dir}/`)
  console.error(`Prompt length: ${prompt.length} chars`)
  console.error(`First 500 chars of prompt:\n${prompt.slice(0, 500)}...`)
}

async function main() {
  const prNumber = process.env.PR_NUMBER
  const prTitle = process.env.PR_TITLE || ""
  const baseBranch = process.env.BASE_BRANCH || "main"
  const headBranch = process.env.HEAD_BRANCH || "HEAD"
  const commitSha = process.env.COMMIT_SHA || ""

  if (!prNumber) {
    console.log("No PR_NUMBER set, running in local test mode")
    const result = await callGemini(`Say "Hello from Gemini!" and nothing else.`)
    console.log("Response:", result.response)
    return
  }

  console.log(`Reviewing PR #${prNumber}: ${prTitle}`)
  console.log(`Base: ${baseBranch}, Head: ${headBranch}`)

  const { prompt, existingComments } = await buildPrompt(
    parseInt(prNumber),
    prTitle,
    baseBranch,
    headBranch
  )

  console.log(`Prompt length: ${prompt.length} chars`)
  console.log(`Existing comments: ${existingComments.length}`)

  let result
  try {
    result = await callGemini(prompt)
  } catch (err) {
    if (err instanceof GeminiTimeoutError) {
      await dumpDebug(err.prompt, err)
      throw new Error("Gemini timed out - debug files written. Check workflow artifacts.")
    }
    if (err instanceof Error) {
      await dumpDebug(prompt, err)
    }
    throw err
  }

  console.log("Raw response:", result.response.slice(0, 200) + "...")

  const review = parseReviewOutput(result.response)
  console.log(`Verdict: ${review.verdict}`)
  console.log(`Comments: ${review.comments.length}`)

  const newComments = filterDuplicates(review.comments, existingComments)
  console.log(`New comments after dedup: ${newComments.length}`)

  const filteredReview = {
    ...review,
    comments: newComments.map((c) => ({
      ...c,
      actions: review.comments.find((rc) => rc.file === c.file && rc.line === c.line)?.actions || ["comment" as const],
    })),
  }

  await postReviewComments(parseInt(prNumber), commitSha, filteredReview)

  console.log("Review posted!")
}

main().catch((err) => {
  console.error("Review failed:", err)
  process.exit(1)
})
