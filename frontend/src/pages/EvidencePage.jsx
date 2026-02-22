import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function EvidencePage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Evidence
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: choose a case, then CRUD nested evidence endpoints.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}