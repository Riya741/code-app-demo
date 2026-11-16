"""
Builds a clean, app-ready workbook (one Excel table per entity) from the Power BI style export Terra_Data.xlsx.

    python -I scripts/build_workbook.py <Terra_Data.xlsx> <code-app-data.xlsx>

The export is flat and partly damaged (multi-line cells were split across rows, and several tables are stacked in the
Events sheet), so everything here is best-effort recovery. Rows that cannot be trusted are dropped and counted in the
README sheet of the output instead of being guessed.
"""
import collections
import re
import sys
from datetime import date, datetime

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

MAX_CELL = 32000  # Excel hard limit is 32,767 characters per cell
ILLEGAL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
DATE_FMT = "%a, %d %b %Y %H:%M:%S"
stats: dict[str, int] = collections.Counter()


# ----------------------------------------------------------------------------------------------- helpers
def clean_text(v):
    if v is None:
        return None
    s = ILLEGAL.sub("", str(v)).strip("\r")
    if s.strip() == "":
        return None
    if len(s) > MAX_CELL:
        stats["text truncated to Excel cell limit"] += 1
        s = s[:MAX_CELL]
    return s


def parse_dt(v):
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day)
    if isinstance(v, str):
        try:
            return datetime.strptime(v.strip(), DATE_FMT)
        except ValueError:
            return None
    return None


def iso_date(v):
    d = parse_dt(v)
    return d.strftime("%Y-%m-%d") if d else None


def iso_dt(v):
    d = parse_dt(v)
    return d.strftime("%Y-%m-%dT%H:%M:%S") if d else None


def is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def to_int(v):
    return int(v) if is_int(v) or (isinstance(v, float) and v == int(v)) else None


def split_names(v):
    if not isinstance(v, str):
        return []
    return [t.strip() for t in v.split(", ") if t.strip()]


def sheet_rows(wb, name):
    ws = wb[name]
    hdr = [c.value for c in ws[1]]
    for r in ws.iter_rows(min_row=2, values_only=True):
        yield dict(zip(hdr, r))


def mode(values):
    values = [v for v in values if v is not None]
    return collections.Counter(values).most_common(1)[0][0] if values else None


# ----------------------------------------------------------------------------------------------- load
src, dst = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True)

# ---- Use cases (clean, one row per use case, already joined with its lookups)
uc_src = [r for r in sheet_rows(wb, "Use cases") if is_int(r["[id]"])]
stats["use cases in source"] = len(uc_src)

# ---- Customers (Executive Summary): a record starts on a row with an int id; long summaries spill onto the rows below in column A
customers: dict[int, dict] = {}
cur = None
for r in wb["Executive Summary"].iter_rows(min_row=2, values_only=True):
    a, b, c, d = r[:4]
    if is_int(a) and isinstance(b, str):
        cur = {"id": a, "parent_name": clean_text(b), "lines": [c] if isinstance(c, str) else [], "modified": iso_dt(d)}
        customers[a] = cur
    elif cur is not None and isinstance(a, str):
        cur["lines"].append(a)
    elif cur is not None and a is None:
        cur["lines"].append("")
for c in customers.values():
    text = "\n".join(c["lines"]).strip()
    c["summary"] = clean_text(text) if text else None
stats["customers in source"] = len(customers)

# ----------------------------------------------------------------------------------------------- lookups from use cases
subsidiaries: dict[int, dict] = {}
departments: dict[int, dict] = {}
stakeholders: dict[int, dict] = {}
solutions: dict[int, dict] = {}
use_case_types: dict[int, str] = {}
statuses: dict[int, str] = {}
sol_uc_types: set[tuple[int, int]] = set()

