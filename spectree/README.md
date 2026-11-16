# code-app-demo - SDD Spec tree

A single HTML page that shows how spec-driven development (SDD) works in
code-app-demo (specs in `../spec`), and where each project stands. It is built from the SDD files in those
repos, so it is only as current as the last time it was generated.

## Regenerate

From this folder, with the project repos checked out at the paths in `spectree.config.json`:

```bash
py build_spectree.py --verify      # Windows; python3 on macOS/Linux
```

Open `dist/sdd-explorer.html` in a browser. It needs no server or network. Python 3.9+ is the
only requirement. `--verify` checks that the page counts the same specs and requirements as
each repo's `spec/scripts/spec_lint.py`.

The page reads the working tree of each repo, including uncommitted edits. It shows the
branch, commit and an "uncommitted" badge for each repo. Pull or check out the branch you
want before regenerating.

## Reading the page

**Design.** The design button in the header cycles through Classic, Glass and Orbit, and ◐
switches between auto, light and dark. The browser remembers both choices.

**Orbit** draws each project as an orbital map. The constitution is the core, and each SDD layer
is a ring further out, ending with the gates. It opens in **Simple** mode, which shows the SDD
layers and one tile per spec, with grouped specs such as the UI specs folded into one tile.
**Detailed** adds every grouped spec, code file and test file. Scroll or pinch to zoom, and drag
to pan. Click anything to trace it inward to its principles and decisions and outward to its
code and tests. Press ⌘K (Ctrl K) to find anything. Use **▶ Explain SDD** for a guided tour,
and the lens switch to colour by status, test evidence or task progress.

**SDD flow** is the teaching view. Read it top to bottom:

1. **Constitution.** The non-negotiable principles.
2. **Steering.** Product, tech and structure notes that every spec relies on.
3. **PRD.** Users and capabilities; each capability becomes a spec.
4. **Architecture and ADRs.** How the system is built and why.
5. **Specs.** One tile per capability. A spec holds requirements (EARS), a design and tasks.
6. **Contracts.** APIs shared between projects. A dashed line joins the two sides.
7. **Delivery.** Tasks done, code files linked to specs, and the share of requirements a test cites.
8. **Gates.** The checks that keep specs and code in step.

**Tile colours.** A spec takes the colour of its weakest active requirement:

| Colour | Status |
|---|---|
| Green | Implemented |
| Amber | Partial, or a mix of Implemented and Planned |
| Red | Gap: a known missing behaviour, pinned by a strict-xfail test |
| Blue | Planned |
| Grey | Deprecated |

Click any tile to see its requirements, tasks, code files, ADRs and linked specs. Grouped specs,
such as the UI specs, open by area when you click the group.

**Components ↔ Specs** shows which files implement which specs. The links come from each
requirement's `Source:` line, and from the requirement IDs that test files cite. Hover over a
file or a spec to trace its links. Matrix view shows the same links as a grid.

**Status** lists the specs that are not fully implemented, the open gap-register rows, the
links between projects, and Source references that point at files that no longer exist.

Deep links: add `#components` or `#status` to the URL, or `#flow&open=<project>:<spec path>`
to open a spec directly.

## Changing the page

- **Config.** Edit `spectree.config.json` to change the application name (`app_name`), the
  default design, projects, paths, tile content, colours, layer order or declared links
  between projects.
- **Generator.** `build_spectree.py` and `template.html` are copies from the `sdd-spectree`
  Claude Code skill (version in `build_spectree.py --version`). Change them in the skill, not here.
