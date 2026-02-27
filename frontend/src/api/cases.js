import { get, getPublic, post, put } from "./request";

export function listCases(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  if (params.status) qs.set("status", params.status);
  if (params.priority) qs.set("priority", params.priority);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`cases/${suffix}`);
}

export function createCase(body) {
  return post("cases/", body);
}

export function listAllCaseNames() {
  return get("cases/all-names/");
}

export function listCaseSuspectNames(caseId) {
  return getPublic(`cases/${caseId}/suspects/names/`);
}

export function listCaseDetectives() {
  return get("cases/detectives/");
}

export function assignCaseDetective(caseId, detectiveId) {
  return put(`cases/${caseId}/assigned-detective/`, {
    detective_id: detectiveId,
  });
}

export function approveCase(caseId, action, message = "") {
  return post(`cases/${caseId}/approvals/`, { action, message });
}

export function getCaseStatistics() {
  return get("cases/statistics/");
}


export const approveReleaseCase = async (caseId) => {
  try {
    const response = await fetch(`/cases/${caseId}/approve_and_release/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('authToken')}`,  // Ensure authentication token
      },
      body: JSON.stringify({ case_id: caseId }),
    });

    const data = await response.json();
    if (response.ok) {
      return data;  // Return the response data if success
    } else {
      throw new Error(data.error || "Error occurred");
    }
  } catch (error) {
    throw new Error(error.message || "An error occurred while processing the request");
  }
};