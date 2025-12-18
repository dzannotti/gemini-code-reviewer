import { fetchExistingComments } from "./steps/existing-comments"
import type { ExistingComment } from "./types"

function formatExistingComments(comments: ExistingComment[]): string {
  if (comments.length === 0) return "_No existing comments._"
  return comments
    .map((c) => `- ${c.path}:${c.line}: ${c.body.slice(0, 100)}`)
    .join("\n")
}

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
    .replace("{{PR_TITLE}}", prTitle)
    .replace("{{EXISTING_COMMENTS}}", formatExistingComments(existingComments))
    .replace("{{BASE_BRANCH}}", base)

  return { prompt, existingComments }
}
