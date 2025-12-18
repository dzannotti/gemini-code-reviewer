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

export interface ReviewComment {
  path: string
  line: number
  body: string
  confidence: number
  category: "critical" | "quality" | "duplication" | "standards" | "architecture"
}

export interface ReviewResult {
  comments: ReviewComment[]
  summary: string
  verdict: "SHIP" | "FIX_THEN_SHIP" | "DONT_MERGE"
}
