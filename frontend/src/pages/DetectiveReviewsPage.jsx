import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function DetectiveReviewsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Detective Reviews (Sergeant)
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: list detective reports → sergeant approve/reject.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}