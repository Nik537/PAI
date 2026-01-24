# Claude Code v2.1.x PAI Update Plan

**Generated:** 2026-01-24
**Claude Code Version:** v2.1.19
**PAI Location:** `/Users/niknoavak/.claude`
**Analysis Source:** https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md

---

## Executive Summary

Claude Code v2.1.x introduces 10+ features that enhance PAI's capabilities. **No breaking changes detected** - your PAI scaffolding is fully compatible with current Claude Code. This plan outlines strategic updates to leverage new features for improved safety, isolation, and productivity.

**Key Wins:**
- ✅ Current implementation already compatible (no emergency fixes needed)
- 🔥 Wildcard Bash permissions for safer git automation
- 🚀 Fork context for better agent isolation
- 🎯 Explicit agent routing via skill frontmatter

---

## Update Categories

### 🔴 Priority 1: Immediate High-Value Updates

#### 1.1 Add Wildcard Bash Permissions to Git Workflows
**Feature:** Wildcard pattern matching for Bash permissions (NEW in 2.1.0)
**Why:** Safer git automation - pre-approve safe operations, block dangerous ones
**Effort:** Low (30 minutes)
**Risk:** Low

**Implementation:**

Update `.claude/Skills/CORE/SKILL.md` Git workflow section:

```markdown
## Git Workflow Permissions

**Allowed (pre-approved with wildcards):**
```yaml
allowed-tools:
  - Bash(git status*)
  - Bash(git diff*)
  - Bash(git log*)
  - Bash(git add *)
  - Bash(git commit -m*)
  - Bash(git commit -F*)
  - Bash(git push origin *)
  - Bash(git fetch*)
  - Bash(git pull*)
  - Bash(git branch*)
  - Bash(git checkout -b*)
```

**Blocked (require explicit approval):**
- `git push --force` (or `git push -f`)
- `git reset --hard`
- `git clean -f`
- `git push * main --force`
- Any destructive operations
```

**Files to modify:**
- `.claude/Skills/CORE/SKILL.md` (Git workflow section)
- Any skills that use git commands (search for skills with git operations)

**Testing:**
```bash
# Should be auto-approved
git add .
git commit -m "test"

# Should require approval
git push --force
git reset --hard
```

---

#### 1.2 Add Agent Field to Skill Frontmatter
**Feature:** Skills can specify `agent: <type>` for automatic routing (NEW in 2.1.0)
**Why:** Explicit routing reduces manual logic, ensures right capabilities
**Effort:** Low (15 minutes)
**Risk:** Very Low

**Implementation:**

Update skill files with agent declarations:

**Research/SKILL.md:**
```yaml
---
name: Research
description: Comprehensive research, analysis, and content extraction system...
agent: researcher
---
```

**TDD/SKILL.md:**
```yaml
---
name: TDD
description: Test-Driven Development methodology and workflows...
agent: engineer
---
```

**OSINT/SKILL.md:**
```yaml
---
name: OSINT
description: Open Source Intelligence gathering and analysis...
agent: researcher
---
```

**Council/SKILL.md:**
```yaml
---
name: Council
description: Multi-agent debate system for consensus building...
agent: general-purpose
---
```

**Ffuf/SKILL.md:**
```yaml
---
name: Ffuf
description: Expert guidance for ffuf web fuzzing during penetration testing...
agent: pentester
---
```

**Files to modify:**
```
.claude/Skills/Research/SKILL.md
.claude/Skills/TDD/SKILL.md
.claude/Skills/OSINT/SKILL.md
.claude/Skills/Council/SKILL.md
.claude/Skills/Ffuf/SKILL.md
.claude/Skills/FirstPrinciples/SKILL.md → agent: general-purpose
.claude/Skills/StoryExplanation/SKILL.md → agent: general-purpose
.claude/Skills/AlexHormoziPitch/SKILL.md → agent: general-purpose
.claude/Skills/CreateCLI/SKILL.md → agent: engineer
.claude/Skills/Createskill/SKILL.md → agent: architect
```

**Testing:**
```bash
# Verify frontmatter is valid
rg "^agent:" ~/.claude/Skills/*/SKILL.md
```

---

#### 1.3 Add Fork Context for Parallel Execution Skills
**Feature:** `context: fork` in frontmatter for isolated agent contexts (NEW in 2.1.0)
**Why:** Prevents cross-contamination in parallel agent execution
**Effort:** Low (10 minutes)
**Risk:** Low

