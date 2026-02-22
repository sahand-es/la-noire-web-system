import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function EvidenceReviewPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Evidence Review (Coroner)
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: list biological evidence awaiting review + approve/reject.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}