for r in uc_src:
    sid, did, kid = to_int(r["[subsidiary_id]"]), to_int(r["[department_id]"]), to_int(r["[stakeholder_id]"])
    if sid is not None:
        s = subsidiaries.setdefault(sid, {"name": None, "parents": []})
        s["name"] = s["name"] or clean_text(r["[subsidiary_name]"])
        s["parents"].append(to_int(r["[parent_id]"]))
    if did is not None:
        d = departments.setdefault(did, {"name": None, "type": None, "subs": []})
        d["name"] = d["name"] or clean_text(r["[department_name]"])
        d["type"] = d["type"] or clean_text(r["[department_type]"])
        d["subs"].append(sid)
    if kid is not None:
        k = stakeholders.setdefault(kid, {"name": None, "title": None, "depts": []})
        k["name"] = k["name"] or clean_text(r["[stakeholder_name]"])
        k["title"] = k["title"] or clean_text(r["[stakeholder_title]"])
        k["depts"].append(did)
    sol = to_int(r["[solution_id]"])
    if sol is not None:
        s = solutions.setdefault(sol, {"name": None, "metric": [], "premium": []})
        s["name"] = s["name"] or clean_text(r["[solution_name]"])
        s["metric"].append(clean_text(r["[target_metric_type]"]))
        s["premium"].append(r["[premium_credit]"] if isinstance(r["[premium_credit]"], bool) else None)
    tid = to_int(r["[use_case_type_id]"])
    if tid is not None:
        use_case_types.setdefault(tid, clean_text(r["[use_case_type]"]))
        if sol is not None:
            sol_uc_types.add((sol, tid))
    st = to_int(r["[status_id]"])
    if st is not None:
        statuses.setdefault(st, clean_text(r["[status]"]))

hist_src = [r for r in sheet_rows(wb, "Use case History") if is_int(r["use_case_status_history[id]"])]
for r in hist_src:
    st = to_int(r["use_case_status_history[status_id]"])
    if st is not None:
        statuses.setdefault(st, clean_text(r["use_case_status_history[status]"]))

# ----------------------------------------------------------------------------------------------- personnel / content types / link tables from use cases
personnel: dict[str, dict] = {}  # name -> {"id", "roles"}
content_types: dict[str, int] = {}


def person_id(name):
    p = personnel.get(name)
    if p is None:
        p = personnel[name] = {"id": len(personnel) + 1, "roles": []}
    return p["id"]


def content_type_id(name):
    if name not in content_types:
        content_types[name] = len(content_types) + 1
    return content_types[name]


uc_personnel: list[tuple[int, int]] = []
uc_content: list[tuple[int, int]] = []
for r in uc_src:
    ucid = r["[id]"]
    names, roles = split_names(r["[Personnel (Concat)]"]), split_names(r["[Roles (Concat)]"])
    for i, n in enumerate(names):
        pid = person_id(n)
        if len(roles) == len(names):
            personnel[n]["roles"].append(roles[i])
        if (ucid, pid) not in uc_personnel:
            uc_personnel.append((ucid, pid))
    for n in split_names(r["[Content Types (Concat)]"]):
        cid = content_type_id(n)
        if (ucid, cid) not in uc_content:
            uc_content.append((ucid, cid))

# ----------------------------------------------------------------------------------------------- events
# Three layouts live in the Events sheet:
#   clean : one complete row, headers as in row 1
#   start : A=event id, C=int, E=meeting note (first line) and, when the note is a single line, the event fields in F..T
#   end   : a multi-line note spills down column A; its last row holds the event fields in B..P (P = event id)
events: dict[int, dict] = {}
notes: dict[int, str] = {}


def take(ev_id, priority, fields):
    """Keep the highest-priority value per field (clean > end > start)."""
    cur_ev = events.setdefault(ev_id, {"_prio": {}})
    for k, v in fields.items():
        if v is None:
            continue
        if k not in cur_ev or priority < cur_ev["_prio"][k]:
            cur_ev[k] = v
            cur_ev["_prio"][k] = priority


STAGE_BAD = re.compile(r"^\d+$")
ws_ev = wb["Events"]
hdr = [c.value for c in ws_ev[1]]
H = {h: i for i, h in enumerate(hdr) if h}
current = None


def finish(rec):
    if rec and rec["lines"]:
        text = "\n".join(rec["lines"]).strip("\n")
        if text.strip():
            notes[rec["id"]] = clean_text(text)


