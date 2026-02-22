import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function RewardsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Rewards
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: list rewards and review flows for officer/detective.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}