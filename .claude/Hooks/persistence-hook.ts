#!/usr/bin/env bun
/**
 * persistence-hook.ts
 *
 * Ralph Wiggum-style persistence for PAI. Runs on Stop event.
 * Checks if task is complete and re-injects prompt to continue if not.
 *
 * Features:
 * - Tracks iteration count per session
 * - Detects TASK_COMPLETE signal
 * - Max iterations safety limit (default: 50)
 * - Re-injects continuation prompt if not done
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PAI_DIR } from './lib/pai-paths';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  stop_hook_output?: string;
}

interface SessionState {
  session_id: string;
  iteration_count: number;
  started_at: string;
  last_activity: string;
  task_complete: boolean;
}

const MAX_ITERATIONS = 50;
const STATE_DIR = join(PAI_DIR, 'state');
const STATE_FILE = join(STATE_DIR, 'persistence-state.json');

/**
 * Read or create session state
 */
function getSessionState(sessionId: string): SessionState {
  try {
    if (existsSync(STATE_FILE)) {
      const data = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
      if (data.session_id === sessionId) {
        return data;
      }
    }
  } catch {
    // Ignore read errors
  }

  // New session
  return {
    session_id: sessionId,
    iteration_count: 0,
    started_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    task_complete: false,
  };
}

/**
 * Save session state
 */
function saveSessionState(state: SessionState): void {
  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('[persistence-hook] Failed to save state:', error);
  }
}

/**
 * Check if the last response indicates task completion
 */
function isTaskComplete(transcriptPath: string): boolean {
  try {
    if (!existsSync(transcriptPath)) {
      return false;
    }

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Check last few entries for completion signals
    const recentLines = lines.slice(-10);

    for (const line of recentLines) {
      try {
        const entry = JSON.parse(line);
        const text = entry.message?.content || '';

        // Check for explicit completion signals
        if (typeof text === 'string') {
          if (text.includes('TASK_COMPLETE:')) {
            return true;
          }
          // Check for variations
          if (
            text.includes('COMPLETED:') &&
            (text.includes('successfully') ||
              text.includes('finished') ||
              text.includes('done'))
          ) {
            return true;
          }
        }

        // Check content array format
        if (Array.isArray(entry.message?.content)) {
          for (const block of entry.message.content) {
            if (block.type === 'text' && block.text) {
              if (block.text.includes('TASK_COMPLETE:')) {
                return true;
              }
            }
          }
        }
      } catch {
        // Skip non-JSON lines
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if Claude is stuck (same error multiple times)
 */
function isStuck(transcriptPath: string): boolean {
  try {
    if (!existsSync(transcriptPath)) {
      return false;
    }

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');
    const recentLines = lines.slice(-20);

    // Look for repeated error patterns
    const errors: string[] = [];
    for (const line of recentLines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'tool_result' && entry.is_error) {
          const errorText = JSON.stringify(entry.content).slice(0, 100);
          errors.push(errorText);
        }
      } catch {
        // Skip
      }
    }

    // Check for 3+ identical errors
    const errorCounts = new Map<string, number>();
    for (const error of errors) {
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    }

    for (const count of errorCounts.values()) {
      if (count >= 3) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Generate continuation prompt
 */
function generateContinuationPrompt(
  iterationCount: number,
  maxIterations: number
): string {
  const remaining = maxIterations - iterationCount;

  return `<system-reminder>
PERSISTENCE MODE ACTIVE (Iteration ${iterationCount}/${maxIterations})

The task is NOT complete. Continue working.

Remaining iterations: ${remaining}

Checklist before stopping:
- [ ] All SCOPING completion criteria met?
- [ ] Tests passing?
- [ ] Build succeeds?
- [ ] Verification checklist complete?

If ANY is unchecked → Keep working.

When truly done, include: TASK_COMPLETE: [summary]
</system-reminder>`;
}

async function readStdinWithTimeout(timeout: number = 3000): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeout);

    process.stdin.on('data', (chunk) => {
      data += chunk.toString();
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function main() {
  try {
    const input = await readStdinWithTimeout();
    if (!input) {
      process.exit(0);
    }

    const data: HookInput = JSON.parse(input);
    const sessionId = data.session_id;
    const transcriptPath = data.transcript_path;

    // Get current state
    const state = getSessionState(sessionId);
    state.iteration_count++;
    state.last_activity = new Date().toISOString();

    // Check if task is complete
    if (isTaskComplete(transcriptPath)) {
      state.task_complete = true;
      saveSessionState(state);
      console.error(
        `[persistence-hook] Task complete after ${state.iteration_count} iterations`
      );
      process.exit(0);
    }

    // Check if stuck
    if (isStuck(transcriptPath)) {
      console.error(
        `[persistence-hook] Detected stuck state - allowing stop for user intervention`
      );
      saveSessionState(state);
      process.exit(0);
    }

    // Check max iterations
    if (state.iteration_count >= MAX_ITERATIONS) {
      console.error(
        `[persistence-hook] Max iterations (${MAX_ITERATIONS}) reached - safety stop`
      );
      console.log(`<system-reminder>
MAX ITERATIONS REACHED (${MAX_ITERATIONS})

Safety limit hit. Task may be incomplete.
Review the work done and decide whether to:
1. Continue with: "keep going"
2. Accept current state
3. Take a different approach

This limit prevents infinite loops.
</system-reminder>`);
      saveSessionState(state);
      process.exit(0);
    }

    // Task not complete, under limit - inject continuation
    saveSessionState(state);
    const continuation = generateContinuationPrompt(
      state.iteration_count,
      MAX_ITERATIONS
    );
    console.log(continuation);
    console.error(
      `[persistence-hook] Iteration ${state.iteration_count}/${MAX_ITERATIONS} - continuing`
    );

    process.exit(0);
  } catch (error) {
    console.error('[persistence-hook] Error:', error);
    process.exit(0); // Fail silently
  }
}

main();
