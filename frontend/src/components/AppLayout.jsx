import { useEffect, useMemo, useState } from "react";
import { Layout, Button, Typography, Dropdown, Breadcrumb } from "antd";
import { Navbar } from "./Navbar";
import { AppSider } from "./AppSider";
import { NotificationAlertPoller } from "./NotificationAlertPoller";
import {
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { deskLightTokens } from "../theme";

const { Text } = Typography;

function readUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function titleForPath(path) {
  if (path === "/dashboard") return "Dashboard";
  if (path === "/complaints") return "Complaints";
  if (path === "/complaints/new") return "New Complaint";
  if (path.startsWith("/complaints/") && path.endsWith("/edit"))
    return "Edit Complaint";
  if (path === "/cases") return "Cases";
  if (path === "/evidence") return "Evidence";
  if (path === "/evidence-review") return "Evidence Review";
  if (path === "/detective-board") return "Detective Board";
  if (path === "/investigation/intensive-pursuit") return "Intensive Pursuit";
  if (path === "/rewards") return "Rewards";
  if (path === "/rewards/submit") return "Submit Reward";
  if (path === "/reports") return "Reports";
  if (path === "/trials") return "Trials";
  if (path === "/approvals") return "Approvals";
  if (path === "/detective-reviews") return "Detective Reviews";
  if (path === "/statistics") return "Statistics";
  if (path === "/notifications") return "Notifications";
  if (path.startsWith("/admin")) return "Admin";
  return "App";
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(readUser());

  useEffect(() => {
    function onStorage() {
      setUser(readUser());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pageTitle = useMemo(
    () => titleForPath(location.pathname),
    [location.pathname],
  );

  const isOnDashboard = location.pathname === "/dashboard";
  const homeNavConfig = isOnDashboard
    ? { icon: <BankOutlined />, to: "/", label: "Public home" }
    : { icon: <HomeOutlined />, to: "/dashboard", label: "Dashboard" };

  const userMenu = {
    items: [
      {
        key: "profile",
        label: (
          <div className="flex flex-col">
            <Text strong>{user?.username || "User"}</Text>
            <Text type="secondary">{user?.email || ""}</Text>
          </div>
        ),
        icon: <UserOutlined />,
        onClick: () => navigate("/profile"),
      },
      { type: "divider" },
      {
        key: "logout",
        label: "Logout",
        icon: <LogoutOutlined />,
        onClick: () => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          navigate("/login");
        },
      },
    ],
  };

  return (
    <Layout className="h-screen overflow-hidden flex">
      <NotificationAlertPoller />
      <AppSider
        variant="app"
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />

      <Layout className="flex-1 flex flex-col min-h-0 gap-3">
        <Navbar
          start={
            <>
              <Button
                type="text"
                icon={homeNavConfig.icon}
                onClick={() => navigate(homeNavConfig.to)}
                className="shrink-0 transition-all duration-200 hover:opacity-80 active:opacity-70 p-1"
                aria-label={homeNavConfig.label}
              />
              <Breadcrumb
                items={[
                  { title: <Link to="/dashboard">Dashboard</Link> },
                  { title: pageTitle },
                ]}
              />
            </>
          }
          end={
            <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
              <Button
                type="text"
                icon={<UserOutlined />}
                className="text-inherit hover:opacity-90 active:opacity-80"
              >
                {user?.username || "Account"}
              </Button>
            </Dropdown>
          }
        />

        <div
          className="flex-1 min-h-0 overflow-hidden rounded-tl-xl rounded-tr-xl min-w-0 mx-3"
          style={{ background: deskLightTokens.colorBgLayout }}
        >
          <div className="p-6 h-full overflow-auto">
            <Outlet />
          </div>
        </div>
      </Layout>
    </Layout>
  );
}
