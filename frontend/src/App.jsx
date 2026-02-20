import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./HomePage/Home";
import { Login } from "./Auth/Login";
import { Register } from "./Auth/Register";
import { DashboardPage } from "./pages/DashboardPage";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
