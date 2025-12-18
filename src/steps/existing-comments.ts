import { $ } from "bun"
import type { ExistingComment } from "../types"

interface GHReviewComment {
  id: number
  path: string
  line: number | null
  body: string
}

export async function fetchExistingComments(prNumber: number): Promise<ExistingComment[]> {
  const raw = await $`gh api repos/{owner}/{repo}/pulls/${prNumber}/comments`.text()
  const comments: GHReviewComment[] = JSON.parse(raw)

  return comments
    .filter((c): c is GHReviewComment & { line: number } => c.line !== null)
    .map((c) => ({
      id: c.id,
      path: c.path,
      line: c.line,
      body: c.body,
    }))
}

export function filterDuplicates(
  newComments: { file: string; line: number; body: string }[],
  existing: ExistingComment[]
): { file: string; line: number; body: string }[] {
  return newComments.filter((nc) => {
    return !existing.some(
      (ec) => ec.path === nc.file && ec.line === nc.line && ec.body === nc.body
    )
  })
}
