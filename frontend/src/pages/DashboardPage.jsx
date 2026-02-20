import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Row, Col, Typography, Button, Spin } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  FileSearchOutlined,
  ExperimentOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SafetyOutlined,
  AuditOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

// Module definitions for each role
const MODULE_CONFIG = {
  "System Administrator": [
    {
      key: "admin-panel",
      icon: SettingOutlined,
      title: "Admin Panel",
      description: "Full system administration",
      path: "/admin",
    },
    {
      key: "users",
      icon: UserOutlined,
      title: "User Management",
      description: "Manage users and assign roles",
      path: "/users",
    },
    {
      key: "roles",
      icon: TeamOutlined,
      title: "Role Management",
      description: "Manage roles and permissions",
      path: "/roles",
    },
    {
      key: "cases",
      icon: FolderOpenOutlined,
      title: "Cases",
      description: "View all cases",
      path: "/cases",
    },
    {
      key: "statistics",
      icon: BarChartOutlined,
      title: "Statistics",
      description: "System statistics and reports",
      path: "/statistics",
    },
  ],
  "Police Chief": [
    {
      key: "cases",
      icon: FolderOpenOutlined,
      title: "Cases",
      description: "Create and manage cases",
      path: "/cases",
    },
    {
      key: "approvals",
      icon: CheckCircleOutlined,
      title: "Case Approvals",
      description: "Approve critical cases",
      path: "/approvals",
    },
    {
      key: "statistics",
      icon: BarChartOutlined,
      title: "Statistics",
      description: "View case statistics",
      path: "/statistics",
    },
    {
      key: "reports",
      icon: FileTextOutlined,
      title: "Reports",
      description: "Case reports and summaries",
      path: "/reports",
    },
  ],
  Captain: [
    {
      key: "cases",
      icon: FolderOpenOutlined,
      title: "Cases",
      description: "View and manage cases",
      path: "/cases",
    },
    {
      key: "approvals",
      icon: CheckCircleOutlined,
      title: "Case Approvals",
      description: "Approve cases for trial",
      path: "/approvals",
    },
    {
      key: "reports",
      icon: FileTextOutlined,
      title: "Reports",
      description: "Review case reports",
      path: "/reports",
    },
    {
      key: "statistics",
      icon: BarChartOutlined,
      title: "Statistics",
      description: "View case statistics",
      path: "/statistics",
    },
  ],
  Sergeant: [
    {
      key: "cases",
      icon: FolderOpenOutlined,
      title: "Cases",
      description: "Create and manage cases",
      path: "/cases",
    },
    {
      key: "detective-reviews",
      icon: AuditOutlined,
      title: "Detective Reviews",
      description: "Review detective reports",
      path: "/detective-reviews",
    },
    {
      key: "evidence",
      icon: FileSearchOutlined,
      title: "Evidence",
      description: "Add and review evidence",
      path: "/evidence",
    },
    {
      key: "reports",
      icon: FileTextOutlined,
      title: "Reports",
      description: "Case reports",
      path: "/reports",
    },
  ],
  Detective: [
    {
      key: "detective-board",
      icon: SafetyOutlined,
      title: "Detective Board",
      description: "Evidence analysis and linking",
      path: "/detective-board",
    },
    {
      key: "cases",
      icon: FolderOpenOutlined,
      title: "My Cases",
      description: "View assigned cases",
      path: "/cases",
    },
    {
      key: "evidence",
      icon: FileSearchOutlined,
      title: "Evidence",
      description: "Add and search evidence",
      path: "/evidence",
    },
    {
      key: "rewards",
      icon: TrophyOutlined,
      title: "Rewards",
      description: "Review reward information",
      path: "/rewards",
    },
  ],
  "Police Officer": [
    {
      key: "cases",
      icon: FolderOpenOutlined,
      title: "Cases",
      description: "Create cases from crime scenes",
      path: "/cases",
    },
    {
      key: "complaints",
      icon: FileTextOutlined,
      title: "Complaints",
      description: "Review complaints",
      path: "/complaints",
    },
    {
      key: "evidence",
      icon: FileSearchOutlined,
      title: "Evidence",
      description: "Add evidence",
      path: "/evidence",
    },
    {
      key: "rewards",
      icon: TrophyOutlined,
      title: "Rewards",
      description: "Review rewards",
      path: "/rewards",
    },
  ],
  Cadet: [
    {
      key: "complaints",
      icon: FileTextOutlined,
      title: "Complaint Review",
      description: "Review and filter complaints",
      path: "/complaints",
    },
    {
      key: "cases",
      icon: FolderOpenOutlined,
      title: "Cases",
      description: "View cases",
      path: "/cases",
    },
  ],
  Coroner: [
    {
      key: "evidence-review",
      icon: ExperimentOutlined,
      title: "Evidence Review",
      description: "Approve biological evidence",
      path: "/evidence-review",
    },
    {
      key: "evidence",
      icon: FileSearchOutlined,
      title: "Evidence",
      description: "Add evidence",
      path: "/evidence",
    },
  ],
  Judge: [
    {
      key: "trials",
      icon: AuditOutlined,
      title: "Trials",
      description: "Review and judge trials",
      path: "/trials",
    },
  ],
  "Base user": [
    {
      key: "complaints",
      icon: FileTextOutlined,
      title: "File Complaint",
      description: "Submit a complaint",
      path: "/complaints/new",
    },
    {
      key: "rewards",
      icon: TrophyOutlined,
      title: "Rewards",
      description: "Submit reward information",
      path: "/rewards/submit",
    },
  ],
};

export function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error("Failed to parse user data:", err);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center py-8">
            <Title level={4}>Unable to load user data</Title>
            <Text type="secondary">Please try logging in again</Text>
            <div className="mt-4">
              <Button type="primary" onClick={() => navigate("/login")}>
                Go to Login
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Get unique modules for all user roles
  const userModules = [];
  const seenKeys = new Set();

  user.roles?.forEach((role) => {
    const modules = MODULE_CONFIG[role.name] || [];
    modules.forEach((module) => {
      if (!seenKeys.has(module.key)) {
        seenKeys.add(module.key);
        userModules.push(module);
      }
    });
  });

  // If no roles assigned, show base user modules
  if (userModules.length === 0 && MODULE_CONFIG["Base user"]) {
    MODULE_CONFIG["Base user"].forEach((module) => {
      if (!seenKeys.has(module.key)) {
        seenKeys.add(module.key);
        userModules.push(module);
      }
    });
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Title level={2} className="m-0">
              Welcome, {user.first_name} {user.last_name}
            </Title>
            <Text type="secondary">
              {user.roles?.map((r) => r.name).join(", ") || "Base user"}
            </Text>
          </div>
          <Button type="primary" danger onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Modules Grid */}
        {userModules.length > 0 ? (
          <Row gutter={[16, 16]}>
            {userModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={module.key}>
                  <Card
                    hoverable
                    onClick={() => navigate(module.path)}
                    className="h-full"
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <IconComponent className="text-4xl" />
                      <Title level={4} className="m-0">
                        {module.title}
                      </Title>
                      <Text type="secondary">{module.description}</Text>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Card>
            <div className="text-center py-8">
              <Title level={4}>No modules available</Title>
              <Text type="secondary">
                Contact your administrator to assign appropriate roles
              </Text>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