for row in ws_ev.iter_rows(min_row=2, values_only=True):
    g = lambda name: row[H[name]]
    a, b, c, d, e = row[0], row[1], row[2], row[3], row[4]
    nonempty = sum(v not in (None, "") for v in row)

    # clean row
    if is_int(g("[id]")) and isinstance(g("[deleted]"), bool) and parse_dt(g("[event_date]")) and isinstance(g("[stage]"), str):
        finish(current)
        current = None
        stats["event rows: clean layout"] += 1
        take(g("[id]"), 0, {
            "attendee_count": to_int(g("[attendee_count]")), "attendee_names": clean_text(g("[attendee_names]")),
            "created": iso_dt(g("[created]")), "deleted": g("[deleted]"), "duration": to_int(g("[duration]")),
            "event_date": iso_date(g("[event_date]")), "event_type_id": to_int(g("[event_type_id]")),
            "last_modified": iso_dt(g("[last_modified]")),
            "onsite": g("[onsite]") if isinstance(g("[onsite]"), bool) else None,
            "stage": clean_text(g("[stage]")), "subsidiary_id": to_int(g("[subsidiary_id]")),
            "personnel": g("[Personnel (Concat)]") if isinstance(g("[Personnel (Concat)]"), str) else None,
            "solutions": g("[Solution (Concat)]") if isinstance(g("[Solution (Concat)]"), str) else None,
        })
        continue

    # start row of a meeting-note record
    if is_int(a) and is_int(c) and isinstance(e, str):
        finish(current)
        current = {"id": a, "lines": [e]}
        if isinstance(row[5], str) and parse_dt(row[5]) and is_int(row[19]):  # start row that also carries the event fields
            stats["event rows: note + fields on one row"] += 1
            take(a, 2, {
                "event_date": iso_date(row[5]), "event_type_id": to_int(row[6]),
                "stage": clean_text(row[7]) if isinstance(row[7], str) else None,
                "deleted": row[8] if isinstance(row[8], bool) else None, "duration": to_int(row[10]),
                "subsidiary_id": to_int(row[11]), "onsite": row[12] if isinstance(row[12], bool) else None,
                "created": iso_dt(row[13]), "last_modified": iso_dt(row[14]),
                "personnel": row[17] if isinstance(row[17], str) else None,
            })
            finish(current)
            current = None
        continue

    if current is not None:
        # end row of a multi-line note: fields in B..P, P = event id
        if is_int(row[15]) and parse_dt(b) and is_int(c) and isinstance(d, str):
            if isinstance(a, str):
                current["lines"].append(a)
            eid = current["id"]
            if row[15] != eid:
                stats["note records whose closing row names a different event id"] += 1
            stats["event rows: note spilled over several rows"] += 1
            take(eid, 1, {
                "event_date": iso_date(b), "event_type_id": to_int(c), "stage": clean_text(d),
                "deleted": e if isinstance(e, bool) else None, "duration": to_int(row[6]),
                "subsidiary_id": to_int(row[7]), "onsite": row[8] if isinstance(row[8], bool) else None,
                "created": iso_dt(row[9]), "last_modified": iso_dt(row[10]),
                "solutions": row[12] if isinstance(row[12], str) else None,
                "personnel": row[13] if isinstance(row[13], str) else None,
            })
            finish(current)
            current = None
        elif isinstance(a, str):
            current["lines"].append(a)
        elif nonempty == 0:
            current["lines"].append("")
        if current is not None and len(current["lines"]) > 600:
            finish(current)
            current = None
finish(current)

# keep only events that have the minimum an event needs
ev_ids = sorted(i for i, e in events.items() if e.get("event_date") and e.get("stage") and not STAGE_BAD.match(e["stage"]))
stats["events recovered"] = len(ev_ids)
stats["events dropped (no date or stage)"] = len(events) - len(ev_ids)

# solutions mentioned by events but unknown to use cases get new ids
sol_by_name = {s["name"]: i for i, s in solutions.items() if s["name"]}
next_sol = max(solutions or {0}) + 1


