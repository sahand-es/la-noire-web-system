import { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Descriptions,
  Table,
  message,
} from "antd";
import { getCaseStatistics } from "../api/cases";

const { Title } = Typography;

export function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await getCaseStatistics();
      setStats(data);
    } catch (err) {
      message.error(err.message || "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  }

  const priorityRows =
    stats && stats.cases_by_priority
      ? Object.entries(stats.cases_by_priority).map(([priority, count]) => ({
          key: priority,
          priority,
          count,
        }))
      : [];

  const statusRows =
    stats && stats.cases_by_status
      ? Object.entries(stats.cases_by_status).map(([status, count]) => ({
          key: status,
          status,
          count,
        }))
      : [];

  const small = { xs: 24, sm: 12, md: 8, lg: 6 };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <Title level={3} className="m-0">
              Statistics
            </Title>
          </div>

          {loading || !stats ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : (
            <div>
              <Row gutter={[16, 16]} className="mb-4">
                <Col {...small}>
                  <Card>
                    <Statistic title="Total Cases" value={stats.total_cases} />
                  </Card>
                </Col>
                <Col {...small}>
                  <Card>
                    <Statistic
                      title="Solved Cases"
                      value={stats.solved_cases}
                    />
                  </Card>
                </Col>
                <Col {...small}>
                  <Card>
                    <Statistic
                      title="Active Cases"
                      value={stats.active_cases}
                    />
                  </Card>
                </Col>
                <Col {...small}>
                  <Card>
                    <Statistic title="Open Cases" value={stats.open_cases} />
                  </Card>
                </Col>
                <Col {...small}>
                  <Card>
                    <Statistic
                      title="Under Investigation"
                      value={stats.under_investigation_cases}
                    />
                  </Card>
                </Col>
                <Col {...small}>
                  <Card>
                    <Statistic
                      title="Closed Cases"
                      value={stats.closed_cases}
                    />
                  </Card>
                </Col>
              </Row>

              <Card title="Cases by Priority" className="mb-4">
                <Table
                  dataSource={priorityRows}
                  pagination={false}
                  columns={[
                    {
                      title: "Priority",
                      dataIndex: "priority",
                      key: "priority",
                    },
                    { title: "Count", dataIndex: "count", key: "count" },
                  ]}
                  rowKey="key"
                />
              </Card>

              <Card title="Cases by Status">
                <Table
                  dataSource={statusRows}
                  pagination={false}
                  columns={[
                    { title: "Status", dataIndex: "status", key: "status" },
                    { title: "Count", dataIndex: "count", key: "count" },
                  ]}
                  rowKey="key"
                />
              </Card>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
