import { get, post, del } from "./request";

export function listContentTypes() {
  return get("investigation/content-types/");
}

export function listEvidenceLinks(caseId) {
  return get(`cases/${caseId}/investigation/evidence-links/`);
}

export function createEvidenceLink(caseId, body) {
  return post(`cases/${caseId}/investigation/evidence-links/`, body);
}

export function deleteEvidenceLink(caseId, linkId) {
  return del(`cases/${caseId}/investigation/evidence-links/${linkId}/`);
}

// Detective reports (detective -> sergeant review)
export function listDetectiveReports(caseId) {
  return get(`cases/${caseId}/investigation/detective-reports/`);
}

export function createDetectiveReport(caseId, body) {
  return post(`cases/${caseId}/investigation/detective-reports/`, body);
}

export function sergeantReviewDetectiveReport(caseId, reportId, body) {
  return post(
    `cases/${caseId}/investigation/detective-reports/${reportId}/sergeant-reviews/`,
    body,
  );
}

// Suspect links & assessments
export function listSuspectLinks(caseId) {
  return get(`cases/${caseId}/investigation/suspect-links/`);
}

export function getSuspectLink(caseId, linkId) {
  return get(`cases/${caseId}/investigation/suspect-links/${linkId}/`);
}

export function createSuspectLink(caseId, body) {
  return post(`cases/${caseId}/investigation/suspect-links/`, body);
}

export function assessSuspectAsDetective(caseId, linkId, body) {
  return post(
    `cases/${caseId}/investigation/suspect-links/${linkId}/detective-assessment/`,
    body,
  );
}

export function assessSuspectAsSergeant(caseId, linkId, body) {
  return post(
    `cases/${caseId}/investigation/suspect-links/${linkId}/sergeant-assessment/`,
    body,
  );
}
