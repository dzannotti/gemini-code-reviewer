import { $ } from "bun"
import type { GeminiResponse } from "./types"

export async function callGemini(prompt: string): Promise<GeminiResponse> {
  const result = await $`gemini -y -o json ${prompt}`.text()
  return JSON.parse(result) as GeminiResponse
}
