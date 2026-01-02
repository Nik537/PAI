#!/usr/bin/env bun
/**
 * analyze-task-scope.ts
 *
 * Analyzes user prompts for complexity and injects scoping guidance
 * as a <system-reminder> to trigger adaptive clarification behavior.
 *
 * Complexity Scoring (0-10):
 * - Simple (0-3): 0-2 clarifying questions
 * - Medium (4-6): 2-4 clarifying questions
 * - Complex (7-10): 4-6 clarifying questions + risk warnings
 *
 * Runs on UserPromptSubmit event.
 */

import { PAI_DIR } from './lib/pai-paths';

interface HookInput {
  session_id: string;
  prompt: string;
  transcript_path: string;
  hook_event_name: string;
}

interface ComplexityAnalysis {
  score: number; // 0-10
  level: 'Simple' | 'Medium' | 'Complex';
  indicators: string[];
  suggestedQuestions: number;
}

/**
 * Analyze prompt complexity using heuristics
 */
function analyzeComplexity(prompt: string): ComplexityAnalysis {
  let score = 0;
  const indicators: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  const words = prompt.split(/\s+/).length;

  // Length/Scope indicators
  if (words > 50) {
    score += 2;
    indicators.push('lengthy request');
  }
  if (words > 100) {
    score += 1;
    indicators.push('very detailed');
  }

  // Multi-part detection
  const hasNumberedList = /\d+\.\s/.test(prompt);
  const hasCommaSeparatedTasks = /,\s*(and|then|also)\s/i.test(prompt);
  const hasBulletPoints = /^[-•*]\s/m.test(prompt);
  if (hasNumberedList || hasCommaSeparatedTasks || hasBulletPoints) {
    score += 2;
    indicators.push('multi-part request');
  }

  // Ambiguity indicators
  const vaguePatterns = [
    { pattern: /\bsomething\b/i, label: 'something' },
    { pattern: /\bsomehow\b/i, label: 'somehow' },
    { pattern: /\bmaybe\b/i, label: 'maybe' },
    { pattern: /\bperhaps\b/i, label: 'perhaps' },
    { pattern: /\bkind of\b/i, label: 'kind of' },
    { pattern: /\bsort of\b/i, label: 'sort of' },
    { pattern: /\bfix it\b/i, label: 'fix it' },
    { pattern: /\bmake it work\b/i, label: 'make it work' },
    { pattern: /\bimprove\b/i, label: 'improve' },
    { pattern: /\bbetter\b/i, label: 'better' },
    { pattern: /\bclean up\b/i, label: 'clean up' },
  ];

  for (const { pattern, label } of vaguePatterns) {
    if (pattern.test(prompt)) {
      score += 1;
      indicators.push(`ambiguous: "${label}"`);
      break; // Only count once
    }
  }

  // Missing specifics (mentions files/code but no paths)
  const mentionsCode =
    /\b(file|code|function|component|module|class)\b/i.test(prompt);
  const hasPath = /[\/\\]|\.ts|\.js|\.tsx|\.jsx|\.md|\.json/i.test(prompt);
  if (mentionsCode && !hasPath) {
    score += 1;
    indicators.push('missing file/location');
  }

  // Domain complexity indicators
  const complexDomains = [
    { pattern: /\barchitect/i, label: 'architecture' },
    { pattern: /\bsecurity\b/i, label: 'security' },
    { pattern: /\bauth/i, label: 'authentication' },
    { pattern: /\bdatabase\b/i, label: 'database' },
    { pattern: /\bmigrat/i, label: 'migration' },
    { pattern: /\bdeploy/i, label: 'deployment' },
    { pattern: /\brefactor/i, label: 'refactoring' },
    { pattern: /\bredesign/i, label: 'redesign' },
    { pattern: /\brewrite\b/i, label: 'rewrite' },
    { pattern: /\bperformance\b/i, label: 'performance' },
    { pattern: /\bscal(e|ing|able)/i, label: 'scaling' },
  ];

  for (const { pattern, label } of complexDomains) {
    if (pattern.test(prompt)) {
      score += 2;
      indicators.push(`domain: ${label}`);
      break;
    }
  }

  // Risk indicators
  const riskPatterns = [
    { pattern: /\bdelete\b/i, label: 'delete' },
    { pattern: /\bremove all\b/i, label: 'remove all' },
    { pattern: /\bdrop\b/i, label: 'drop' },
    { pattern: /\bproduction\b/i, label: 'production' },
    { pattern: /\bprod\b/i, label: 'prod' },
    { pattern: /\bpublish\b/i, label: 'publish' },
    { pattern: /\bpayment/i, label: 'payment' },
    { pattern: /\bfinancial/i, label: 'financial' },
    { pattern: /\birreversible/i, label: 'irreversible' },
  ];

  for (const { pattern, label } of riskPatterns) {
    if (pattern.test(prompt)) {
      score += 2;
      indicators.push(`risk: ${label}`);
      break;
    }
  }

  // System-wide change indicators
  const systemWidePatterns = [
    { pattern: /\ball files\b/i, label: 'all files' },
    { pattern: /\bentire\b/i, label: 'entire' },
    { pattern: /\bwhole project\b/i, label: 'whole project' },
    { pattern: /\beverywhere\b/i, label: 'everywhere' },
    { pattern: /\bacross the\b/i, label: 'across' },
    { pattern: /\bthroughout\b/i, label: 'throughout' },
    { pattern: /\bglobal/i, label: 'global' },
  ];

  for (const { pattern, label } of systemWidePatterns) {
    if (pattern.test(prompt)) {
      score += 2;
      indicators.push(`scope: ${label}`);
      break;
    }
  }

  // Cap score at 10
  score = Math.min(score, 10);

  // Determine level and suggested questions
  let level: 'Simple' | 'Medium' | 'Complex';
  let suggestedQuestions: number;

  if (score <= 3) {
    level = 'Simple';
    suggestedQuestions = 2;
  } else if (score <= 6) {
    level = 'Medium';
    suggestedQuestions = 4;
  } else {
    level = 'Complex';
    suggestedQuestions = 6;
  }

  return { score, level, indicators, suggestedQuestions };
}

