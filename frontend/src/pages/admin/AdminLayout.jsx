import { useState } from "react";
import { Layout, Menu, Typography, Button } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  UserOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  TrophyOutlined,
  HomeOutlined,
  LogoutOutlined,
  DashboardOutlined,
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
    label: "Cases",
    children: [
      { key: "/admin/cases", label: "Cases" },
      { key: "/admin/complaints", label: "Complaints" },
    ],
  },
  {
    key: "evidence",
    icon: <ExperimentOutlined />,
    label: "Evidence",
    children: [
      { key: "/admin/witness-testimonies", label: "Witness Testimonies" },
      { key: "/admin/biological-evidence", label: "Biological Evidence" },
      { key: "/admin/vehicle-evidence", label: "Vehicle Evidence" },
      { key: "/admin/document-evidence", label: "Document Evidence" },
      { key: "/admin/other-evidence", label: "Other Evidence" },
    ],
  },
  {
    key: "investigation",
    icon: <FileTextOutlined />,
    label: "Investigation",
    children: [
      { key: "/admin/evidence-links", label: "Evidence Links" },
      { key: "/admin/detective-reports", label: "Detective Reports" },
      { key: "/admin/suspect-links", label: "Suspect Links" },
      { key: "/admin/trials", label: "Trials" },
    ],
  },
  {
    key: "rewards",
    icon: <TrophyOutlined />,
    label: "Rewards",
    children: [{ key: "/admin/rewards", label: "Rewards" }],
  },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={250}
      >
        <div className="p-4 flex items-center justify-center">
          <Title level={4} className="m-0 text-white">
            {collapsed ? "LA" : "LA Noire Admin"}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={["accounts", "cases", "evidence", "investigation"]}
          items={ADMIN_MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="flex justify-between items-center px-6">
          <div className="flex gap-4">
            <Button icon={<HomeOutlined />} onClick={() => navigate("/")}>
              Home
            </Button>
            <Button
              icon={<DashboardOutlined />}
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </Button>
          </div>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Header>
        <Content className="m-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
