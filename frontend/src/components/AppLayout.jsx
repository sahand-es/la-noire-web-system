import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Button, Typography, Dropdown, Breadcrumb } from "antd";
import {
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
  BellOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

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
  const isAdmin =
    Boolean(user?.is_superuser) || hasRole(user, "System Administrator");

  const items = [
    {
      key: "/dashboard",
      icon: <AppstoreOutlined />,
      label: <Link to="/dashboard">Dashboard</Link>,
    },

    {
      key: "/complaints",
      icon: <FileTextOutlined />,
      label: <Link to="/complaints">Complaints</Link>,
    },
    {
      key: "/complaints/new",
      icon: <FolderOpenOutlined />,
      label: <Link to="/complaints/new">New Complaint</Link>,
    },

    {
      key: "/investigation/intensive-pursuit",
      icon: <AimOutlined />,
      label: (
        <Link to="/investigation/intensive-pursuit">Intensive Pursuit</Link>
      ),
    },

    {
      key: "/notifications",
      icon: <BellOutlined />,
      label: <Link to="/notifications">Notifications</Link>,
    },
  ];

  const isPoliceStaff = hasAnyRole(user, [
    "Police Officer",
    "Patrol Officer",
    "Detective",
    "Sergeant",
    "Captain",
    "Police Chief",
    "Cadet",
  ]);

  if (isPoliceStaff) {
    items.push(
      {
        key: "/cases",
        icon: <FolderOpenOutlined />,
        label: <Link to="/cases">Cases</Link>,
      },
      {
        key: "/evidence",
        icon: <ExperimentOutlined />,
        label: <Link to="/evidence">Evidence</Link>,
      },
    );
  }

  if (hasRole(user, "Coroner")) {
    items.push({
      key: "/evidence-review",
      icon: <SafetyOutlined />,
      label: <Link to="/evidence-review">Evidence Review</Link>,
    });
  }

  if (hasRole(user, "Detective")) {
    items.push({
      key: "/detective-board",
      icon: <SafetyOutlined />,
      label: <Link to="/detective-board">Detective Board</Link>,
    });
  }

  if (hasAnyRole(user, ["Judge", "Captain", "Police Chief"])) {
    items.push({
      key: "/reports",
      icon: <FileTextOutlined />,
      label: <Link to="/reports">Reports</Link>,
    });
  }

  items.push(
    {
      key: "/rewards",
      icon: <TrophyOutlined />,
      label: <Link to="/rewards">Rewards</Link>,
    },
    {
      key: "/statistics",
      icon: <BarChartOutlined />,
      label: <Link to="/statistics">Statistics</Link>,
    },
  );

  if (isAdmin) {
    items.push({
      key: "/admin",
      icon: <SettingOutlined />,
      label: <Link to="/admin">Admin</Link>,
    });
  }

  return items;
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

  const menuItems = useMemo(() => buildMenuItems(user), [user]);

  const selectedKey = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/complaints/") && path !== "/complaints/new")
      return "/complaints";
    if (path.startsWith("/admin")) return "/admin";
    return path;
  }, [location.pathname]);

  const pageTitle = useMemo(
    () => titleForPath(location.pathname),
    [location.pathname],
  );

  const showBack = useMemo(() => {
    const p = location.pathname;
    return p !== "/dashboard";
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
      <Sider
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
      >
        <div className="px-4 py-4">
          <Link to="/dashboard" className="no-underline">
            <Text strong className="block">
              L.A. Noire System
            </Text>
            <Text type="secondary" className="block">
              Police Department
            </Text>
          </Link>
        </div>

        <Menu theme="light" mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
      </Sider>

      <Layout className="flex-1 flex flex-col min-h-0">
        <Header className="flex items-center justify-between px-4 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {showBack ? (
                <Button onClick={() => navigate(-1)}>Back</Button>
              ) : null}
              <Breadcrumb
                items={[
                  { title: <Link to="/dashboard">Dashboard</Link> },
                  { title: pageTitle },
                ]}
              />
            </div>
            <Title level={5} className="m-0">
              {pageTitle}
            </Title>
          </div>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
            <Button icon={<UserOutlined />}>
              {user?.username || "Account"}
            </Button>
          </Dropdown>
        </Header>

        <Content className="p-6 overflow-auto flex-1 min-h-0">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
