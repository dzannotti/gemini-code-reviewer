import { fetchDiff } from "./steps/diff"
import { fetchExistingComments } from "./steps/existing-comments"
import type { ExistingComment } from "./types"

export async function buildPrompt(
  prNumber: number,
  prTitle: string,
  base: string,
  head: string
): Promise<{ prompt: string; existingComments: ExistingComment[] }> {
  const [diff, existingComments] = await Promise.all([
    fetchDiff(base, head),
    fetchExistingComments(prNumber),
  ])

  const template = await Bun.file("prompt.md").text()

  const existingCommentsText =
    existingComments.length > 0
      ? existingComments
          .map((c) => `- ${c.path}:${c.line}: ${c.body.slice(0, 100)}...`)
          .join("\n")
      : "_No existing comments._"

  const prompt = template
    .replace("{{PR_TITLE}}", prTitle || "_No title_")
    .replace("{{EXISTING_COMMENTS}}", existingCommentsText)
    .replace("{{DIFF}}", diff || "_No diff available._")

  return { prompt, existingComments }
}
