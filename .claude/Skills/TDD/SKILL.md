---
name: TDD
description: Test-Driven Development methodology and workflows. Enforces the red-green-refactor cycle for reliable, well-tested code. USE WHEN user says 'write tests first', 'TDD', 'test driven', 'red green refactor', OR user wants to implement a feature with tests, OR user mentions testing before implementation.
agent: engineer
---

# TDD - Test-Driven Development

Enforces disciplined test-first development following the red-green-refactor cycle.

## Core Philosophy

**The TDD Cycle:**
```
RED    → Write a failing test (defines expected behavior)
GREEN  → Write minimal code to pass the test
REFACTOR → Improve code while tests stay green
```

**Why TDD Matters for PAI:**
- Aligns with Constitution Principle #6: "Spec/Test/Evals First"
- Deterministic verification of behavior
- Documentation through tests
- Confidence in refactoring

---

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Implement** | "implement with TDD", "TDD this feature" | `workflows/Implement.md` |
| **AddTests** | "add tests for", "test this code" | `workflows/AddTests.md` |
| **Refactor** | "refactor with tests", "safe refactor" | `workflows/Refactor.md` |

---

## TDD Implementation Workflow

### Phase 1: RED - Write Failing Test

**Before writing ANY implementation code:**

1. **Understand the requirement** - What behavior are we testing?
2. **Write the test first** - Define expected inputs and outputs
3. **Run the test** - Verify it FAILS (this is critical!)
4. **Confirm failure reason** - Should fail because code doesn't exist yet

```typescript
// Example: Testing a function that doesn't exist yet
describe('calculateDiscount', () => {
  it('should apply 10% discount for orders over $100', () => {
    const result = calculateDiscount(150);
    expect(result).toBe(135); // 150 - 15 = 135
  });
});
```

