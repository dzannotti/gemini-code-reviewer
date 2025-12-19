import { callAgent, AgentTimeoutError, type AgentResult } from "./src/agent"
import { buildPrompt } from "./src/prompt"
import { parseReviewOutput, filterDuplicates, postReviewComments } from "./src/steps"
import type { GeminiConversationStats } from "./src/types"
import { mkdir } from "node:fs/promises"

const DEBUG_DIR = "gemini-debug"

async function ensureDebugDir() {
  await mkdir(DEBUG_DIR, { recursive: true })
}

async function dumpDebug(prompt: string, error: Error) {
  await ensureDebugDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  await Bun.write(`${DEBUG_DIR}/prompt-${timestamp}.md`, prompt)
  await Bun.write(`${DEBUG_DIR}/error-${timestamp}.txt`, `${error.name}: ${error.message}\n\n${error.stack}`)
  console.error(`Debug files written to ${DEBUG_DIR}/`)
}

async function dumpConversation(result: AgentResult) {
  await ensureDebugDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  await Bun.write(`${DEBUG_DIR}/conversation-${timestamp}.json`, JSON.stringify(result.events, null, 2))
  await Bun.write(`${DEBUG_DIR}/stats-${timestamp}.json`, JSON.stringify(result.stats, null, 2))
}

function logStats(stats: GeminiConversationStats) {
  console.log("\n=== Gemini Conversation Stats ===")
  console.log(`Turns: ${stats.turnCount}`)
  console.log(`Token estimate: ~${stats.tokenEstimate}`)
  if (stats.toolCalls.length > 0) {
    console.log("Tool usage:")
    for (const { name, count } of stats.toolCalls) {
      console.log(`  ${name}: ${count}`)
    }
  } else {
    console.log("Tool usage: none (direct response)")
  }
  console.log("=================================\n")
}

async function main() {
  const prNumber = process.env.PR_NUMBER
  const prTitle = process.env.PR_TITLE || ""
  const baseBranch = process.env.BASE_BRANCH || "main"
  const headBranch = process.env.HEAD_BRANCH || "HEAD"
  const commitSha = process.env.COMMIT_SHA || ""

  if (!prNumber) {
    console.log("No PR_NUMBER set, running in local test mode")
    const result = await callAgent(`Say "Hello!" and nothing else.`)
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

  await ensureDebugDir()
  await Bun.write(`${DEBUG_DIR}/prompt.txt`, prompt)
  console.log(`Prompt written to ${DEBUG_DIR}/prompt.txt`)

  let result: AgentResult
  try {
    result = await callAgent(prompt)
  } catch (err) {
    if (err instanceof AgentTimeoutError) {
      await dumpDebug(err.prompt, err)
      throw new Error("Gemini timed out - debug files written. Check workflow artifacts.")
    }
    if (err instanceof Error) {
      await dumpDebug(prompt, err)
    }
    throw err
  }

  logStats(result.stats)
  await dumpConversation(result)

  console.log("Raw response:", result.response.slice(0, 500) + (result.response.length > 500 ? "..." : ""))

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
