# Code Review

Review the following diff and respond with JSON.

## Diff

```diff
{{DIFF}}
```

## Output

Respond with ONLY valid JSON:

```json
{
  "summary": "Brief assessment",
  "verdict": "SHIP",
  "comments": []
}
```

- verdict: "SHIP", "FIX_THEN_SHIP", or "DONT_MERGE"
- comments: array of {file, line, body} for issues found
- If no issues, return empty comments and verdict "SHIP"
