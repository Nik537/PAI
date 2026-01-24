#!/usr/bin/env bun

/**
 * SessionEnd Hook - Captures session summary for UOCS
 *
 * Generates a session summary document when a Claude Code session ends,
 * documenting what was accomplished during the session.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PAI_DIR, HISTORY_DIR } from './lib/pai-paths';

interface SessionData {
  conversation_id: string;
  timestamp: string;
  [key: string]: any;
}

// Get session ID from environment variable or fallback to conversation_id
function getSessionId(data: SessionData): string {
  return process.env.CLAUDE_SESSION_ID || data.conversation_id || 'unknown';
}

async function main() {
  try {
    // Read input from stdin
    const input = await Bun.stdin.text();
    if (!input || input.trim() === '') {
      process.exit(0);
    }

    const data: SessionData = JSON.parse(input);

    // Get session ID from environment or data
    const sessionId = getSessionId(data);

    // Generate timestamp for filename
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '')
      .replace(/\..+/, '')
      .replace('T', '-'); // YYYY-MM-DD-HHMMSS

    const yearMonth = timestamp.substring(0, 7); // YYYY-MM

    // Try to extract session info from raw outputs
    const sessionInfo = await analyzeSession(sessionId, yearMonth);

    // Generate filename with session ID for better tracking
    const shortSessionId = sessionId.substring(0, 8); // First 8 chars of session ID
    const filename = `${timestamp}_${shortSessionId}_SESSION_${sessionInfo.focus}.md`;

    // Ensure directory exists
    const sessionDir = join(HISTORY_DIR, 'sessions', yearMonth);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    // Generate session document with session ID
    const sessionDoc = formatSessionDocument(timestamp, data, sessionInfo, sessionId);

    // Write session file
    writeFileSync(join(sessionDir, filename), sessionDoc);

    // Exit successfully
    process.exit(0);
  } catch (error) {
    // Silent failure - don't disrupt workflow
    console.error(`[UOCS] SessionEnd hook error: ${error}`);
    process.exit(0);
  }
}

async function analyzeSession(conversationId: string, yearMonth: string): Promise<any> {
  // Try to read raw outputs for this session
  const rawOutputsDir = join(HISTORY_DIR, 'raw-outputs', yearMonth);

  let filesChanged: string[] = [];
  let commandsExecuted: string[] = [];
  let toolsUsed: Set<string> = new Set();

  try {
    if (existsSync(rawOutputsDir)) {
      const files = readdirSync(rawOutputsDir).filter(f => f.endsWith('.jsonl'));

      for (const file of files) {
        const filePath = join(rawOutputsDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.session === conversationId) {
              toolsUsed.add(entry.tool);

              // Extract file changes
              if (entry.tool === 'Edit' || entry.tool === 'Write') {
                if (entry.input?.file_path) {
                  filesChanged.push(entry.input.file_path);
                }
              }

              // Extract bash commands
              if (entry.tool === 'Bash' && entry.input?.command) {
                commandsExecuted.push(entry.input.command);
              }
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } catch (error) {
    // Silent failure
  }

  return {
    focus: 'general-work',
    filesChanged: [...new Set(filesChanged)].slice(0, 10), // Unique, max 10
    commandsExecuted: commandsExecuted.slice(0, 10), // Max 10
    toolsUsed: Array.from(toolsUsed),
    duration: 0 // Unknown
  };
}

function formatSessionDocument(timestamp: string, data: SessionData, info: any, sessionId: string): string {
  const date = timestamp.substring(0, 10); // YYYY-MM-DD
  const time = timestamp.substring(11).replace(/-/g, ':'); // HH:MM:SS

  // Session metadata with CLAUDE_SESSION_ID for better tracking
  const sessionMetadata = {
    session_id: sessionId,
    conversation_id: data.conversation_id,
    timestamp: new Date().toISOString(),
    duration_minutes: info.duration,
    executor: 'kai',
    capture_type: 'SESSION'
  };

  return `---
capture_type: SESSION
timestamp: ${sessionMetadata.timestamp}
session_id: ${sessionMetadata.session_id}
conversation_id: ${sessionMetadata.conversation_id}
duration_minutes: ${sessionMetadata.duration_minutes}
executor: ${sessionMetadata.executor}
---

# Session: ${info.focus}

**Date:** ${date}
**Time:** ${time}
**Session ID:** ${sessionId}
**Conversation ID:** ${data.conversation_id}

---

## Session Overview

**Focus:** General development work
**Duration:** ${info.duration > 0 ? `${info.duration} minutes` : 'Unknown'}

---

## Tools Used

${info.toolsUsed.length > 0 ? info.toolsUsed.map((t: string) => `- ${t}`).join('\n') : '- None recorded'}

---

## Files Modified

${info.filesChanged.length > 0 ? info.filesChanged.map((f: string) => `- \`${f}\``).join('\n') : '- None recorded'}

**Total Files Changed:** ${info.filesChanged.length}

---

## Commands Executed

${info.commandsExecuted.length > 0 ? '```bash\n' + info.commandsExecuted.join('\n') + '\n```' : 'None recorded'}

---

## Notes

This session summary was automatically generated by the UOCS SessionEnd hook.

For detailed tool outputs, see: \`\${PAI_DIR}/History/raw-outputs/${timestamp.substring(0, 7)}/\`

---

**Session Outcome:** Completed
**Generated:** ${new Date().toISOString()}
`;
}

main();
