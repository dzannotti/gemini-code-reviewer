import type { GeminiResponse } from "./types"

const TIMEOUT_MS = 8 * 60 * 1000 // 8 minutes (leave 2 min buffer for job timeout)

export class GeminiTimeoutError extends Error {
  constructor(public prompt: string) {
    super("Gemini CLI timed out after 8 minutes")
    this.name = "GeminiTimeoutError"
  }
}

export async function callGemini(prompt: string): Promise<GeminiResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const proc = Bun.spawn(["gemini", "-y", "-o", "json"], {
      signal: controller.signal,
      stdin: new TextEncoder().encode(prompt),
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
      throw new Error(`Gemini CLI failed (exit ${exitCode}): ${stderr}`)
    }

    return JSON.parse(stdout) as GeminiResponse
  } finally {
    clearTimeout(timeout)
  }
}
