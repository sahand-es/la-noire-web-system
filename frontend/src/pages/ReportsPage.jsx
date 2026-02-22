import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function ReportsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Reports
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: case report view for judge/captain/chief (GET case detail/report endpoints).
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}