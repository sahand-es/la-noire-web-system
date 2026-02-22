import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function TrialsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Trials
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: judge selects a case → view trial → record verdict.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}