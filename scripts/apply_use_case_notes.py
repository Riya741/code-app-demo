"""
Fills use_case.note in code-app-data.xlsx from its 'use case note' sheet, matching on use case id.

    python -I scripts/apply_use_case_notes.py <code-app-data.xlsx> [<output.xlsx>]

The 'use case note' sheet is a Power BI export where every note was split across rows:
  - a note starts on the row whose column A holds a use case id (the first line is in column B);
  - the next lines follow down column A, blank rows are blank lines;
  - indented bullets sit in column B / C / D (one column per level);
  - a few notes contain small tables spread over columns A..E.
Integers in column A that are not a use case id (numbered table rows) are treated as note text, not as a new note.
Safe to run again: it only writes the note column.
"""
import sys
import re
from datetime import time

import openpyxl

MAX_CELL = 32000  # Excel hard limit is 32,767 characters per cell
ILLEGAL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
path = sys.argv[1]

wb = openpyxl.load_workbook(path)
uc = wb["use_case"]
notes_ws = wb["use case note"]

hdr = [c.value for c in uc[1]]
id_col, note_col = hdr.index("id"), hdr.index("note")
uc_ids = {r[id_col] for r in uc.iter_rows(min_row=2, values_only=True)}


def is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def cell_text(v):
    if v is None:
        return None
    if isinstance(v, time):
        return v.strftime("%H:%M")
    s = ILLEGAL.sub("", str(v)).rstrip()
    return s if s.strip() else None


def bullet(s, level):
    """The bullet glyphs were lost in the export ('?' / U+FFFD). Restore a readable marker."""
    if level == 0:
        return s
    return re.sub(r"^[�•]\s*", "• ", re.sub(r"^\?\s*", "◦ ", s))


def line_of(row, is_start=False):
    cells = [cell_text(v) for v in row[:5]]
    if is_start:
        cells[0] = None  # column A holds the id
    filled = [(i, c) for i, c in enumerate(cells) if c is not None]
    if not filled:
        return ""
    if len(filled) == 1:
        level, text = filled[0]
        if is_start:
            level = 0  # the first line of a note sits in B but is not indented
        return "  " * level + bullet(text, level)
    return " | ".join(c for _, c in filled)  # table row


notes: dict[int, list[str]] = {}
current = None
dupes = 0
for row in notes_ws.iter_rows(min_row=2, values_only=True):
    if is_int(row[0]) and row[0] in uc_ids:
        if row[0] in notes:
            dupes += 1
        current = notes.setdefault(row[0], [])
        current.append(line_of(row, is_start=True))
    elif current is not None:
        current.append(line_of(row))

filled = missing = truncated = 0
for r in range(2, uc.max_row + 1):
    uid = uc.cell(row=r, column=id_col + 1).value
    lines = notes.get(uid)
    text = None
    if lines:
        text = "\n".join(lines).strip("\n")
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        if len(text) > MAX_CELL:
            text, truncated = text[:MAX_CELL], truncated + 1
    uc.cell(row=r, column=note_col + 1).value = text or None
    if text:
        filled += 1
    else:
        missing += 1

readme = wb["README"] if "README" in wb.sheetnames else None
if readme is not None:
    readme.cell(row=readme.max_row + 2, column=1,
                value=f"- use_case.note filled from the 'use case note' sheet by id lookup: {filled} of {filled + missing} use cases have a note.")

wb.save(sys.argv[2] if len(sys.argv) > 2 else path)
print(f"use cases with a note : {filled}")
print(f"use cases without one : {missing}")
print(f"note ids not in use_case: {len(set(notes) - uc_ids)} | duplicate ids in note sheet: {dupes} | truncated: {truncated}")
