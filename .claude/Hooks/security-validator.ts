#!/usr/bin/env bun

/**
 * security-validator.ts - PreToolUse Security Validation Hook
 *
 * Fast pattern-based security validation for Bash commands.
 * Blocks commands matching known attack patterns before execution.
 *
 * Design Principles:
 * - Fast path: Most commands allowed with minimal processing
 * - Pre-compiled regex patterns at module load
 * - Only log/block on high-confidence attack detection
 * - Fail open on errors (don't break legitimate work)
 *
 * CUSTOMIZATION REQUIRED:
 * This template includes basic examples. Add your own security patterns
 * based on your threat model and environment.
 */

// ============================================================================
// ATTACK PATTERNS - CUSTOMIZE THESE FOR YOUR ENVIRONMENT
// ============================================================================

// Example: Reverse Shell Patterns (BLOCK - rarely legitimate)
const REVERSE_SHELL_PATTERNS: RegExp[] = [
  /\/dev\/(tcp|udp)\/[0-9]/,                    // Bash TCP/UDP device
  /bash\s+-i\s+>&?\s*\/dev\//,                  // Interactive bash redirect
  // Add your own reverse shell patterns here
];

// Example: Instruction Override (BLOCK - prompt injection)
const INSTRUCTION_OVERRIDE_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /disregard\s+(all\s+)?(prior|previous)\s+(instructions?|rules?)/i,
  // Add your own prompt injection patterns here
];

// Example: Catastrophic Deletion Patterns (BLOCK - filesystem destruction)
const CATASTROPHIC_DELETION_PATTERNS: RegExp[] = [
  // Root directory deletion - ALWAYS block
  /\brm\s+(-[rfivd]+\s+)*\/\s*$/,                   // rm -rf /
  /\brm\s+(-[rfivd]+\s+)*\/\*\s*$/,                 // rm -rf /*

  // Trailing tilde bypass
  /\s+~\/?(\s*$|\s+)/,                              // Space then ~/ at end
  /\brm\s+(-[rfivd]+\s+)*\S+\s+~\/?/,               // rm something ~/

  // Relative path recursive deletion
  /\brm\s+(-[rfivd]+\s+)*\.\/\s*$/,                 // rm -rf ./
  /\brm\s+(-[rfivd]+\s+)*\.\.\/\s*$/,               // rm -rf ../

  // Add your own dangerous deletion patterns here
];

// Example: Dangerous File Operations (BLOCK - data destruction)
const DANGEROUS_FILE_OPS_PATTERNS: RegExp[] = [
  /\bchmod\s+(-R\s+)?0{3,}/,                        // chmod 000
  // Add your own dangerous file operation patterns here
];

// OPTIONAL: Operations that require confirmation instead of blocking
const DANGEROUS_GIT_PATTERNS: RegExp[] = [
  /\bgit\s+push\s+.*(-f\b|--force)/i,               // git push --force
  /\bgit\s+reset\s+--hard/i,                        // git reset --hard
  // Add your own git safety patterns here
];

// ============================================================================
// WARNING PATTERNS - additionalContext (allow with warnings)
// ============================================================================

// Destructive commands that should WARN (not block)
const DESTRUCTIVE_WARNING_PATTERNS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /\brm\s+(-[rfivd]+\s+)*(\*|\.\.)/,
    message: "⚠️ DESTRUCTIVE COMMAND: Verify target path before execution."
  },
  {
    pattern: /\brm\s+(-[rfivd]+\s+)+/,
    message: "⚠️ Recursive delete detected: Double-check the target path."
  },
];

// Force push warnings
const FORCE_PUSH_WARNING_PATTERNS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /\bgit\s+push\s+.*(-f\b|--force)/i,
    message: "⚠️ Force push detected: Ensure you're not overwriting shared branches."
  },
  {
    pattern: /\bgit\s+push\s+--force-with-lease/i,
    message: "💡 force-with-lease is safer than --force, but still verify the target branch."
  },
];

// Package manager preferences
const PACKAGE_MANAGER_PATTERNS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /\bnpm\s+(install|i|add|ci)\b/,
    message: "💡 Reminder: PAI prefers 'bun install' for JS/TS projects."
  },
  {
    pattern: /\byarn\s+(install|add)\b/,
    message: "💡 Reminder: PAI prefers 'bun install' for JS/TS projects."
  },
  {
    pattern: /\bpnpm\s+(install|i|add)\b/,
    message: "💡 Reminder: PAI prefers 'bun install' for JS/TS projects."
  },
  {
    pattern: /\bpip\s+install\b/,
    message: "💡 Reminder: PAI prefers 'uv pip install' for Python projects."
  },
];

// Git repository safety reminders
const GIT_SAFETY_PATTERNS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /\bgit\s+push\b/,
    message: "🔒 Security: Run 'git remote -v' to verify repository before pushing."
  },
  {
    pattern: /\bgit\s+clone\b/,
    message: "🔒 Verify the repository URL is from a trusted source."
  },
];

// All warning pattern groups
const ALL_WARNING_PATTERN_GROUPS = [
  DESTRUCTIVE_WARNING_PATTERNS,
  FORCE_PUSH_WARNING_PATTERNS,
  PACKAGE_MANAGER_PATTERNS,
  GIT_SAFETY_PATTERNS,
];

