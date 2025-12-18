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

  // Write prompt to temp file to avoid stdin/argument issues
  const tempFile = `/tmp/gemini-prompt-${Date.now()}.txt`
  await Bun.write(tempFile, prompt)

  try {
    const proc = Bun.spawn(["sh", "-c", `cat "${tempFile}" | gemini -y -o json`], {
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
      throw new Error(`Gemini CLI failed (exit ${exitCode}): ${stderr}`)
    }

    return JSON.parse(stdout) as GeminiResponse
  } finally {
    clearTimeout(timeout)
    // Clean up temp file
    try {
      await Bun.file(tempFile).delete?.()
    } catch {
      // ignore cleanup errors
    }
  }
}
