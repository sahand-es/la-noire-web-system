/**
 * API call functions for the backend. All HTTP goes through request.js.
 * Set API_BASE_URL in .env (e.g. http://127.0.0.1:8000/api/v1).
 */
import {
  get,
  post,
  put,
  patch,
  del,
  getPublic,
  postPublic,
} from "./request.js";

// --- Auth (accounts) ---
export function register(data) {
  return postPublic("auth/registrations/", data);
}

export function login(data) {
  return postPublic("auth/sessions/", data);
}

export function logout() {
  return post("auth/sessions/current/", {});
}

export function getProfile() {
  return get("auth/profile/");
}

export function changePassword(data) {
  return post("auth/password/", data);
}

// --- Roles ---
export function listRoles() {
  return get("roles/");
}

export function getRole(id) {
  return get(`roles/${id}/`);
}

// --- Permissions ---
export function listPermissions() {
  return get("permissions/");
}

export function getPermission(id) {
  return get(`permissions/${id}/`);
}

export function createPermission(data) {
  return post("permissions/", data);
}

export function updatePermission(id, data) {
  return put(`permissions/${id}/`, data);
}

export function deletePermission(id) {
  return del(`permissions/${id}/`);
}

// --- Users ---
export function listUsers() {
  return get("users/");
}

export function getUser(id) {
  return get(`users/${id}/`);
}

export function updateUser(id, data) {
  return put(`users/${id}/`, data);
}

export function deleteUser(id) {
  return del(`users/${id}/`);
}

export function getMe() {
  return get("users/me/");
}

// --- Cases ---
export function listCases() {
  return get("cases/");
}

export function getCase(id) {
  return get(`cases/${id}/`);
}

export function createCase(data) {
  return post("cases/", data);
}

export function getCaseStatistics() {
  return get("cases/statistics/");
}

// --- Complaints ---
export function listComplaints() {
  return get("complaints/");
}

export function getComplaint(id) {
  return get(`complaints/${id}/`);
}

export function createComplaint(data) {
  return post("complaints/", data);
}

// --- Case evidence (cases app) ---
export function listWitnessTestimonies(caseId) {
  return get(`cases/${caseId}/witness-testimonies/`);
}

export function createWitnessTestimony(caseId, data) {
  return post(`cases/${caseId}/witness-testimonies/`, data);
}

export function listBiologicalEvidence(caseId) {
  return get(`cases/${caseId}/biological-evidence/`);
}

export function createBiologicalEvidence(caseId, data) {
  return post(`cases/${caseId}/biological-evidence/`, data);
}

export function coronerApproval(caseId, evidenceId, data) {
  return post(
    `cases/${caseId}/biological-evidence/${evidenceId}/coroner-approvals/`,
    data,
  );
}

export function listVehicleEvidence(caseId) {
  return get(`cases/${caseId}/vehicle-evidence/`);
}

export function createVehicleEvidence(caseId, data) {
  return post(`cases/${caseId}/vehicle-evidence/`, data);
}

export function listDocumentEvidence(caseId) {
  return get(`cases/${caseId}/document-evidence/`);
}

export function createDocumentEvidence(caseId, data) {
  return post(`cases/${caseId}/document-evidence/`, data);
}

export function listOtherEvidence(caseId) {
  return get(`cases/${caseId}/other-evidence/`);
}

export function createOtherEvidence(caseId, data) {
  return post(`cases/${caseId}/other-evidence/`, data);
}

// --- Case investigation (evidence-links, detective-reports, suspect-links, trial) ---
export function listEvidenceLinks(caseId) {
  return get(`cases/${caseId}/investigation/evidence-links/`);
}

export function createEvidenceLink(caseId, data) {
  return post(`cases/${caseId}/investigation/evidence-links/`, data);
}

export function deleteEvidenceLink(caseId, linkId) {
  return del(`cases/${caseId}/investigation/evidence-links/${linkId}/`);
}

export function listDetectiveReports(caseId) {
  return get(`cases/${caseId}/investigation/detective-reports/`);
}

export function createDetectiveReport(caseId, data) {
  return post(`cases/${caseId}/investigation/detective-reports/`, data);
}

export function sergeantReviewReport(caseId, reportId, data) {
  return post(
    `cases/${caseId}/investigation/detective-reports/${reportId}/sergeant-reviews/`,
    data,
  );
}

export function listSuspectLinks(caseId) {
  return get(`cases/${caseId}/investigation/suspect-links/`);
}

export function getSuspectLink(caseId, linkId) {
  return get(`cases/${caseId}/investigation/suspect-links/${linkId}/`);
}

export function detectiveAssessment(caseId, linkId, data) {
  return post(
    `cases/${caseId}/investigation/suspect-links/${linkId}/detective-assessment/`,
    data,
  );
}

export function sergeantAssessment(caseId, linkId, data) {
  return post(
    `cases/${caseId}/investigation/suspect-links/${linkId}/sergeant-assessment/`,
    data,
  );
}

export function captainOpinion(caseId, linkId, data) {
  return post(
    `cases/${caseId}/investigation/suspect-links/${linkId}/captain-opinion/`,
    data,
  );
}

export function chiefApproval(caseId, linkId, data) {
  return post(
    `cases/${caseId}/investigation/suspect-links/${linkId}/chief-approval/`,
    data,
  );
}

export function markSuspectWanted(caseId, linkId) {
  return post(`cases/${caseId}/investigation/suspect-links/${linkId}/mark-as-wanted/`, {});
}

export function markSuspectCaptured(caseId, linkId, data = {}) {
  return post(
    `cases/${caseId}/investigation/suspect-links/${linkId}/mark-as-captured/`,
    data,
  );
}

export function getTrial(caseId) {
  return get(`cases/${caseId}/investigation/trial/`);
}

export function recordVerdict(caseId, data) {
  return post(`cases/${caseId}/investigation/trial/record-verdict/`, data);
}

// --- Investigation (global: notifications, intensive pursuit) ---
export function listNotifications() {
  return get("investigation/notifications/");
}

export function listIntensivePursuit(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`investigation/intensive-pursuit/${suffix}`);
}

// --- Rewards ---
export function listRewards() {
  return get("rewards/");
}

export function getReward(id) {
  return get(`rewards/${id}/`);
}

export function createReward(data) {
  return post("rewards/", data);
}

export function officerReview(rewardId, data) {
  return post(`rewards/${rewardId}/officer-reviews/`, data);
}

export function detectiveReview(rewardId, data) {
  return post(`rewards/${rewardId}/detective-reviews/`, data);
}

export function rewardLookup(nationalId, rewardCode) {
  return get(
    `rewards/lookups/?national_id=${encodeURIComponent(nationalId)}&reward_code=${encodeURIComponent(rewardCode)}`,
  );
}

// --- Public endpoints (no authentication required) ---
export function getPublicStatistics() {
  return getPublic("public/statistics/");
}
