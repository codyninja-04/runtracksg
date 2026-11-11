import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'missing', maxRetries: 1 })

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'

export function claudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

// Pull the input of the first tool call out of a response. Both generators
// force a single tool, so this is where the structured answer lives.
export function toolInput(content: Anthropic.Messages.ContentBlock[], name: string): unknown {
  const block = content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use' && b.name === name)
  return block?.input ?? null
}
