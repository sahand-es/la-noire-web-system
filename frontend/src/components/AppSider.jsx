import { useState, useEffect, useMemo } from "react";
import { Layout, Menu, Typography } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  UserOutlined,
  BellOutlined,
  DashboardOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;
const { Text } = Typography;

const SIDER_WIDTH = 260;

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

function buildAppMenuItems(user) {
  const isAdmin =
    Boolean(user?.is_superuser) || hasRole(user, "System Administrator");

  const items = [
    { key: "/dashboard", icon: <AppstoreOutlined />, label: <Link to="/dashboard">Dashboard</Link> },
    { key: "/complaints", icon: <FileTextOutlined />, label: <Link to="/complaints">Complaints</Link> },
    { key: "/complaints/new", icon: <FolderOpenOutlined />, label: <Link to="/complaints/new">New Complaint</Link> },
    { key: "/investigation/intensive-pursuit", icon: <AimOutlined />, label: <Link to="/investigation/intensive-pursuit">Intensive Pursuit</Link> },
    { key: "/notifications", icon: <BellOutlined />, label: <Link to="/notifications">Notifications</Link> },
  ];

  const isPoliceStaff = hasAnyRole(user, [
    "Police Officer", "Patrol Officer", "Detective", "Sergeant", "Captain", "Police Chief", "Cadet",
  ]);

  if (isPoliceStaff) {
    items.push(
      { key: "/cases", icon: <FolderOpenOutlined />, label: <Link to="/cases">Cases</Link> },
      { key: "/evidence", icon: <ExperimentOutlined />, label: <Link to="/evidence">Evidence</Link> },
    );
  }

  if (hasRole(user, "Coroner")) {
    items.push({ key: "/evidence-review", icon: <SafetyOutlined />, label: <Link to="/evidence-review">Evidence Review</Link> });
  }

  if (hasRole(user, "Detective")) {
    items.push({ key: "/detective-board", icon: <SafetyOutlined />, label: <Link to="/detective-board">Detective Board</Link> });
  }

  if (hasAnyRole(user, ["Judge", "Captain", "Police Chief"])) {
    items.push({ key: "/reports", icon: <FileTextOutlined />, label: <Link to="/reports">Reports</Link> });
  }

  items.push(
    { key: "/rewards", icon: <TrophyOutlined />, label: <Link to="/rewards">Rewards</Link> },
    { key: "/statistics", icon: <BarChartOutlined />, label: <Link to="/statistics">Statistics</Link> },
  );

  if (isAdmin) {
    items.push({ key: "/admin", icon: <SettingOutlined />, label: <Link to="/admin">Admin</Link> });
  }

  return items;
}

const ADMIN_MENU_ITEMS = [
  { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
  {
    key: "accounts",
    icon: <UserOutlined />,
    label: "Accounts",
    children: [
      { key: "/admin/users", label: "Users" },
      { key: "/admin/roles", label: "Roles" },
      { key: "/admin/permissions", label: "Permissions" },
    ],
  },
  {
    key: "cases",
    icon: <FolderOpenOutlined />,
    label: "Case management",
    children: [
      { key: "/admin/cases", label: "Cases" },
      { key: "/admin/complaints", label: "Complaints" },
    ],
  },
  {
    key: "rewards",
    icon: <TrophyOutlined />,
    label: "Rewards",
    children: [{ key: "/admin/rewards", label: "Rewards" }],
  },
];

function getOpenKeysForPath(pathname) {
  if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/permissions")) return ["accounts"];
  if (pathname.startsWith("/admin/cases") || pathname.startsWith("/admin/complaints")) return ["cases"];
  if (pathname.startsWith("/admin/rewards")) return ["rewards"];
  return [];
}

function getAppSelectedKey(pathname) {
  if (pathname.startsWith("/complaints/") && pathname !== "/complaints/new") return "/complaints";
  if (pathname.startsWith("/admin")) return "/admin";
  return pathname;
}

export function AppSider({ variant, collapsed, onCollapse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(readUser());
  const [openKeys, setOpenKeys] = useState([]);

  useEffect(() => {
    function onStorage() {
      setUser(readUser());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (variant === "admin") {
      setOpenKeys((prev) => {
        const pathKeys = getOpenKeysForPath(location.pathname);
        const merged = [...new Set([...prev, ...pathKeys])];
        return merged.length ? merged : prev;
      });
    }
  }, [variant, location.pathname]);

  const menuItems = useMemo(() => {
    return variant === "app" ? buildAppMenuItems(user) : ADMIN_MENU_ITEMS;
  }, [variant, user]);

  const selectedKeys = useMemo(() => {
    return variant === "app" ? [getAppSelectedKey(location.pathname)] : [location.pathname];
  }, [variant, location.pathname]);

  const titleLink = variant === "app" ? "/dashboard" : "/admin";
  const subtitle = variant === "app" ? "Police Department" : "Admin";

  return (
    <Sider
      theme="light"
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={SIDER_WIDTH}
    >
      <div className="p-4 overflow-hidden">
        {collapsed ? (
          <div className="flex justify-center font-semibold text-lg">L.A.</div>
        ) : (
          <Link to={titleLink} className="no-underline block">
            <Text strong className="block">L.A. Noire System</Text>
            <Text type="secondary" className="block text-sm">{subtitle}</Text>
          </Link>
        )}
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={variant === "admin" ? openKeys : undefined}
        onOpenChange={variant === "admin" ? setOpenKeys : undefined}
        onClick={variant === "admin" ? ({ key }) => navigate(key) : undefined}
        items={menuItems}
      />
    </Sider>
  );
}