def solution_ids(text):
    global next_sol
    tokens = split_names(text)
    out, i = [], 0
    while i < len(tokens):
        for j in range(len(tokens), i, -1):
            name = ", ".join(tokens[i:j])
            if name in sol_by_name:
                out.append(sol_by_name[name])
                i = j
                break
        else:
            name = tokens[i]
            sol_by_name[name] = next_sol
            solutions[next_sol] = {"name": name, "metric": [], "premium": []}
            stats["solutions added from events (not in use cases)"] += 1
            out.append(next_sol)
            next_sol += 1
            i += 1
    return list(dict.fromkeys(out))


ev_personnel: list[tuple[int, int]] = []
ev_solution: list[tuple[int, int]] = []
for i in ev_ids:
    e = events[i]
    for n in split_names(e.get("personnel")):
        ev_personnel.append((i, person_id(n)))
    for sid in solution_ids(e.get("solutions")):
        ev_solution.append((i, sid))
ev_personnel = list(dict.fromkeys(ev_personnel))
ev_solution = list(dict.fromkeys(ev_solution))

# ----------------------------------------------------------------------------------------------- subsidiary for every event
for i in ev_ids:
    sid = events[i].get("subsidiary_id")
    if sid is None:
        stats["events without subsidiary (cannot be tied to a customer)"] += 1
    elif sid not in subsidiaries:
        if sid in customers:
            subsidiaries[sid] = {"name": customers[sid]["parent_name"], "parents": [sid]}
            stats["subsidiaries added = customer itself (event subsidiary id equals a customer id)"] += 1
        else:
            subsidiaries[sid] = {"name": f"Subsidiary {sid}", "parents": [None]}
            stats["subsidiaries added with unknown customer"] += 1
            events[i]["_orphan"] = True

# ----------------------------------------------------------------------------------------------- table definitions
T: dict[str, tuple[list[str], list[list]]] = {}

used_parents = {to_int(r["[parent_id]"]) for r in uc_src}
sub_parent = {i: mode(s["parents"]) for i, s in subsidiaries.items()}
event_parents = {sub_parent.get(events[i].get("subsidiary_id")) for i in ev_ids}
visible = {p for p in used_parents | event_parents if p is not None}
T["customer"] = (
    ["id", "parent_id", "parent_name", "executive_summary", "summary_last_modified", "visible", "industry", "vertical"],
    # only customers that have a use case or an event are kept
    [[i, i, c["parent_name"], c["summary"], c["modified"], True, None, None] for i, c in sorted(customers.items()) if i in visible],
)
stats["customers dropped (no use case or event)"] = len(customers) - sum(1 for i in customers if i in visible)
missing = [p for p in visible if p not in customers]
stats["customers referenced by data but missing from Executive Summary"] = len(missing)
for p in missing:  # keep referential integrity
    name = next((r["[parent_name]"] for r in uc_src if to_int(r["[parent_id]"]) == p), None)
    T["customer"][1].append([p, p, clean_text(name) or f"Customer {p}", None, None, True, None, None])

T["subsidiary"] = (
    ["id", "subsidiary_id", "subsidiary_name", "parent_id", "geo_id", "is_enterprise", "market_area_id"],
    [[i, i, s["name"], sub_parent[i], None, False, None] for i, s in sorted(subsidiaries.items())],
)
T["department"] = (
    ["id", "department_id", "department_name", "department_type", "subsidiary_id"],
    [[i, i, d["name"], d["type"], mode(d["subs"])] for i, d in sorted(departments.items())],
)
T["stakeholder"] = (
    ["id", "stakeholder_name", "stakeholder_title", "department_id", "email"],
    [[i, k["name"], k["title"], mode(k["depts"]), None] for i, k in sorted(stakeholders.items())],
)
T["solution"] = (
    ["id", "solution_name", "metric_type", "premium_credit", "is_ffe"],
    [[i, s["name"], mode(s["metric"]), bool(mode(s["premium"])) if s["premium"] else False, False] for i, s in sorted(solutions.items())],
)
T["use_case_type"] = (["id", "use_case_type"], [[i, n] for i, n in sorted(use_case_types.items())])
T["status"] = (["id", "status"], [[i, n] for i, n in sorted(statuses.items())])
T["solution_use_case_type"] = (
    ["id", "solution_id", "use_case_type_id"],
    [[n, s, t] for n, (s, t) in enumerate(sorted(sol_uc_types), 1)],
)
T["solution_status"] = (  # every status is allowed for every solution; edit this sheet to restrict
    ["id", "solution_id", "status_id", "sort_order"],
    [[n, s, st, st] for n, (s, st) in enumerate([(s, st) for s in sorted(solutions) for st in sorted(statuses)], 1)],
)
T["personnel"] = (
    ["id", "name", "email", "role", "sdm_geo_id"],
    [[p["id"], n, None, mode(p["roles"]), None] for n, p in sorted(personnel.items(), key=lambda kv: kv[1]["id"])],
)
T["content_type"] = (["id", "content_type"], [[i, n] for n, i in sorted(content_types.items(), key=lambda kv: kv[1])])

