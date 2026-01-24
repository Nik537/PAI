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
