import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
const findings = []
const privatePath = /^\.arkitect\/studio-context\//
const email = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi
const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\b(?:SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*[=:]\s*[^\s"']+/gi,
]

for (const file of tracked) {
  if (privatePath.test(file)) findings.push(`${file}: private Studio context is tracked`)
  if (!/\.(?:md|json|js|mjs|ts|tsx|css|html)$/i.test(file)) continue
  const content = readFileSync(file, 'utf8')
  for (const match of content.matchAll(email)) {
    if (!match[1].toLowerCase().endsWith('example.com')) findings.push(`${file}: non-example email address`)
  }
  for (const pattern of secretPatterns) {
    pattern.lastIndex = 0
    if (pattern.test(content)) findings.push(`${file}: possible credential material`)
  }
}

if (findings.length > 0) {
  console.error(`Privacy scan failed:\n${findings.map((finding) => `- ${finding}`).join('\n')}`)
  process.exit(1)
}

console.log(`Privacy scan passed across ${tracked.length} tracked files.`)
