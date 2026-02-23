import { get } from "./request";

export function listReportCases(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`cases/${suffix}`);
}

export function getCaseReport(caseId) {
  // This assumes your backend has a report endpoint under cases.
  // If not, we will use case detail + evidence endpoints (fallback).
  return get(`cases/${caseId}/report/`);
}