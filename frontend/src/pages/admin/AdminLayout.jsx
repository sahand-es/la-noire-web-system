import { useState, useEffect } from "react";
import { Layout, Menu, Typography, Button } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  UserOutlined,
  FolderOpenOutlined,
  TrophyOutlined,
  LogoutOutlined,
  DashboardOutlined,
  LeftOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const ADMIN_MENU_ITEMS = [
  {
    key: "/admin",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
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

function getOpenKeyForPath(pathname) {
  if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/permissions")) return ["accounts"];
  if (pathname.startsWith("/admin/cases") || pathname.startsWith("/admin/complaints")) return ["cases"];
  if (pathname.startsWith("/admin/rewards")) return ["rewards"];
  return [];
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpenKeys((prev) => {
      const pathKeys = getOpenKeyForPath(location.pathname);
      const merged = [...new Set([...prev, ...pathKeys])];
      return merged.length ? merged : prev;
    });
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <Layout className="h-screen overflow-hidden flex">
      <Sider
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={250}
      >
        <div className="p-4 flex items-center justify-center">
          <Title level={4} className="m-0">
            {collapsed ? "LA" : "LA Noire Admin"}
          </Title>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={ADMIN_MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout className="flex-1 flex flex-col min-h-0">
        <Header className="flex justify-between items-center px-6 shrink-0">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate("/dashboard")}
          >
            Back to app
          </Button>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Header>
        <Content className="p-6 overflow-auto flex-1 min-h-0">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
