import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function IntensivePursuitPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Intensive Pursuit
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: fetch from GET /investigation/intensive-pursuit/ and show ranked list.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}