**Implementation:**

Add `context: fork` to skills that spawn parallel agents:

**Council/SKILL.md:**
```yaml
---
name: Council
description: Multi-agent debate system for consensus building...
context: fork
agent: general-purpose
---
```

**Research/SKILL.md:**
```yaml
---
name: Research
description: Comprehensive research, analysis, and content extraction system...
context: fork
agent: researcher
---
```

**Files to modify:**
- `.claude/Skills/Council/SKILL.md`
- `.claude/Skills/Research/SKILL.md`
- Any other skills that use Task tool for parallel execution

**Why these specific skills:**
- **Council:** Spawns multiple debating agents - needs isolation
- **Research:** Launches parallel research agents - needs clean context
- **Not CORE:** Main skill should NOT fork (needs full context)

**Testing:**
```bash
# After update, test Council skill
# Verify agents don't see each other's context
```

---

### 🟡 Priority 2: Next Sprint Enhancements

#### 2.1 Create Setup Hook for One-Time Initialization
**Feature:** `Setup` hook triggered via `--init` flags (NEW in 2.1.10)
**Why:** Separates maintenance from session startup, faster sessions
**Effort:** Medium (1 hour)
**Risk:** Low

**Implementation:**

Create `.claude/hooks/setup.ts`:

```typescript
#!/usr/bin/env bun

/**
 * Setup Hook - One-time initialization and maintenance
 * Triggered via: claude --init, claude --init-only, claude --maintenance
 *
 * Use for:
 * - Environment validation
 * - Plugin updates
 * - Health checks
 * - Dependency verification
 *
 * Does NOT run on every session start (unlike SessionStart hooks)
 */

import { existsSync } from "fs";
import { join } from "path";

const PAI_DIR = process.env.HOME + "/.claude";

console.log("🔧 PAI Setup: Running maintenance checks...\n");

// Check 1: Verify required directories exist
const requiredDirs = [
  "Skills",
  "hooks",
  "History",
  "History/sessions",
  "History/learnings",
  "History/research",
  "scratchpad"
];

console.log("📁 Checking directory structure...");
for (const dir of requiredDirs) {
  const path = join(PAI_DIR, dir);
  if (!existsSync(path)) {
    console.log(`   ❌ Missing: ${dir}`);
  } else {
    console.log(`   ✅ ${dir}`);
  }
}

// Check 2: Verify critical skills exist
const criticalSkills = ["CORE", "Research", "TDD", "Council"];
console.log("\n🎯 Checking critical skills...");
for (const skill of criticalSkills) {
  const skillPath = join(PAI_DIR, "Skills", skill, "SKILL.md");
  if (!existsSync(skillPath)) {
    console.log(`   ❌ Missing: ${skill}`);
  } else {
    console.log(`   ✅ ${skill}`);
  }
}

// Check 3: Environment variables
console.log("\n🔑 Checking environment...");
const requiredEnvVars = ["HOME", "PAI_DIR"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.log(`   ⚠️  Missing: ${envVar}`);
  } else {
    console.log(`   ✅ ${envVar}`);
  }
}

console.log("\n✨ PAI Setup complete!\n");
```

Make executable:
```bash
chmod +x ~/.claude/hooks/setup.ts
```

**Usage:**
```bash
# Run setup/maintenance
claude --init

# Run setup without starting session
claude --init-only
```

---

#### 2.2 Use ${CLAUDE_SESSION_ID} in History System
**Feature:** Session ID substitution in skills (NEW in 2.1.0)
**Why:** Better session tracking and correlation across history
**Effort:** Medium (45 minutes)
**Risk:** Low

**Implementation:**

Update `.claude/hooks/capture-session-summary.ts` to include session ID:

```typescript
// Add to session metadata
const sessionMetadata = {
  session_id: "${CLAUDE_SESSION_ID}",
  timestamp: new Date().toISOString(),
  // ... rest of metadata
};
```

Update history file naming:
```bash
# Before: 2026-01-24_session-summary.md
# After:  2026-01-24_${CLAUDE_SESSION_ID}_session-summary.md
```

**Files to modify:**
- `.claude/hooks/capture-session-summary.ts`
- `.claude/hooks/stop-hook.ts`
- `.claude/hooks/capture-all-events.ts`

