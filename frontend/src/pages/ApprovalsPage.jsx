import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function ApprovalsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Approvals
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: captain/chief approvals based on case status and crime level.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}