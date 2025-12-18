export interface GeminiResponse {
  session_id: string
  response: string
  stats: GeminiStats
}

export interface GeminiStats {
  models: Record<string, ModelStats>
  tools: ToolStats
  files: FileStats
}

interface ModelStats {
  api: {
    totalRequests: number
    totalErrors: number
    totalLatencyMs: number
  }
  tokens: {
    prompt: number
    candidates: number
    total: number
    cached: number
    thoughts: number
    tool: number
  }
}

interface ToolStats {
  totalCalls: number
  totalSuccess: number
  totalFail: number
  totalDurationMs: number
  totalDecisions: {
    accept: number
    reject: number
    modify: number
    auto_accept: number
  }
  byName: Record<string, unknown>
}

interface FileStats {
  totalLinesAdded: number
  totalLinesRemoved: number
}

export type ReviewAction = "comment" | "edit" | "close" | "reopen"

export interface ReviewComment {
  file: string
  line: number
  actions: ReviewAction[]
  body: string
}

export interface ReviewOutput {
  summary: string
  verdict: "SHIP" | "FIX_THEN_SHIP" | "DONT_MERGE"
  comments: ReviewComment[]
}

export interface ExistingComment {
  id: number
  path: string
  line: number
  body: string
}

export interface PRContext {
  number: number
  base: string
  head: string
  diff: string
  existingComments: ExistingComment[]
}