**Benefit:** Easier correlation when debugging or reviewing history across multiple sessions.

---

#### 2.3 Enhance PreToolUse Hooks with additionalContext
**Feature:** PreToolUse hooks can inject dynamic context (NEW in 2.1.0)
**Why:** Real-time, context-aware guidance without blocking
**Effort:** Medium (1 hour)
**Risk:** Low

**Implementation:**

Update `.claude/hooks/security-validator.ts`:

```typescript
export default function (event: PreToolUseEvent) {
  let additionalContext = "";

  // Destructive command detection
  if (event.tool === "Bash") {
    const cmd = event.input?.command || "";

    if (cmd.includes("rm -rf /")) {
      return {
        allow: false,
        reason: "Blocked: Attempted to delete root directory"
      };
    }

    if (cmd.match(/rm -rf \s*\*|rm -rf \.\./)) {
      additionalContext += "⚠️ DESTRUCTIVE COMMAND: Verify path before execution. ";
    }

    if (cmd.includes("git push --force") || cmd.includes("git push -f")) {
      additionalContext += "⚠️ Force push detected. Ensure you're not overwriting main branch. ";
    }

    if (cmd.includes("npm install") || cmd.includes("yarn install")) {
      additionalContext += "💡 Reminder: PAI prefers 'bun install' for JS/TS projects. ";
    }
  }

  // Git repository safety
  if (event.tool === "Bash" && event.input?.command?.includes("git push")) {
    additionalContext += "🔒 Security: Run 'git remote -v' to verify repository before pushing. ";
  }

  if (additionalContext) {
    return {
      allow: true,
      additionalContext: additionalContext.trim()
    };
  }

  return { allow: true };
}
```

**Result:** Claude sees dynamic warnings in context without hook blocking the action.

---

### 🟢 Priority 3: Optional Enhancements

#### 3.1 Configure Custom Keybindings
**Feature:** Customizable keyboard shortcuts (NEW in 2.1.18)
**Why:** Faster access to frequently-used PAI features
**Effort:** Low (user-driven)
**Risk:** None

**Recommendation for User:**

Run `/keybindings` and add:

```json
{
  "ctrl+p": "/plan",
  "ctrl+g": "git commit workflow",
  "ctrl+r": "/research",
  "ctrl+shift+c": "/council",
  "ctrl+t": "/tdd"
}
```

**Note:** This is user-configured via CLI, not a code change.

---

#### 3.2 Add once: true to One-Time Hooks
**Feature:** Hooks with `once: true` run only once per session (NEW in 2.1.0)
**Why:** Prevents expensive initialization from repeating
**Effort:** Low (10 minutes)
**Risk:** Very Low

**Implementation:**

Update `.claude/hooks/initialize-session.ts`:

```typescript
export const config = {
  once: true,  // Only run on first tool call, not every tool call
  event: "SessionStart"
};

export default function (event: SessionStartEvent) {
  console.log("🚀 PAI Session initialized (one-time)");
  // Expensive initialization logic here
}
```

**Files to consider:**
- `initialize-session.ts` - Already runs once, make explicit
- `load-core-context.ts` - Should only load once per session

**Testing:**
Verify hook runs only once even with multiple tool calls in same session.

---

#### 3.3 MCP Dynamic Tool Discovery (Auto-Enabled)
**Feature:** MCPSearch for dynamic tool discovery (NEW in 2.1.x)
**Why:** Reduces context pollution from large MCP tool lists
**Effort:** None (automatic)
**Risk:** None

**Status:** This is **automatic** when MCP tool descriptions exceed 10% of context window.

**Optional Configuration:**

If you want to adjust the threshold, add to settings:

```json
{
  "mcpAutoEnableThreshold": "auto:15"  // 15% instead of 10%
}
```

**Recommendation:** Leave at default unless experiencing MCP context issues.

---

## Implementation Roadmap

### Week 1: Core Safety & Routing
- [ ] 1.1: Add wildcard Bash permissions (30 min)
- [ ] 1.2: Add agent field to skills (15 min)
- [ ] 1.3: Add fork context to parallel skills (10 min)
- [ ] **Test:** Verify git workflows, skill routing, parallel execution

### Week 2: Enhanced Tracking
- [ ] 2.1: Create setup hook (1 hour)
- [ ] 2.2: Add session ID to history (45 min)
- [ ] **Test:** Run `claude --init`, verify session tracking