ev_type_ids = sorted({events[i]["event_type_id"] for i in ev_ids if events[i].get("event_type_id") is not None})
T["event_type"] = (["id", "event_type"], [[i, f"Event type {i}"] for i in ev_type_ids])
stats["event types needing real names (placeholder 'Event type N')"] = len(ev_type_ids)

uc_rows = []
for r in uc_src:
    uc_rows.append([
        r["[id]"], r["[id]"], to_int(r["[parent_id]"]), to_int(r["[subsidiary_id]"]), to_int(r["[department_id]"]),
        to_int(r["[stakeholder_id]"]), to_int(r["[solution_id]"]), to_int(r["[status_id]"]), to_int(r["[use_case_type_id]"]),
        r["[target_users]"] if is_int(r["[target_users]"]) else None, to_int(r["[target_credits_consumed]"]), to_int(r["[target_api_calls]"]),
        iso_date(r["[expected_launch_date]"]), None, None, bool(r["[premium_credit]"]) if isinstance(r["[premium_credit]"], bool) else False,
        False, iso_dt(r["[created]"]), iso_dt(r["[last_modified]"]),
        None, None, None, None, None, None, None, None, None, None, None,
        clean_text(r["[Blocker (Concat)]"]), clean_text(r["[Current Solution (Concat)]"]),
    ])
T["use_case"] = (
    ["id", "use_case_id", "parent_id", "subsidiary_id", "department_id", "stakeholder_id", "solution_id", "status_id", "use_case_type_id",
     "target_users", "target_credits_consumed", "target_api_calls", "expected_launch_date", "note", "value_snippet", "premium_credit",
     "deleted", "created", "last_modified",
     "jsp", "jsp_link", "uc_in_jsp", "dr_id", "jira_id", "photography_type_id", "fde_support_request", "fde_request_notes",
     "fde_escalation_id", "fde_request_ts", "adoption_criteria", "blocker_names", "current_solution_names"],
    uc_rows,
)
# engaged_success_criteria sits with the other optional text columns
T["use_case"][0].insert(T["use_case"][0].index("adoption_criteria") + 1, "engaged_success_criteria")
for row in T["use_case"][1]:
    row.insert(T["use_case"][0].index("engaged_success_criteria"), None)

T["use_case_personnel"] = (["id", "use_case_id", "personnel_id"], [[n, u, p] for n, (u, p) in enumerate(uc_personnel, 1)])
T["use_case_content_type"] = (["id", "use_case_id", "content_type_id"], [[n, u, c] for n, (u, c) in enumerate(uc_content, 1)])
uc_ids = {r["[id]"] for r in uc_src}
hist_ok = [r for r in hist_src if to_int(r["use_case_status_history[use_case_id]"]) in uc_ids]
stats["status history rows dropped (use case not in the export)"] = len(hist_src) - len(hist_ok)
T["use_case_status_history"] = (
    ["id", "use_case_id", "status_id", "previous_status_id", "change_datetime"],
    [[r["use_case_status_history[id]"], to_int(r["use_case_status_history[use_case_id]"]), to_int(r["use_case_status_history[status_id]"]),
      to_int(r["use_case_status_history[previous_status_id]"]), iso_dt(r["use_case_status_history[change_datetime]"])] for r in hist_ok],
)

