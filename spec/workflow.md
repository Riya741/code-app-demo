# Workflow: how a change moves

Every change, from a one-line fix to a new feature, follows these steps. Steps 2–4 can be one review for a small
defect fix, but none is skipped (Constitution, Article I).

1. **Propose.** Fill [templates/change-request.md](templates/change-request.md) with the problem, the proposed behaviour and the specs it touches.
2. **Specify.** Add or edit requirement blocks in `requirements.md`: new `PREFIX-AREA-NNN` IDs, an EARS criterion, status 📝 Planned (or ❌ Gap for a defect), and the Source files.
3. **Design.** Update `design.md`, including the Constitution check; add an ADR in [adr/](adr/) for any architectural choice.
4. **Plan.** Add tasks to `tasks.md` with status ⬜, `Covers:` requirement IDs and files; update the Summary line; run gate G1.
5. **Build.** Set the task to 🔄 In progress and implement; commit with the task ID (`UCF-T07: save use case edits`).
6. **Verify.** Prove each covered criterion, with a test named after the requirement ID or a manual note in the task; run gates G1–G4.
7. **Close.** Task ✅ and `[x]`, requirement ✅ Implemented, gap-register row closed, Summary line, [README](README.md) dashboard and [traceability](traceability.md) updated; regenerate the spec tree.

If code and spec disagree, one of them is a defect: fix the code, or change the spec through this workflow.

## Status vocabularies
| Item | Values |
|---|---|
| Requirement | ✅ Implemented · ⚠️ Partial · ❌ Gap (expected behaviour missing or broken) · 📝 Planned · Deprecated |
| Task | ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked (say by what) |
| ADR | Proposed · Accepted · Superseded by ADR-NNNN |

## Gates
See [gates/validation-gates.md](gates/validation-gates.md). Open gaps are tracked in
[gates/gap-register.md](gates/gap-register.md).
