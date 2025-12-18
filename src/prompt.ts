import { fetchDiff } from "./steps/diff"
import { fetchExistingComments } from "./steps/existing-comments"
import type { ExistingComment } from "./types"

export async function buildPrompt(
  prNumber: number,
  _prTitle: string,
  base: string,
  head: string
): Promise<{ prompt: string; existingComments: ExistingComment[] }> {
  const [diff, existingComments] = await Promise.all([
    fetchDiff(base, head),
    fetchExistingComments(prNumber),
  ])

  const template = await Bun.file("prompt.md").text()

  const prompt = template.replace("{{DIFF}}", diff || "_No diff available._")

  return { prompt, existingComments }
}