/**
 * Generate scoping guidance based on analysis
 */
function generateScopingGuidance(
  analysis: ComplexityAnalysis,
  prompt: string
): string {
  const { level, indicators, suggestedQuestions, score } = analysis;
  const words = prompt.split(/\s+/).length;

  // Skip for very short/simple prompts
  if (words < 8 && level === 'Simple') {
    return ''; // No reminder needed for trivial requests
  }

  // Skip for Simple tasks - let CORE handle with minimal guidance
  if (level === 'Simple') {
    return '';
  }

  const indicatorList =
    indicators.length > 0
      ? `\nDetected: ${indicators.slice(0, 4).join(', ')}`
      : '';

  const depthGuidance =
    level === 'Medium'
      ? 'Moderate (2-4 questions)'
      : 'Thorough (4-6 questions)';

  const riskWarning =
    level === 'Complex'
      ? `
COMPLEX TASK DETECTED:
- Confirm understanding before implementation
- Consider breaking into phases
- Define rollback plan for risky operations
- Ensure completion criteria are measurable`
      : '';

  return `<system-reminder>
TASK SCOPING (Auto-analyzed)

Complexity: ${level} (${score}/10)${indicatorList}

Before proceeding:
1. Use SCOPING section in response format
2. Ask ${depthGuidance.toLowerCase()} clarifying questions
3. Define completion criteria:
   - Observable behaviors (manual verification)
   - Code tests (if implementation involved)
${riskWarning}
Reference TDD skill for test patterns when code changes are involved.
</system-reminder>`;
}

/**
 * Check if prompt is a continuation/follow-up
 */
function isContinuation(prompt: string): boolean {
  const trimmed = prompt.trim().toLowerCase();
  const continuationPatterns = [
    /^(yes|no|ok|sure|thanks|thank you|continue|proceed|go ahead|do it|yep|yeah|nope|nah)\.?$/i,
    /^(sounds good|looks good|perfect|great|awesome|cool)\.?$/i,
    /^(please|pls)$/i,
    /^(next|more|again)$/i,
  ];

  return continuationPatterns.some((p) => p.test(trimmed));
}

/**
 * Check if prompt is informational (question about concepts)
 */
function isInformational(prompt: string): boolean {
  const informationalPatterns = [
    /^(what|how|why|when|where|who|which|explain|describe|tell me about)\s/i,
    /\?$/,
  ];

  // Questions that are actually tasks
  const taskQuestions = [
    /can you (create|make|build|implement|add|fix|update|change)/i,
    /could you (create|make|build|implement|add|fix|update|change)/i,
    /would you (create|make|build|implement|add|fix|update|change)/i,
    /how do i (create|make|build|implement|add|fix|update|change)/i,
  ];

  const looksInformational = informationalPatterns.some((p) => p.test(prompt));
  const isActuallyTask = taskQuestions.some((p) => p.test(prompt));

  return looksInformational && !isActuallyTask;
}

async function readStdinWithTimeout(timeout: number = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeout);

    process.stdin.on('data', (chunk) => {
      data += chunk.toString();
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
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
    const prompt = data.prompt || '';

    // Skip empty or very short prompts
    if (!prompt || prompt.length < 5) {
      process.exit(0);
    }

    // Skip continuation prompts
    if (isContinuation(prompt)) {
      process.exit(0);
    }

    // Skip pure informational questions
    if (isInformational(prompt)) {
      process.exit(0);
    }

    const analysis = analyzeComplexity(prompt);
    const guidance = generateScopingGuidance(analysis, prompt);

    if (guidance) {
      console.log(guidance);
      console.error(
        `[analyze-task-scope] ${analysis.level} task (${analysis.score}/10)`
      );
    }

    process.exit(0);
  } catch (error) {
    // Fail silently - don't block Claude
    console.error('[analyze-task-scope] Error:', error);
    process.exit(0);
  }
}

main();
