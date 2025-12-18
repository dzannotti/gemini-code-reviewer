import type { ReviewOutput, ReviewAction } from "../types"

const VALID_ACTIONS: ReviewAction[] = ["comment", "edit", "close", "reopen"]

function isValidActions(actions: string[]): actions is ReviewAction[] {
  return actions.every((a) => VALID_ACTIONS.includes(a as ReviewAction))
}

interface RawReviewOutput {
  summary?: string
  verdict?: string
  comments?: Array<{
    file?: string
    line?: number
    actions?: string[]
    body?: string
  }>
}

export function parseReviewOutput(raw: string): ReviewOutput {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const cleaned = match ? match[1].trim() : raw.trim()

  const parsed: RawReviewOutput = JSON.parse(cleaned)

  if (!parsed.summary || typeof parsed.summary !== "string") {
    throw new Error("Missing or invalid summary")
  }

  if (!parsed.verdict || !["SHIP", "FIX_THEN_SHIP", "DONT_MERGE"].includes(parsed.verdict)) {
    throw new Error(`Invalid verdict: ${parsed.verdict}`)
  }

  if (!Array.isArray(parsed.comments)) {
    throw new Error("Missing or invalid comments array")
  }

  const comments = parsed.comments.map((c, i) => {
    if (!c.file || typeof c.file !== "string") {
      throw new Error(`Comment ${i}: missing or invalid file`)
    }
    if (typeof c.line !== "number") {
      throw new Error(`Comment ${i}: missing or invalid line`)
    }
    if (!Array.isArray(c.actions) || !isValidActions(c.actions)) {
      throw new Error(`Comment ${i}: missing or invalid actions`)
    }
    if (!c.body || typeof c.body !== "string") {
      throw new Error(`Comment ${i}: missing or invalid body`)
    }

    return {
      file: c.file,
      line: c.line,
      actions: c.actions,
      body: c.body,
    }
  })

  return {
    summary: parsed.summary,
    verdict: parsed.verdict as ReviewOutput["verdict"],
    comments,
  }
}