### Week 3: Dynamic Guidance
- [ ] 2.3: Enhance security-validator with additionalContext (1 hour)
- [ ] 3.2: Add once: true to one-time hooks (10 min)
- [ ] **Test:** Verify dynamic warnings appear, hooks run once

### Week 4: Polish & User Config
- [ ] 3.1: Document keybindings for user (user-driven)
- [ ] **Review:** Test all updates end-to-end
- [ ] **Document:** Update CORE/SKILL.md with new capabilities

---

## Testing Checklist

After implementing updates:

### Wildcard Bash Permissions
- [ ] Git add/commit/push auto-approved
- [ ] Force push requires approval
- [ ] Reset --hard requires approval

### Agent Field Routing
- [ ] Research skill uses researcher agent
- [ ] TDD skill uses engineer agent
- [ ] Skills route to correct agent type

### Fork Context
- [ ] Council agents don't see each other's context
- [ ] Research parallel agents isolated
- [ ] No cross-contamination in parallel execution

### Setup Hook
- [ ] `claude --init` runs maintenance checks
- [ ] Doesn't run on every session start
- [ ] Validates environment correctly

### Session ID Tracking
- [ ] History files include session ID
- [ ] Can correlate events across tools
- [ ] Session ID present in logs

### Dynamic Context Injection
- [ ] Destructive commands show warnings
- [ ] Git push shows safety reminder
- [ ] Warnings don't block execution

### Once-Only Hooks
- [ ] Initialize-session runs only once
- [ ] Subsequent tool calls don't re-trigger
- [ ] Session metadata correct

---

## Rollback Plan

If any update causes issues:

1. **Immediate rollback:**
   ```bash
   cd ~/.claude
   git log --oneline  # Find commit before update
   git checkout <commit-hash> -- <affected-file>
   ```

2. **Restore from backup:**
   ```bash
   # Backups should be in ~/.claude/pai_backups/
   cp ~/.claude/pai_backups/hooks_20260124_HHMMSS/* ~/.claude/hooks/
   ```

3. **Disable specific feature:**
   - Remove `context: fork` from skill frontmatter
   - Remove `agent:` field from skill frontmatter
   - Comment out wildcard patterns in allowed-tools

---

## Decision Log

| Update | Decision | Rationale |
|--------|----------|-----------|
| Wildcard Bash permissions | **Implement** | High safety value, low risk |
| Agent field declarations | **Implement** | Explicit is better than implicit |
| Fork context | **Implement** | Better isolation for parallel agents |
| Setup hook | **Implement** | Cleaner separation of concerns |
| Session ID tracking | **Implement** | Better debugging/history correlation |
| additionalContext in hooks | **Implement** | Non-blocking dynamic guidance |
| once: true hooks | **Implement** | Minor performance improvement |
| Custom keybindings | **User-driven** | Personal preference, not code |
| MCP threshold tuning | **Skip** | Auto-enabled, working well |
| Native task system | **Skip** | PAI response format more comprehensive |

---

## Notes & Considerations

### Why Skip Native Task System?

Claude Code v2.1.16 introduced a native task system with dependency tracking (`blocks`/`blockedBy`). **Decision: Keep PAI's custom approach.**

**Reasoning:**
- PAI's MANDATORY RESPONSE FORMAT includes more than task tracking
- SCOPING, CAPTURE, STORY EXPLANATION provide unique value
- Native system is complementary, not a replacement
- Migration would break constitutional compliance
- Custom format drives voice output, session history, accessibility

**Recommendation:** Use native task system alongside PAI format when beneficial, but don't migrate away from response format.

### Argument Syntax Compatibility

Claude Code changed argument syntax from `$ARGUMENTS.0` to `$ARGUMENTS[0]`.

**PAI Status:** ✅ **Already compatible**

Your custom commands use `$ARGUMENTS` without indexing, so no changes needed.

---

## References

- **Changelog:** https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- **Keybindings Docs:** https://code.claude.com/docs/en/keybindings
- **Getting Started:** https://docs.anthropic.com/en/docs/claude-code/getting-started

---

**Plan Status:** Ready for implementation
**Estimated Total Effort:** ~5 hours (spread across 4 weeks)
**Risk Level:** Low (all updates are additive, no breaking changes)
**Priority Focus:** Week 1 (safety & routing) provides immediate value
