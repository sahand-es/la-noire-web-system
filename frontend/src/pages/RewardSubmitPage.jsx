import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function RewardSubmitPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Submit Reward Information
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: submit tip → officer review → detective approval → unique code.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}