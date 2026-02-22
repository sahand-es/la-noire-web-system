import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function ComplaintsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Complaints
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: list complaints based on role + cadet/officer review actions.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}