T["event"] = (
    ["id", "event_id", "attendee_count", "attendee_names", "meeting_notes", "event_date", "event_type_id", "stage",
     "onsite", "virtual", "duration", "subsidiary_id", "deleted", "created", "last_modified"],
    [[i, i, events[i].get("attendee_count"), events[i].get("attendee_names"), notes.get(i), events[i].get("event_date"),
      events[i].get("event_type_id"), events[i].get("stage"), events[i].get("onsite"), None, events[i].get("duration"),
      events[i].get("subsidiary_id"), bool(events[i].get("deleted")), events[i].get("created"), events[i].get("last_modified")]
     for i in ev_ids],
)
T["event_personnel"] = (["event_personnel_id", "event_id", "personnel_id"], [[n, e, p] for n, (e, p) in enumerate(ev_personnel, 1)])
T["event_solution"] = (["event_solution_id", "event_id", "solution_id"], [[n, e, s] for n, (e, s) in enumerate(ev_solution, 1)])
stats["events with meeting notes"] = sum(1 for i in ev_ids if i in notes)

# ----------------------------------------------------------------------------------------------- write
out = openpyxl.Workbook()
out.remove(out.active)
readme = out.create_sheet("README")

HEAD_FILL = PatternFill("solid", fgColor="1F4E78")
for name, (cols, rows) in T.items():
    ws = out.create_sheet(name)
    ws.append(cols)
    for r in rows:
        ws.append([ILLEGAL.sub("", v) if isinstance(v, str) else v for v in r])
    for c in ws[1]:
        c.font, c.fill = Font(bold=True, color="FFFFFF"), HEAD_FILL
    ws.freeze_panes = "A2"
    for i, col in enumerate(cols, 1):
        longest = max([len(str(col))] + [len(str(r[i - 1])) for r in rows[:300] if r[i - 1] is not None])
        ws.column_dimensions[get_column_letter(i)].width = min(max(longest + 2, 8), 48)
    ref = f"A1:{get_column_letter(len(cols))}{max(len(rows) + 1, 2)}"
    tbl = Table(displayName=name, ref=ref)
    tbl.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
    ws.add_table(tbl)

readme["A1"] = "Code App Demo data"
readme["A1"].font = Font(bold=True, size=14)
lines = [
    f"Generated {datetime.now():%Y-%m-%d %H:%M} from {src.split(chr(92))[-1].split('/')[-1]} by scripts/build_workbook.py",
    "",
    "Each sheet is one Excel table named after the sheet. The app reads and writes these tables; keep the header row and sheet names.",
    "Ids are unique per table. New rows added by the app get max(id) + 1.",
    "",
    "Known gaps in the source export (edit the sheets to fix them):",
    "- event_type: the export has only ids, so names are placeholders 'Event type N'. Rename them.",
    "- personnel: ids were generated from names (no ids or emails in the export). Emails are blank.",
    "- solution_status: every status is allowed for every solution. Delete rows to restrict.",
    "- customer.industry / vertical: not in the export, blank.",
    "- event.virtual: not in the export, blank.",
    "- customer: only customers that have a use case or an event are kept (all marked visible).",
    "- Executive summaries that were split over several rows were rejoined; their summary_last_modified is blank.",
    "",
    "Recovery log:",
] + [f"- {k}: {v}" for k, v in sorted(stats.items())]
for n, line in enumerate(lines, 3):
    readme.cell(row=n, column=1, value=line)
readme.column_dimensions["A"].width = 120
out.move_sheet("README", offset=-len(out.sheetnames) + 1)
out.save(dst)

for name, (cols, rows) in T.items():
    print(f"{name:26s}{len(rows):>7d} rows  {len(cols):>3d} cols")
print()
for k, v in sorted(stats.items()):
    print(f"{v:>7d}  {k}")
