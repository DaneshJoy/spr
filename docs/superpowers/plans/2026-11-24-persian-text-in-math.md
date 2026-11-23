# Persian Text in MathJax Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Persian letters from being rendered inside MathJax expressions in SPR lesson pages while preserving each expression's meaning.

**Architecture:** Keep explanatory Persian as normal HTML text and keep MathJax expressions to mathematical notation and Latin identifiers. Preserve the existing `.formula` LTR/isolation styling; do not change shared rendering behavior or generated `dist/` files by hand.

**Tech Stack:** Static lesson HTML, Python build script, Node.js `node:test`.

**Spec:** Approved conversation design: apply to all SPR lessons containing Persian inside math; move Persian explanations outside MathJax, use equivalent mathematical/Latin notation inside; generated output comes from build.

## Global Constraints

- Edit authored `lessons/*.html`; never hand-edit `dist/**`.
- Preserve Persian RTL prose, formula meaning, and current lesson structure.
- No new dependencies.
- Run `npm run check` from `spr/`.

## Review Focus

- Persian characters remain inside a MathJax expression in any lesson — add a source-wide regression test.
- Moving an explanation changes mathematical meaning or removes needed context — retain the Persian explanation beside its formula.
- Generated output omits the authored change — verify through the normal build and test suite.

---

### Task 1: Remove Persian text from lesson math

**Files:**
- Modify: `lessons/01-bayesian-foundations.html`
- Modify: `lessons/03-conditional-bayes-networks.html`
- Modify: `lessons/04-bayesian-decision-costs.html`
- Modify: `lessons/05-hypothesis-testing-pvalue.html`
- Modify: `lessons/09-generative-classifiers.html`

- [ ] Rewrite the 11 identified math expressions containing Persian so the Persian wording is ordinary HTML prose and the MathJax expression uses equivalent mathematical/Latin notation. Preserve neighboring explanations and make the p-value formula a mathematical expression only.
- [ ] Inspect all MathJax expressions in all ten authored lesson files and ensure none contain Persian letters.

### Task 2: Guard against regressions

**Files:**
- Modify: `tests/site.test.mjs`

- [ ] Add a test that reads every authored lesson and asserts that no Persian letters occur inside supported MathJax delimiters (`\(...\)`, `\[...\]`, `$...$`, and `$$...$$`) or `.formula` containers.
- [ ] Run the focused test and verify it passes against the revised lesson sources.
- [ ] Run `npm run check`; expect manifest validation, build, and all tests to pass.
