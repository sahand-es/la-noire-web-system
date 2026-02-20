import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute: Redirects to login if not authenticated
 */
export function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * GuestRoute: Redirects to dashboard if already authenticated
 * Used for login/register pages
 */
export function GuestRoute({ children }) {
  const token = localStorage.getItem("access_token");
  const user = localStorage.getItem("user");

  if (token && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
