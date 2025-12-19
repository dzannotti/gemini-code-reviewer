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

export async function fetchDiff(base: string, _head: string): Promise<string> {
  const excludes = IGNORED_PATTERNS.map((p) => `:(exclude)${p}`).join(" ")
  const diff = await $`git diff origin/${base}..HEAD -- . ${excludes}`.text()
  return diff
}
