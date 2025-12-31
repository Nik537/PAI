#!/usr/bin/env bun
/**
 * PAI Agent Spawner CLI
 *
 * Spawns custom PAI agents by reading their configuration from ~/.claude/Agents/
 * and delegating to the closest matching built-in Task subagent_type.
 *
 * Usage:
 *   spawn-agent list                    # List available agents
 *   spawn-agent info <agent>            # Show agent details
 *   spawn-agent prompt <agent> <task>   # Generate prompt for Task tool
 *
 * @author PAI System
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const AGENTS_DIR = join(homedir(), ".claude", "Agents");

// Mapping of custom agents to closest built-in Task subagent_types
const AGENT_TYPE_MAP: Record<string, string> = {
  debugger: "engineer",      // Debugging is engineering work
  architect: "architect",    // Direct match
  engineer: "engineer",      // Direct match
  designer: "designer",      // Direct match
  pentester: "pentester",    // Direct match
  researcher: "researcher",  // Direct match
  "claude-researcher": "claude-researcher",
  "perplexity-researcher": "perplexity-researcher",
  "gemini-researcher": "gemini-researcher",
};

interface AgentConfig {
  name: string;
  description: string;
  model?: string;
  color?: string;
  voiceId?: string;
  permissions?: { allow: string[] };
  body: string;
}

function parseFrontmatter(content: string): AgentConfig {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { name: "unknown", description: "", body: content };
  }

  const [, yaml, body] = frontmatterMatch;
  const config: Partial<AgentConfig> = { body: body.trim() };

  // Simple YAML parsing for our needs
  const lines = yaml.split("\n");
  let currentKey = "";
  let inArray = false;
  let arrayItems: string[] = [];

  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      if (inArray && currentKey) {
        (config as any)[currentKey] = { allow: arrayItems };
        arrayItems = [];
        inArray = false;
      }

      const [, key, value] = keyMatch;
      currentKey = key;

      if (value) {
        (config as any)[key] = value.trim();
      }
    } else if (line.match(/^\s+-\s+"(.+)"$/)) {
      inArray = true;
      const itemMatch = line.match(/^\s+-\s+"(.+)"$/);
      if (itemMatch) {
        arrayItems.push(itemMatch[1]);
      }
    }
  }

  if (inArray && currentKey) {
    (config as any)[currentKey] = { allow: arrayItems };
  }

  return config as AgentConfig;
}

async function listAgents(): Promise<void> {
  const files = await readdir(AGENTS_DIR);
  const agents = files.filter(f => f.endsWith(".md"));

  console.log("Available PAI Agents:\n");
  console.log("| Agent | Built-in Type | Model | Description |");
  console.log("|-------|---------------|-------|-------------|");

  for (const file of agents) {
    const content = await readFile(join(AGENTS_DIR, file), "utf-8");
    const config = parseFrontmatter(content);
    const name = config.name || file.replace(".md", "");
    const builtIn = AGENT_TYPE_MAP[name.toLowerCase()] || "general-purpose";
    const model = config.model || "sonnet";
    const desc = config.description?.slice(0, 50) + "..." || "No description";

    console.log(`| ${name} | ${builtIn} | ${model} | ${desc} |`);
  }

  console.log("\nUsage: spawn-agent prompt <agent-name> \"<your task>\"");
}

async function showAgentInfo(agentName: string): Promise<void> {
  const filePath = join(AGENTS_DIR, `${agentName}.md`);

  try {
    const content = await readFile(filePath, "utf-8");
    const config = parseFrontmatter(content);

    console.log(`\n=== ${config.name || agentName} Agent ===\n`);
    console.log(`Description: ${config.description || "N/A"}`);
    console.log(`Model: ${config.model || "sonnet"}`);
    console.log(`Color: ${config.color || "N/A"}`);
    console.log(`Voice: ${config.voiceId || "N/A"}`);
    console.log(`Built-in Type: ${AGENT_TYPE_MAP[agentName.toLowerCase()] || "general-purpose"}`);
    console.log(`\nPermissions:`);
    if (config.permissions?.allow) {
      config.permissions.allow.forEach(p => console.log(`  - ${p}`));
    }
    console.log(`\n--- Agent Instructions (first 500 chars) ---`);
    console.log(config.body.slice(0, 500) + "...");
  } catch {
    console.error(`Agent not found: ${agentName}`);
    console.error(`Available agents: ${(await readdir(AGENTS_DIR)).filter(f => f.endsWith(".md")).map(f => f.replace(".md", "")).join(", ")}`);
    process.exit(1);
  }
}

async function generatePrompt(agentName: string, task: string): Promise<void> {
  const filePath = join(AGENTS_DIR, `${agentName}.md`);

  try {
    const content = await readFile(filePath, "utf-8");
    const config = parseFrontmatter(content);
    const builtInType = AGENT_TYPE_MAP[agentName.toLowerCase()] || "general-purpose";
    const model = config.model || "sonnet";

    // Extract key sections from agent body for context injection
    const sections = config.body.split(/^##\s+/m).slice(1, 4); // First 3 sections
    const contextSnippet = sections.map(s => s.split("\n").slice(0, 10).join("\n")).join("\n\n");

    console.log(`\n=== Task Tool Call for ${config.name || agentName} Agent ===\n`);
    console.log(`subagent_type: "${builtInType}"`);
    console.log(`model: "${model}"`);
    console.log(`\n--- Prompt ---\n`);

    const prompt = `You are the ${config.name || agentName} agent.

${config.description || ""}

## Key Instructions
${contextSnippet.slice(0, 1000)}

## YOUR TASK
${task}

Follow the systematic approach defined in your agent configuration. Report results clearly.`;

    console.log(prompt);

    console.log(`\n--- Copy-Paste for Task Tool ---\n`);
    console.log(`Task({`);
    console.log(`  description: "${agentName}: ${task.slice(0, 30)}...",`);
    console.log(`  subagent_type: "${builtInType}",`);
    console.log(`  model: "${model}",`);
    console.log(`  prompt: \`${prompt.replace(/`/g, "\\`")}\``);
    console.log(`})`);

  } catch {
    console.error(`Agent not found: ${agentName}`);
    process.exit(1);
  }
}

// CLI Entry Point
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "list":
    await listAgents();
    break;
  case "info":
    if (!args[1]) {
      console.error("Usage: spawn-agent info <agent-name>");
      process.exit(1);
    }
    await showAgentInfo(args[1]);
    break;
  case "prompt":
    if (!args[1] || !args[2]) {
      console.error("Usage: spawn-agent prompt <agent-name> \"<task>\"");
      process.exit(1);
    }
    await generatePrompt(args[1], args.slice(2).join(" "));
    break;
  default:
    console.log(`PAI Agent Spawner

Usage:
  spawn-agent list                     List all available agents
  spawn-agent info <agent>             Show agent configuration
  spawn-agent prompt <agent> <task>    Generate Task tool prompt

Examples:
  spawn-agent list
  spawn-agent info Debugger
  spawn-agent prompt Debugger "Fix the null pointer exception in auth.ts"
`);
}
