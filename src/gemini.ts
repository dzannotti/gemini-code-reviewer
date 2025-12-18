import type { GeminiResponse, GeminiStreamEvent, GeminiConversationStats } from "./types"

const TIMEOUT_MS = 8 * 60 * 1000 // 8 minutes (leave 2 min buffer for job timeout)

export class GeminiTimeoutError extends Error {
  constructor(public prompt: string) {
    super("Gemini CLI timed out after 8 minutes")
    this.name = "GeminiTimeoutError"
  }
}

export interface GeminiResult {
  response: string
  stats: GeminiConversationStats
  events: GeminiStreamEvent[]
}

function parseStreamJson(output: string): { events: GeminiStreamEvent[]; finalResponse: string } {
  const events: GeminiStreamEvent[] = []
  let finalResponse = ""

  for (const line of output.split("\n")) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line) as GeminiStreamEvent
      events.push(event)
      if (event.type === "result" && event.result?.response) {
        finalResponse = event.result.response
      }
    } catch {
      // skip non-JSON lines
    }
  }

  return { events, finalResponse }
}

function computeStats(events: GeminiStreamEvent[]): GeminiConversationStats {
  const toolCalls: { name: string; count: number }[] = []
  const toolMap = new Map<string, number>()
  let turnCount = 0
  let tokenEstimate = 0

  for (const event of events) {
    if (event.type === "turn_start") turnCount++
    if (event.type === "tool_call" && event.tool) {
      const count = toolMap.get(event.tool) || 0
      toolMap.set(event.tool, count + 1)
    }
    if (event.type === "text" && event.text) {
      tokenEstimate += Math.ceil(event.text.length / 4)
    }
  }

  for (const [name, count] of toolMap) {
    toolCalls.push({ name, count })
  }

  return { turnCount, toolCalls, tokenEstimate }
}

export async function callGemini(prompt: string): Promise<GeminiResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const tempFile = `/tmp/gemini-prompt-${Date.now()}.txt`
  await Bun.write(tempFile, prompt)

  try {
    const proc = Bun.spawn(["sh", "-c", `cat "${tempFile}" | gemini -y -o stream-json`], {
      signal: controller.signal,
      stdout: "pipe",
      stderr: "pipe",
    })

    const exitCode = await proc.exited

    if (controller.signal.aborted) {
      throw new GeminiTimeoutError(prompt)
    }

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    if (exitCode !== 0) {
      // Try to capture the error report file gemini creates
      const errorMatch = stderr.match(/Full report available at: ([^\s]+)/)
      const errorFile = errorMatch?.[1]
      if (errorFile) {
        try {
          const errorReport = await Bun.file(errorFile).text()
          throw new Error(`Gemini CLI failed (exit ${exitCode}):\n${stderr}\n\nError report:\n${errorReport}`)
        } catch {
          // couldn't read error file, just use stderr
        }
      }
      throw new Error(`Gemini CLI failed (exit ${exitCode}): ${stderr}`)
    }

    const { events, finalResponse } = parseStreamJson(stdout)
    const stats = computeStats(events)

    return { response: finalResponse, stats, events }
  } finally {
    clearTimeout(timeout)
    try {
      await Bun.file(tempFile).delete?.()
    } catch {
      // ignore cleanup errors
    }
  }
}
