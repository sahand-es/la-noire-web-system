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

import { CasesPage } from "./pages/CasesPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { NewComplaintPage } from "./pages/NewComplaintPage";
import { EvidencePage } from "./pages/EvidencePage";
import { RewardsPage } from "./pages/RewardsPage";
import { RewardSubmitPage } from "./pages/RewardSubmitPage";
import { IntensivePursuitPage } from "./pages/IntensivePursuitPage";
import { DetectiveBoardPage } from "./pages/DetectiveBoardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { TrialsPage } from "./pages/TrialsPage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { DetectiveReviewsPage } from "./pages/DetectiveReviewsPage";
import { EvidenceReviewPage } from "./pages/EvidenceReviewPage";
import { StatisticsPage } from "./pages/StatisticsPage";

import { EditComplaintPage } from "./pages/EditComplaintPage";

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

        {/* Main app pages (non-admin) */}
        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <CasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints"
          element={
            <ProtectedRoute>
              <ComplaintsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints/new"
          element={
            <ProtectedRoute>
              <NewComplaintPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evidence"
          element={
            <ProtectedRoute>
              <EvidencePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evidence-review"
          element={
            <ProtectedRoute>
              <EvidenceReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rewards"
          element={
            <ProtectedRoute>
              <RewardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rewards/submit"
          element={
            <ProtectedRoute>
              <RewardSubmitPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/detective-board"
          element={
            <ProtectedRoute>
              <DetectiveBoardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investigation/intensive-pursuit"
          element={
            <ProtectedRoute>
              <IntensivePursuitPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trials"
          element={
            <ProtectedRoute>
              <TrialsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <ApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/detective-reviews"
          element={
            <ProtectedRoute>
              <DetectiveReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <StatisticsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
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
      
      <Route
        path="/complaints/:id/edit"
        element={
          <ProtectedRoute>
            <EditComplaintPage />
          </ProtectedRoute>
        }
      />
    </BrowserRouter>
  );
  
}

export default App;