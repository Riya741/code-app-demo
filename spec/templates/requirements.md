# Requirements — <Spec Name>

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| NNN-<kebab-name> | <ABC> | Draft | <articles, e.g. II, IV, V> |

## Introduction
<What this spec covers and why, in 2–4 sentences.>

Status values: ✅ Implemented · ⚠️ Partial · ❌ Gap (expected behaviour missing or broken) · 📝 Planned (not built yet) · Deprecated.

---

### <ABC>-R1 — <user story title>
**User story:** As a <persona>, I want <capability>, so that <benefit>.

#### <ABC>-<AREA>-001: <short title, 3–8 words>
- **Status:** 📝 Planned
- **Criterion:** WHEN <trigger> THE system SHALL <response>.
- **Source:** `src/<path>.tsx`

#### <ABC>-<AREA>-002: <short title>
- **Status:** 📝 Planned
- **Criterion:** IF <condition> THEN THE system SHALL <response>.
- **Source:** `src/<path>.ts`

### <ABC>-R2 — <user story title>
<!-- New story → new AREA code (2–6 capital letters, unique in this spec), numbering restarts at 001. -->

## Out of scope
- …

## Open questions
- …

## Scenarios
- <Given … When … Then …>

<!-- Rules (checked by spec/scripts/spec_lint.py):
  - One '#### ID: title' block per acceptance criterion, with exactly one Status and one Criterion line.
  - Status: Implemented | Partial | Gap | Planned | Deprecated; add ' — note' after the word if useful.
  - Source: backticked repo paths that implement the criterion (omit the line for process-only rules).
  - IDs are never reused; retire a criterion by setting it to Deprecated.
  EARS patterns:
  Ubiquitous: THE system SHALL …
  Event:      WHEN <trigger> THE system SHALL …
  State:      WHILE <state> THE system SHALL …
  Unwanted:   IF <condition> THEN THE system SHALL …
  Optional:   WHERE <feature is enabled> THE system SHALL …
-->
