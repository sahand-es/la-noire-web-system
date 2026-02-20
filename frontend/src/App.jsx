import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./HomePage/Home";
import { Login } from "./Auth/Login";
import { Register } from "./Auth/Register";
import { DashboardPage } from "./pages/DashboardPage";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UsersAdmin } from "./pages/admin/UsersAdmin";
import { RolesAdmin } from "./pages/admin/RolesAdmin";
import { PermissionsAdmin } from "./pages/admin/PermissionsAdmin";
import { CasesAdmin } from "./pages/admin/CasesAdmin";
import { ComplaintsAdmin } from "./pages/admin/ComplaintsAdmin";
import { RewardsAdmin } from "./pages/admin/RewardsAdmin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="roles" element={<RolesAdmin />} />
          <Route path="permissions" element={<PermissionsAdmin />} />
          <Route path="cases" element={<CasesAdmin />} />
          <Route path="complaints" element={<ComplaintsAdmin />} />
          <Route path="rewards" element={<RewardsAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
