import { Navigate } from "react-router-dom";

function readUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasRole(user, roleName) {
  return (user?.roles || []).some((r) => r?.name === roleName);
}

function hasAnyRole(user, roles) {
  return roles.some((r) => hasRole(user, r));
}

export function RoleRoute({ roles, children }) {
  const user = readUser();

  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = Boolean(user.is_superuser) || hasRole(user, "System Administrator");
  if (isAdmin) return children;

  if (!roles || roles.length === 0) return children;

  if (!hasAnyRole(user, roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}