// Combined patterns for fast iteration
const ALL_BLOCK_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  { category: 'reverse_shell', patterns: REVERSE_SHELL_PATTERNS },
  { category: 'instruction_override', patterns: INSTRUCTION_OVERRIDE_PATTERNS },
  { category: 'catastrophic_deletion', patterns: CATASTROPHIC_DELETION_PATTERNS },
  { category: 'dangerous_file_ops', patterns: DANGEROUS_FILE_OPS_PATTERNS },
];

const CONFIRM_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  { category: 'dangerous_git', patterns: DANGEROUS_GIT_PATTERNS },
];

// ============================================================================
// TYPES
// ============================================================================

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown> | string;
}

interface HookOutput {
  permissionDecision: 'allow' | 'deny';
  additionalContext?: string;
  feedback?: string;
}

// ============================================================================
// DETECTION LOGIC
// ============================================================================

interface DetectionResult {
  blocked: boolean;
  requiresConfirmation?: boolean;
  category?: string;
  pattern?: string;
}

interface WarningResult {
  hasWarnings: boolean;
  messages: string[];
}

/**
 * Collect all applicable warnings for a command
 * Returns warnings as additionalContext (allows command but provides guidance)
 */
function collectWarnings(content: string): WarningResult {
  const messages: string[] = [];
  const seenMessages = new Set<string>();

  for (const patternGroup of ALL_WARNING_PATTERN_GROUPS) {
    for (const { pattern, message } of patternGroup) {
      if (pattern.test(content) && !seenMessages.has(message)) {
        messages.push(message);
        seenMessages.add(message);
      }
    }
  }

  return {
    hasWarnings: messages.length > 0,
    messages,
  };
}

function detectAttack(content: string): DetectionResult {
  // First check for hard blocks
  for (const { category, patterns } of ALL_BLOCK_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return { blocked: true, category, pattern: pattern.source };
      }
    }
  }

  // Then check for confirmation-required patterns
  for (const { category, patterns } of CONFIRM_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return { blocked: false, requiresConfirmation: true, category, pattern: pattern.source };
      }
    }
  }

  return { blocked: false };
}

// ============================================================================
// ASYNC LOGGING (fire-and-forget on block only)
// ============================================================================

function logSecurityEvent(event: Record<string, unknown>): void {
  // Fire-and-forget - don't await, don't block
  const logPath = `${process.env.PAI_DIR || '~/.claude'}/history/security/security-events.jsonl`;
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + '\n';

  Bun.write(logPath, entry, { createPath: true }).catch(() => {
    // Silently fail - logging should never break the hook
  });
}

// ============================================================================
// MAIN HOOK LOGIC
// ============================================================================

async function main(): Promise<void> {
  let input: HookInput;

  try {
    // Fast stdin read with short timeout
    const text = await Promise.race([
      Bun.stdin.text(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
    ]);

    if (!text.trim()) {
      console.log(JSON.stringify({ permissionDecision: 'allow' }));
      return;
    }

    input = JSON.parse(text);
  } catch {
    // Parse error or timeout - fail open
    console.log(JSON.stringify({ permissionDecision: 'allow' }));
    return;
  }

  // Only validate Bash commands
  if (input.tool_name !== 'Bash') {
    console.log(JSON.stringify({ permissionDecision: 'allow' }));
    return;
  }

  // Extract command string
  const command = typeof input.tool_input === 'string'
    ? input.tool_input
    : (input.tool_input?.command as string) || '';

  if (!command) {
    console.log(JSON.stringify({ permissionDecision: 'allow' }));
    return;
  }

  // Check for hard blocks first (truly dangerous operations)
  const attackResult = detectAttack(command);

  if (attackResult.blocked) {
    // Log and block - these are truly dangerous operations
    logSecurityEvent({
      type: 'attack_blocked',
      category: attackResult.category,
      pattern: attackResult.pattern,
      command: command.slice(0, 200), // Truncate for log
      session_id: input.session_id,
    });

    const output: HookOutput = {
      permissionDecision: 'deny',
      additionalContext: `🚨 SECURITY: Blocked ${attackResult.category} pattern`,
      feedback: `This command matched a security pattern (${attackResult.category}). If this is legitimate, please rephrase the command.`,
    };

    console.log(JSON.stringify(output));
    process.exit(2); // Exit 2 = blocking error
  }

  // Check for confirmation-required patterns (dangerous git operations)
  if (attackResult.requiresConfirmation) {
    // Log warning and require confirmation
    logSecurityEvent({
      type: 'confirmation_required',
      category: attackResult.category,
      pattern: attackResult.pattern,
      command: command.slice(0, 200),
      session_id: input.session_id,
    });

    const output: HookOutput = {
      permissionDecision: 'deny',
      additionalContext: `⚠️ DANGEROUS: ${attackResult.category} operation requires confirmation`,
      feedback: `This is a dangerous operation (${command.slice(0, 50)}...). This can cause data loss. If you're sure, explicitly confirm this command.`,
    };

    console.log(JSON.stringify(output));
    process.exit(2); // Exit 2 = requires user confirmation
  }

  // Collect warnings for additionalContext (allow with guidance)
  const warnings = collectWarnings(command);

  if (warnings.hasWarnings) {
    // Allow the command but provide helpful context
    const output: HookOutput = {
      permissionDecision: 'allow',
      additionalContext: warnings.messages.join(' '),
    };
    console.log(JSON.stringify(output));
    return;
  }

  // Allow - no warnings, immediate exit
  console.log(JSON.stringify({ permissionDecision: 'allow' }));
}

// ============================================================================
// RUN
// ============================================================================

main().catch(() => {
  // On any error, fail open
  console.log(JSON.stringify({ permissionDecision: 'allow' }));
});
