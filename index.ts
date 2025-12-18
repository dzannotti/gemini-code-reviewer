import { $ } from "bun"
import { callGemini } from "./src/gemini"

async function main() {
  const prNumber = process.env.PR_NUMBER

  if (!prNumber) {
    console.log("No PR_NUMBER set, running in local test mode")
    const result = await callGemini(`Say "Hello from Gemini!" and nothing else.`)
    console.log("Response:", result.response)
    return
  }

  console.log(`Reviewing PR #${prNumber}...`)

  const result = await callGemini(`Say "Hello! I'm Gemini reviewing PR #${prNumber}" and nothing else.`)

  console.log("Gemini says:", result.response)

  await $`gh pr comment ${prNumber} --body ${result.response}`

  console.log("Comment posted!")
}

main().catch(console.error)
