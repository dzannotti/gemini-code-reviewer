import { fetchExistingComments } from "./steps/existing-comments"
import type { ExistingComment } from "./types"

export async function buildPrompt(
  prNumber: number,
  prTitle: string,
  base: string,
  _head: string
): Promise<{ prompt: string; existingComments: ExistingComment[] }> {
  const [template, existingComments] = await Promise.all([
    Bun.file("prompt.md").text(),
    fetchExistingComments(prNumber),
  ])

  const prompt = template
    .replace("{{PR_NUMBER}}", String(prNumber))
    .replace("{{PR_TITLE}}", prTitle)
    .replace("{{BASE_BRANCH}}", base)

  return { prompt, existingComments }
}
