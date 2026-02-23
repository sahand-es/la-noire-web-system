import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Button, Typography, Dropdown } from "antd";
import {
  HomeOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ExperimentOutlined,
  AimOutlined,
  TrophyOutlined,
  BarChartOutlined,
  SafetyOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;
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

function hasRole(user, roleName) {
  return (user?.roles || []).some((r) => r?.name === roleName);
}

function hasAnyRole(user, roles) {
  return roles.some((r) => hasRole(user, r));
}

function buildMenuItems(user) {
  const isAdmin = Boolean(user?.is_superuser) || hasRole(user, "System Administrator");

  const items = [
    { key: "/dashboard", icon: <AppstoreOutlined />, label: <Link to="/dashboard">Dashboard</Link> },

    { key: "/complaints", icon: <FileTextOutlined />, label: <Link to="/complaints">Complaints</Link> },
    { key: "/complaints/new", icon: <FolderOpenOutlined />, label: <Link to="/complaints/new">New Complaint</Link> },

    { key: "/cases", icon: <FolderOpenOutlined />, label: <Link to="/cases">Cases</Link> },
    { key: "/evidence", icon: <ExperimentOutlined />, label: <Link to="/evidence">Evidence</Link> },

    { key: "/investigation/intensive-pursuit", icon: <AimOutlined />, label: <Link to="/investigation/intensive-pursuit">Intensive Pursuit</Link> },

    { key: "/rewards", icon: <TrophyOutlined />, label: <Link to="/rewards">Rewards</Link> },
    { key: "/statistics", icon: <BarChartOutlined />, label: <Link to="/statistics">Statistics</Link> },
  ];

  // Coroner-only (or roles you decide)
  if (hasRole(user, "Coroner")) {
    items.push({
      key: "/evidence-review",
      icon: <SafetyOutlined />,
      label: <Link to="/evidence-review">Evidence Review</Link>,
    });
  }

  // Detective-only modules (later we’ll build the real pages)
  if (hasRole(user, "Detective")) {
    items.push({
      key: "/detective-board",
      icon: <SafetyOutlined />,
      label: <Link to="/detective-board">Detective Board</Link>,
    });
  }

  // Admin area
  if (isAdmin) {
    items.push({
      key: "/admin",
      icon: <SettingOutlined />,
      label: <Link to="/admin">Admin</Link>,
    });
  }

  return items;
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

  const menuItems = useMemo(() => buildMenuItems(user), [user]);

  const selectedKey = useMemo(() => {
    const path = location.pathname;
    // Highlight parent items for nested routes
    if (path.startsWith("/complaints/") && path !== "/complaints/new") return "/complaints";
    if (path.startsWith("/admin")) return "/admin";
    return path;
  }, [location.pathname]);

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
        disabled: true,
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
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
      >
        <div className="px-4 py-4">
          <Link to="/" className="no-underline">
            <Text strong className="block">
              L.A. Noire System
            </Text>
            <Text type="secondary" className="block">
              Police Department
            </Text>
          </Link>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate(-1)}>Back</Button>
            <Button onClick={() => navigate("/dashboard")}>Home</Button>
          </div>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
            <Button icon={<UserOutlined />}>
              {user?.username || "Account"}
            </Button>
          </Dropdown>
        </Header>

        <Content className="p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}