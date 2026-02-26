import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Typography, Spin, Alert } from "antd";
import {
  UserOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getCaseStatistics } from "../../api/calls";

const { Title } = Typography;

export function AdminDashboard() {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);
        const stats = await getCaseStatistics();
        setStatistics(stats);
      } catch (err) {
        console.error("Statistics error:", err);
        setError(err?.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Error Loading Dashboard"
        description={error}
        showIcon
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Title level={2}>Admin Dashboard</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Cases"
              value={statistics?.total_cases || 0}
              prefix={<FolderOpenOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Open Cases"
              value={statistics?.open_cases || 0}
              prefix={<FolderOpenOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Solved Cases"
              value={statistics?.solved_cases || 0}
              prefix={<FolderOpenOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Active Users"
              value={statistics?.active_users || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Pending Complaints"
              value={statistics?.pending_complaints || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Rewards"
              value={statistics?.total_rewards || 0}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            hoverable
            className="cursor-pointer"
            onClick={() => navigate("/admin/users")}
          >
            <Title level={5}>User Management</Title>
            <p className="text-sm">Manage users and assign roles</p>
          </Card>
          <Card
            hoverable
            className="cursor-pointer"
            onClick={() => navigate("/admin/cases")}
          >
            <Title level={5}>Case Management</Title>
            <p className="text-sm">View and manage all cases</p>
          </Card>
          <Card
            hoverable
            className="cursor-pointer"
            onClick={() => navigate("/admin/cases")}
          >
            <Title level={5}>Evidence Management</Title>
            <p className="text-sm">Manage all types of evidence</p>
          </Card>
        </div>
      </Card>
    </div>
  );
}
