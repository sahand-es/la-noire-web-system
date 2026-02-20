import { useEffect, useState } from "react";
import {
  Card,
  Statistic,
  Row,
  Col,
  Typography,
  Spin,
  Alert,
  Button,
} from "antd";
import {
  CheckCircleOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getPublicStatistics } from "../api/calls";

const { Title, Paragraph } = Typography;

export function Home() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const isLoggedIn =
    localStorage.getItem("access_token") && localStorage.getItem("user");

  useEffect(() => {
    async function fetchStatistics() {
      try {
        setLoading(true);
        setError(null);

        const stats = await getPublicStatistics();

        setStatistics({
          solvedCases: stats?.solved_cases || 0,
          activeCases: stats?.active_cases || 0,
          totalEmployees: stats?.total_employees || 0,
          totalCases: stats?.total_cases || 0,
        });
      } catch (err) {
        setError(err?.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    }

    fetchStatistics();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-4">
            <Title level={1}>Welcome to La Noire Web System</Title>
          </div>

          <div className="flex gap-4">
            {isLoggedIn ? (
              <Button
                type="primary"
                size="large"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate("/register")}
                >
                  Register
                </Button>
                <Button size="large" onClick={() => navigate("/login")}>
                  Login
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Introduction */}
        <Card>
          <div className="flex flex-col gap-4">
            <Title level={2}>About the Los Angeles Police Department</Title>

            <Paragraph>
              The La Noire Web System serves as the digital backbone of the Los
              Angeles Police Department, streamlining case management, evidence
              tracking, and investigative operations. Our department is
              committed to maintaining law and order through systematic
              investigation, evidence-based prosecution, and community safety.
            </Paragraph>

            <Paragraph>
              <strong>Core Duties:</strong> Criminal investigation and case
              resolution, evidence collection and forensic analysis, witness
              testimony management, suspect identification and tracking,
              coordination with coroners and forensic specialists, trial
              preparation and judicial support, and interdepartmental
              collaboration to ensure justice is served efficiently and
              effectively.
            </Paragraph>
          </div>
        </Card>

        {/* Statistics */}
        <div className="flex flex-col gap-6">
          <Title level={2}>Department Statistics</Title>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : error ? (
            <Alert
              message="Error Loading Statistics"
              description={error}
              type="error"
              showIcon
            />
          ) : (
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} lg={8}>
                <Card hoverable className="h-full">
                  <div className="flex flex-col gap-4">
                    <Statistic
                      title="Solved Cases"
                      value={statistics?.solvedCases}
                      prefix={<CheckCircleOutlined />}
                    />
                    <Paragraph className="m-0">
                      Successfully closed investigations
                    </Paragraph>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Card hoverable className="h-full">
                  <div className="flex flex-col gap-4">
                    <Statistic
                      title="Active Cases"
                      value={statistics?.activeCases}
                      prefix={<FolderOpenOutlined />}
                    />
                    <Paragraph className="m-0">
                      Currently under investigation
                    </Paragraph>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Card hoverable className="h-full">
                  <div className="flex flex-col gap-4">
                    <Statistic
                      title="Organization Employees"
                      value={statistics?.totalEmployees}
                      prefix={<TeamOutlined />}
                    />
                    <Paragraph className="m-0">
                      Active department personnel
                    </Paragraph>
                  </div>
                </Card>
              </Col>
            </Row>
          )}
        </div>
      </div>
    </div>
  );
}
