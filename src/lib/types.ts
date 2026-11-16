/** Row shapes served by the local workbook (see server/workbook.ts). Column names match the sheets in code-app-data.xlsx. */

export type CustomerRow = Record<string, unknown>;

export type UseCaseRow = {
  id?: number;
  parent_id?: number;
  parent_name?: string;
  subsidiary_id?: number;
  subsidiary_name?: string;
  department_id?: number;
  department_name?: string;
  department_type?: string;
  stakeholder_id?: number;
  stakeholder_name?: string;
  stakeholder_title?: string;
  solution_id?: number;
  solution_name?: string;
  solution_premium_credit?: boolean;
  metric_type?: string;
  status_id?: number;
  status?: string;
  use_case_type_id?: number;
  use_case_type?: string;
  target_users?: number;
  target_credits_consumed?: number;
  target_api_calls?: number;
  expected_launch_date?: string;
  premium_credit?: boolean;
  note?: string;
  value_snippet?: string;
  /** Comma separated ids / names of the linked records. */
  personnel_ids?: string;
  personnel_names?: string;
  content_type_ids?: string;
  content_type_names?: string;
  blocker_names?: string;
  current_solution_names?: string;
  last_modified?: string;
};

export type EventRow = {
  id?: number;
  subsidiary_id?: number;
  subsidiary_name?: string;
  event_type_id?: number;
  event_type?: string;
  event_date?: string;
  stage?: string;
  attendee_count?: number;
  attendee_names?: string;
  meeting_notes?: string;
  duration?: number;
  onsite?: boolean;
  virtual?: boolean;
  last_modified?: string;
  css_contributors?: string;
  solution_names?: string;
  css_contributor_ids?: string[];
  solution_ids?: string[];
};

/** What the Add use case forms send. `id` (when set) updates that use case instead of adding one. */
export type UseCaseInput = {
  id?: number;
  parent_id?: number;
  subsidiary_id?: number;
  department_id?: number;
  stakeholder_id?: number;
  solution_id?: number;
  use_case_type_id?: number;
  status_id?: number;
  expected_launch_date?: string;
  /** Comma separated ids. */
  content_type_ids?: string;
  personnel_ids?: string;
  value_snippet?: string;
  note?: string;
  premium_credit?: boolean;
  target_users?: number;
  target_credits_consumed?: number;
  target_api_calls?: number;
  deleted?: boolean;
};

/** What the Add event form sends. `Id` (when set) updates that event instead of adding one. */
export type EventInput = {
  Id?: number;
  SubsidiaryId?: string;
  EventTypeId?: number;
  EventDate?: string;
  Stage?: string;
  AttendeeCount?: number;
  AttendeeNames?: string;
  MeetingNotes?: string;
  Duration?: number;
  Onsite?: boolean;
  Virtual?: boolean;
  /** Comma separated ids. */
  SolutionIds?: string;
  PersonnelIds?: string;
  Deleted?: boolean;
};

export type Subsidiary = { id?: number; subsidiary_id?: number; subsidiary_name?: string; parent_id?: number };
export type Department = { id?: number; department_id?: number; department_name?: string; department_type?: string; subsidiary_id?: number };
export type Stakeholder = { id?: number; stakeholder_name?: string; stakeholder_title?: string; department_id?: number; email?: string };
export type Solution = { id?: number; solution_name?: string; metric_type?: string; premium_credit?: boolean; is_ffe?: boolean };
export type Content_type = { id?: number; content_type?: string };
export type Personnel = { id?: number; name?: string; email?: string; role?: string };
export type Event_type = { id?: number; event_type: string };

export type SolutionUseCaseTypeRow = { id?: number; solution_id?: number; solution_name?: string; use_case_type_id?: number; use_case_type?: string };
export type SolutionStatusRow = { id?: number; solution_id?: number; solution_name?: string; status_id?: number; status?: string; sort_order?: number };