**Run test → RED (fails because calculateDiscount doesn't exist)**

### Phase 2: GREEN - Minimal Implementation

**Write the MINIMUM code to pass the test:**

1. **No extra features** - Only what the test requires
2. **No premature optimization** - Make it work first
3. **No over-engineering** - Simplest solution that passes

```typescript
// Minimal implementation to pass the test
function calculateDiscount(amount: number): number {
  if (amount > 100) {
    return amount * 0.9;
  }
  return amount;
}
```

**Run test → GREEN (passes)**

### Phase 3: REFACTOR - Improve with Confidence

**Now improve the code while keeping tests green:**

1. **Run tests after each change** - Catch regressions immediately
2. **Improve readability** - Better names, cleaner structure
3. **Remove duplication** - DRY principle
4. **Optimize if needed** - Only when tests prove it works

```typescript
// Refactored with constants and clearer logic
const DISCOUNT_THRESHOLD = 100;
const DISCOUNT_RATE = 0.10;

function calculateDiscount(amount: number): number {
  const discount = amount > DISCOUNT_THRESHOLD ? amount * DISCOUNT_RATE : 0;
  return amount - discount;
}
```

**Run test → Still GREEN (safe refactor)**

---

## TDD Rules (Non-Negotiable)

### The Three Laws of TDD

1. **You may not write production code until you have written a failing test**
2. **You may not write more of a test than is sufficient to fail**
3. **You may not write more production code than is sufficient to pass the test**

### PAI-Specific Rules

| Rule | Rationale |
|------|-----------|
| **Test file first** | Creates accountability before implementation |
| **One test at a time** | Maintains focus, prevents scope creep |
| **Run tests constantly** | Immediate feedback loop |
| **Commit at green** | Every passing state is a safe checkpoint |
| **Never skip red** | Skipping means you don't know if test works |

---

## Test Types by Layer

### Unit Tests (Most Common in TDD)
- Test single functions/methods in isolation
- Mock external dependencies
- Fast execution (milliseconds)
- Run after every code change

### Integration Tests
- Test component interactions
- Real database/API calls (test environment)
- Slower but validates real behavior
- Run before commits

### End-to-End Tests
- Test complete user workflows
- Browser automation (Playwright/Puppeteer)
- Slowest but highest confidence
- Run before deployments

---

## TDD Patterns

### Arrange-Act-Assert (AAA)

```typescript
it('should format date correctly', () => {
  // Arrange - Set up test data
  const date = new Date('2025-01-15');

  // Act - Execute the code under test
  const result = formatDate(date);

  // Assert - Verify the result
  expect(result).toBe('January 15, 2025');
});
```

### Given-When-Then (BDD Style)

```typescript
describe('Shopping Cart', () => {
  describe('given an empty cart', () => {
    describe('when adding an item', () => {
      it('then cart should contain one item', () => {
        const cart = new ShoppingCart();
        cart.add({ id: 1, name: 'Widget', price: 10 });
        expect(cart.items.length).toBe(1);
      });
    });
  });
});
```

### Test Doubles

| Type | Use Case |
|------|----------|
| **Stub** | Returns canned responses |
| **Mock** | Verifies interactions |
| **Spy** | Records calls for later verification |
| **Fake** | Working implementation (e.g., in-memory DB) |

---

## Common TDD Mistakes to Avoid

| Mistake | Why It's Bad | Fix |
|---------|--------------|-----|
| Writing tests after code | Tests biased toward implementation | Write test FIRST, always |
| Testing implementation details | Brittle tests that break on refactor | Test behavior, not internals |
| Too many assertions per test | Hard to identify failures | One logical assertion per test |
| Skipping the RED phase | Don't know if test actually works | Always verify test fails first |
| Writing all tests upfront | Waterfall, not TDD | One test at a time |
| Not running tests constantly | Delayed feedback | Run after every change |

---

## TDD with PAI Agents

### When to Delegate

| Scenario | Agent | Approach |
|----------|-------|----------|
| Feature implementation | Engineer | Give spec + require TDD |
| Bug fix | Debugger | Reproduce with test first |
| Refactoring | Engineer | Ensure tests exist before refactor |
| New component | Intern | Research patterns, then TDD |

### Delegation Prompt Template

```
Implement [FEATURE] using strict TDD:

1. Write failing test for [FIRST BEHAVIOR]
2. Run test - confirm RED
3. Write minimal code to pass
4. Run test - confirm GREEN
5. Refactor if needed
6. Repeat for next behavior

Requirements:
- [Requirement 1]
- [Requirement 2]

Test framework: [vitest/jest/pytest]
```

---

## Examples

**Example 1: Implement a new utility function**
```
User: "Implement a slugify function using TDD"
-> Invokes Implement workflow
-> Writes test: expect(slugify('Hello World')).toBe('hello-world')
-> Runs test (RED)
-> Implements minimal slugify
-> Runs test (GREEN)
-> Refactors for edge cases
-> Adds more tests for special characters
```

**Example 2: Add tests to existing code**
```
User: "Add tests for the pricing calculator"
-> Invokes AddTests workflow
-> Reads existing implementation
-> Identifies behaviors to test
-> Writes tests that pass (characterization tests)
-> Documents discovered behavior
```

**Example 3: Safe refactoring**
```
User: "Refactor the auth module - it's messy"
-> Invokes Refactor workflow
-> First ensures adequate test coverage exists
-> If not, adds characterization tests
-> Then refactors with confidence
-> Runs tests after each change
```

---

## Quick Reference

### TDD Checklist

- [ ] Test file created/opened
- [ ] First test written (describes ONE behavior)
- [ ] Test run and confirmed FAILING (RED)
- [ ] Minimal implementation written
- [ ] Test run and confirmed PASSING (GREEN)
- [ ] Code refactored (if needed)
- [ ] Tests still passing after refactor
- [ ] Committed at green state
- [ ] Repeat for next behavior

### Test Naming Convention

```
[unit under test]_[scenario]_[expected result]

calculateDiscount_orderOver100_returns10PercentOff
formatDate_nullInput_throwsError
validateEmail_validEmail_returnsTrue
```
