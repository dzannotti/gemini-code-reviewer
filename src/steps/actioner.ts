import { $ } from "bun"
import type { ReviewComment, ReviewOutput } from "../types"

export async function postReviewComments(
  prNumber: number,
  commitSha: string,
  output: ReviewOutput
): Promise<void> {
  // Post summary as a regular PR comment
  const summaryBody = `## Code Review Summary

**Verdict**: ${formatVerdict(output.verdict)}

${output.summary}

${output.comments.length > 0 ? `_${output.comments.length} inline comment(s) posted below._` : "_No issues found._"}`

  await $`gh pr comment ${prNumber} --body ${summaryBody}`

  // Post inline review comments
  for (const comment of output.comments) {
    await postInlineComment(prNumber, commitSha, comment)
  }
}

async function postInlineComment(
  prNumber: number,
  commitSha: string,
  comment: ReviewComment
): Promise<void> {
  const actionBadges = comment.actions.map(formatAction).join(" ")
  const body = `${actionBadges}\n\n${comment.body}`

  // Use GitHub API to post review comment on specific line
  const payload = JSON.stringify({
    body,
    commit_id: commitSha,
    path: comment.file,
    line: comment.line,
  })

  await $`echo ${payload} | gh api repos/{owner}/{repo}/pulls/${prNumber}/comments -X POST --input -`
}

function formatVerdict(verdict: ReviewOutput["verdict"]): string {
  switch (verdict) {
    case "SHIP":
      return "✅ SHIP"
    case "FIX_THEN_SHIP":
      return "⚠️ FIX THEN SHIP"
    case "DONT_MERGE":
      return "❌ DON'T MERGE"
  }
}

function formatAction(action: string): string {
  switch (action) {
    case "comment":
      return "💬"
    case "edit":
      return "✏️"
    case "close":
      return "✅"
    case "reopen":
      return "🔄"
    default:
      return ""
  }
}
