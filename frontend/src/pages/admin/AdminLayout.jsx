import { useEffect, useState } from "react";
import { Layout, Button, Typography, Dropdown, Breadcrumb } from "antd";
import { Navbar } from "../../components/Navbar";
import { AppSider } from "../../components/AppSider";
import { NotificationAlertPoller } from "../../components/NotificationAlertPoller";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { deskLightTokens } from "../../theme";
import {
  UserOutlined,
  HomeOutlined,
  AppstoreOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

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

function adminTitleForPath(pathname) {
  if (pathname === "/admin") return "Dashboard";
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname.startsWith("/admin/roles")) return "Roles";
  if (pathname.startsWith("/admin/permissions")) return "Permissions";
  if (pathname.startsWith("/admin/cases")) return "Cases";
  if (pathname.startsWith("/admin/complaints")) return "Complaints";
  if (pathname.startsWith("/admin/rewards")) return "Rewards";
  return "Admin";
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(readUser());
  const navigate = useNavigate();
  const location = useLocation();
  const adminPageTitle = adminTitleForPath(location.pathname);
  const isOnAdminDashboard = location.pathname === "/admin";
  const adminHomeNavConfig = isOnAdminDashboard
    ? { icon: <AppstoreOutlined />, to: "/dashboard", label: "Back to app" }
    : { icon: <HomeOutlined />, to: "/admin", label: "Admin dashboard" };

  useEffect(() => {
    function onStorage() {
      setUser(readUser());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
          localStorage.removeItem("refresh_token");
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
        variant="admin"
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />
      <Layout className="flex-1 flex flex-col min-h-0 gap-3">
        <Navbar
          start={
            <>
              <Button
                type="text"
                icon={adminHomeNavConfig.icon}
                onClick={() => navigate(adminHomeNavConfig.to)}
                className="shrink-0 transition-all duration-200 hover:opacity-80 active:opacity-70 p-1"
                aria-label={adminHomeNavConfig.label}
              />
              <Breadcrumb
                items={[
                  { title: <Link to="/admin">Admin</Link> },
                  { title: adminPageTitle },
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
