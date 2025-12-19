import type { GeminiStreamEvent, GeminiConversationStats } from "./types"

const TIMEOUT_MS = 8 * 60 * 1000

export class AgentTimeoutError extends Error {
  constructor(public prompt: string) {
    super("Agent timed out after 8 minutes")
    this.name = "AgentTimeoutError"
  }
}

export interface AgentResult {
  response: string
  stats: GeminiConversationStats
  events: GeminiStreamEvent[]
}

type Backend = "gemini" | "copilot"

interface BackendConfig {
  command: (promptFile: string, model?: string) => string
  parseOutput: (stdout: string) => { response: string; events: GeminiStreamEvent[] }
}

const backends: Record<Backend, BackendConfig> = {
  gemini: {
    command: (file, model) => `cat "${file}" | gemini -y -m ${model || "gemini-2.0-flash-lite"} -o stream-json`,
    parseOutput: (stdout) => {
      const events: GeminiStreamEvent[] = []
      let response = ""
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line) as GeminiStreamEvent
          events.push(event)
          if (event.type === "result" && event.result?.response) {
            response = event.result.response
          }
        } catch {
          // skip non-JSON
        }
      }
      return { response, events }
    },
  },
  copilot: {
    command: (file, model) => `copilot --allow-all-tools -s -p "$(cat "${file}")" --model ${model || "gpt-4.1"}`,
    parseOutput: (stdout) => {
      // Copilot with -s outputs just the response
      return { response: stdout.trim(), events: [] }
    },
  },
}

function computeStats(events: GeminiStreamEvent[]): GeminiConversationStats {
  const toolMap = new Map<string, number>()
  let turnCount = 0
  let tokenEstimate = 0

  for (const event of events) {
    if (event.type === "turn_start") turnCount++
    if (event.type === "tool_call" && event.tool) {
      toolMap.set(event.tool, (toolMap.get(event.tool) || 0) + 1)
    }
    if (event.type === "text" && event.text) {
      tokenEstimate += Math.ceil(event.text.length / 4)
    }
  }

  return {
    turnCount,
    toolCalls: Array.from(toolMap, ([name, count]) => ({ name, count })),
    tokenEstimate,
  }
}

export async function callAgent(prompt: string): Promise<AgentResult> {
  const backendName = (process.env.REVIEW_BACKEND || "gemini") as Backend
  const model = process.env.REVIEW_MODEL
  const backend = backends[backendName]

  if (!backend) {
    throw new Error(`Unknown backend: ${backendName}. Use "gemini" or "copilot"`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const tempFile = `/tmp/agent-prompt-${crypto.randomUUID()}.txt`
  await Bun.write(tempFile, prompt)

  try {
    const cmd = backend.command(tempFile, model)
    console.log(`Running ${backendName} with model ${model || "(default)"}`)

    const proc = Bun.spawn(["sh", "-c", cmd], {
      signal: controller.signal,
      stdout: "pipe",
      stderr: "pipe",
    })

    const exitCode = await proc.exited

    if (controller.signal.aborted) {
      throw new AgentTimeoutError(prompt)
    }

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    if (exitCode !== 0) {
      throw new Error(`${backendName} CLI failed (exit ${exitCode}): ${stderr}`)
    }

    const { response, events } = backend.parseOutput(stdout)
    const stats = computeStats(events)

    return { response, stats, events }
  } finally {
    clearTimeout(timeout)
    try {
      await Bun.file(tempFile).delete?.()
    } catch {
      // ignore
    }
  }
}
