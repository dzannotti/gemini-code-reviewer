import { $ } from "bun"

const IGNORED_PATTERNS = [
  "go.sum",
  "go.mod",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "Gemfile.lock",
  "poetry.lock",
  "composer.lock",
]

const MAX_DIFF_CHARS = 20000

export async function fetchDiff(base: string, _head: string): Promise<string> {
  const excludes = IGNORED_PATTERNS.map((p) => `:(exclude)${p}`).join(" ")
  const diff = await $`git diff origin/${base}..HEAD -- . ${excludes}`.text()

  if (diff.length > MAX_DIFF_CHARS) {
    console.warn(`Diff truncated from ${diff.length} to ${MAX_DIFF_CHARS} chars`)
    return diff.slice(0, MAX_DIFF_CHARS) + "\n\n... (diff truncated)"
  }

  return diff
}
