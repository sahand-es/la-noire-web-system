import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function DetectiveBoardPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Detective Board
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: load case evidence + evidence-links, then add UI for linking and layout.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}