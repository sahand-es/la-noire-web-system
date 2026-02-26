import { useState, useEffect } from "react";
import { Layout, Menu, Typography, Button, Dropdown, Breadcrumb } from "antd";
import { Navbar } from "../../components/Navbar";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  UserOutlined,
  FolderOpenOutlined,
  TrophyOutlined,
  DashboardOutlined,
  HomeOutlined,
  AppstoreOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

const { Sider, Content } = Layout;
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
  const [openKeys, setOpenKeys] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const adminPageTitle = adminTitleForPath(location.pathname);
  const isOnAdminDashboard = location.pathname === "/admin";
  const adminHomeNavConfig = isOnAdminDashboard
    ? { icon: <AppstoreOutlined />, to: "/dashboard", label: "Back to app" }
    : { icon: <HomeOutlined />, to: "/admin", label: "Admin dashboard" };

  useEffect(() => {
    setOpenKeys((prev) => {
      const pathKeys = getOpenKeyForPath(location.pathname);
      const merged = [...new Set([...prev, ...pathKeys])];
      return merged.length ? merged : prev;
    });
  }, [location.pathname]);

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
            <Dropdown
              menu={{
                items: [
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
              }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Button icon={<UserOutlined />}>Account</Button>
            </Dropdown>
          }
        />
        <Content className="p-6 overflow-auto flex-1 min-h-0">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
