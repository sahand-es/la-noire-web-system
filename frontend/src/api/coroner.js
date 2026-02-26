import { get, post } from "./request";
import { listCases } from "./calls";

// The backend exposes coroner approvals as a nested action under each case's
// biological-evidence resource. There is no global "coroner-approvals" list
// endpoint, so build a simple client-side aggregator: list cases, fetch each
// case's biological evidence and flatten results. This is acceptable for
// admin/coroner UIs with moderate data volumes.
export async function listCoronerQueue(params = {}) {
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  // Fetch cases (paginated) then fetch biological evidence for each case.
  const cases = await listCases();
  const allResults = [];

  // For each case, fetch its biological evidence and include case context
  await Promise.all(
    (Array.isArray(cases) ? cases : cases?.results || []).map(async (c) => {
      try {
        const ev = await get(`cases/${c.id}/biological-evidence/`);
        const rows = Array.isArray(ev) ? ev : ev?.results || [];
        rows.forEach((r) => {
          r.case = c.id;
          r.case_number = c.case_number || c.id;
          allResults.push(r);
        });
      } catch (e) {
        // ignore per-case errors to allow other cases to surface
        // console.warn(`Failed to load bio evidence for case ${c.id}`, e);
      }
    }),
  );

  // Simple pagination on the aggregated results
  const start = (page - 1) * pageSize;
  const paged = allResults.slice(start, start + pageSize);
  return { results: paged, count: allResults.length };
}

export function submitCoronerDecision(evidenceId, body) {
  // submit decision expects a POST against the evidence detail nested under its case
  // caller currently passes the evidence ID only; backend requires case id as well
  // so frontend pages must pass evidenceId which equals resource id within a case
  // and the backend route expects cases/<case_pk>/biological-evidence/<pk>/coroner-approvals/
  // To submit we assume the caller will pass the evidence object's `case` field
  // and `id` (pk). For simplicity include both forms: if body.case is provided use it,
  // otherwise try to parse evidenceId as an object { case, id }.
  if (typeof evidenceId === "object" && evidenceId !== null) {
    const { case: caseId, id } = evidenceId;
    return post(
      `cases/${caseId}/biological-evidence/${id}/coroner-approvals/`,
      body,
    );
  }
  // fallback: caller only provided numeric id — POST to top-level path will 404;
  // keep existing behavior to fail visibly so callers can be adjusted.
  return post(
    `cases/biological-evidence/${evidenceId}/coroner-approvals/`,
    body,
  );
}
