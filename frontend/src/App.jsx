import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./HomePage/Home";
import { Login } from "./Auth/Login";
import { Register } from "./Auth/Register";
import { DashboardPage } from "./pages/DashboardPage";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";

import { AppLayout } from "./components/AppLayout";

import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UsersAdmin } from "./pages/admin/UsersAdmin";
import { RolesAdmin } from "./pages/admin/RolesAdmin";
import { PermissionsAdmin } from "./pages/admin/PermissionsAdmin";
import { CasesAdmin } from "./pages/admin/CasesAdmin";
import { ComplaintsAdmin } from "./pages/admin/ComplaintsAdmin";
import { RewardsAdmin } from "./pages/admin/RewardsAdmin";

import { CasesPage } from "./pages/CasesPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { NewComplaintPage } from "./pages/NewComplaintPage";
import { EditComplaintPage } from "./pages/EditComplaintPage";
import { EvidencePage } from "./pages/EvidencePage";
import { EvidenceReviewPage } from "./pages/EvidenceReviewPage";
import { RewardsPage } from "./pages/RewardsPage";
import { RewardSubmitPage } from "./pages/RewardSubmitPage";
import { IntensivePursuitPage } from "./pages/IntensivePursuitPage";
import { DetectiveBoardPage } from "./pages/DetectiveBoardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { TrialsPage } from "./pages/TrialsPage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { DetectiveReviewsPage } from "./pages/DetectiveReviewsPage";
import { StatisticsPage } from "./pages/StatisticsPage";

import { RoleRoute } from "./components/RoleRoute";


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

        {/* All authenticated pages share the AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

         <Route
            path="/cases"
            element={
              <RoleRoute roles={["Cadet","Police Officer","Patrol Officer","Detective","Sergeant","Captain","Police Chief"]}>
                <CasesPage />
              </RoleRoute>
            }
          />

          <Route path="/complaints" element={<ComplaintsPage />} />
          <Route path="/complaints/new" element={<NewComplaintPage />} />
          <Route path="/complaints/:id/edit" element={<EditComplaintPage />} />

          <Route
            path="/evidence"
            element={
              <RoleRoute roles={["Police Officer","Patrol Officer","Detective","Sergeant","Captain","Police Chief"]}>
                <EvidencePage />
              </RoleRoute>
            }
          />

          
          <Route
            path="/evidence-review"
            element={
              <RoleRoute roles={["Coroner"]}>
                <EvidenceReviewPage />
              </RoleRoute>
            }
          />

          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/rewards/submit" element={<RewardSubmitPage />} />

          <Route
            path="/detective-board"
            element={
              <RoleRoute roles={["Detective"]}>
                <DetectiveBoardPage />
              </RoleRoute>
            }
          />    

          
          <Route path="/investigation/intensive-pursuit" element={<IntensivePursuitPage />} />

          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/trials" element={<TrialsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/detective-reviews" element={<DetectiveReviewsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />

          {/* Admin nested routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersAdmin />} />
            <Route path="roles" element={<RolesAdmin />} />
            <Route path="permissions" element={<PermissionsAdmin />} />
            <Route path="cases" element={<CasesAdmin />} />
            <Route path="complaints" element={<ComplaintsAdmin />} />
            <Route path="rewards" element={<RewardsAdmin />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;