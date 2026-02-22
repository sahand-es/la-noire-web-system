import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function StatisticsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Statistics
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: connect to case statistics + public stats.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}