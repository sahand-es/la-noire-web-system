import { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Typography, Spin, Alert } from 'antd';
import { 
  CheckCircleOutlined, 
  TeamOutlined, 
  FolderOpenOutlined,
  SafetyCertificateOutlined 
} from '@ant-design/icons';
import { getPublicStatistics } from '../api/calls';

const { Title, Paragraph } = Typography;

export const Home = () => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const stats = await getPublicStatistics();
        
        setStatistics({
          solvedCases: stats.solved_cases || 0,
          activeCases: stats.active_cases || 0,
          totalEmployees: stats.total_employees || 0,
          totalCases: stats.total_cases || 0,
        });
      } catch (err) {
        setError(err.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F7F1E8] to-[#FBF6EE] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <Title level={1} className="text-5xl! mb-4!" style={{ color: '#231F18' }}>
            Welcome to La Noire Web System
          </Title>
          <SafetyCertificateOutlined style={{ fontSize: '64px', color: '#A37B2C', marginBottom: '24px' }} />
        </div>

        {/* Introduction Section */}
        <Card 
          className="mb-8 shadow-lg"
          style={{ 
            borderColor: '#E2D6C8',
            backgroundColor: '#FBF6EE'
          }}
        >
          <Title level={2} style={{ color: '#A37B2C' }}>
            About the Los Angeles Police Department
          </Title>
          <Paragraph style={{ fontSize: '16px', lineHeight: '1.8', color: '#231F18' }}>
            The La Noire Web System serves as the digital backbone of the Los Angeles Police Department, 
            streamlining case management, evidence tracking, and investigative operations. Our department 
            is committed to maintaining law and order through systematic investigation, evidence-based 
            prosecution, and community safety.
          </Paragraph>
          <Paragraph style={{ fontSize: '16px', lineHeight: '1.8', color: '#231F18' }}>
            <strong>Core Duties:</strong> Criminal investigation and case resolution, evidence collection 
            and forensic analysis, witness testimony management, suspect identification and tracking, 
            coordination with coroners and forensic specialists, trial preparation and judicial support, 
            and interdepartmental collaboration to ensure justice is served efficiently and effectively.
          </Paragraph>
        </Card>

        {/* Statistics Section */}
        <Title level={2} className="mb-6!" style={{ color: '#231F18' }}>
          Department Statistics
        </Title>

        {loading ? (
          <div className="text-center py-12">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert 
            message="Error Loading Statistics" 
            description={error} 
            type="error" 
            showIcon 
          />
        ) : (
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable
                className="shadow-lg"
                style={{ 
                  borderColor: '#E2D6C8',
                  backgroundColor: '#FBF6EE',
                  height: '100%'
                }}
              >
                <Statistic
                  title="Solved Cases"
                  value={statistics?.solvedCases}
                  prefix={<CheckCircleOutlined style={{ color: '#2F7D57' }} />}
                  valueStyle={{ color: '#2F7D57', fontSize: '32px', fontWeight: 'bold' }}
                />
                <Paragraph className="mt-4! mb-0!" style={{ color: '#6A6054' }}>
                  Successfully closed investigations
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable
                className="shadow-lg"
                style={{ 
                  borderColor: '#E2D6C8',
                  backgroundColor: '#FBF6EE',
                  height: '100%'
                }}
              >
                <Statistic
                  title="Active Cases"
                  value={statistics?.activeCases}
                  prefix={<FolderOpenOutlined style={{ color: '#C47A2C' }} />}
                  valueStyle={{ color: '#C47A2C', fontSize: '32px', fontWeight: 'bold' }}
                />
                <Paragraph className="mt-4! mb-0!" style={{ color: '#6A6054' }}>
                  Currently under investigation
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable
                className="shadow-lg"
                style={{ 
                  borderColor: '#E2D6C8',
                  backgroundColor: '#FBF6EE',
                  height: '100%'
                }}
              >
                <Statistic
                  title="Organization Employees"
                  value={statistics?.totalEmployees}
                  prefix={<TeamOutlined style={{ color: '#2D6C62' }} />}
                  valueStyle={{ color: '#2D6C62', fontSize: '32px', fontWeight: 'bold' }}
                />
                <Paragraph className="mt-4! mb-0!" style={{ color: '#6A6054' }}>
                  Active department personnel
                </Paragraph>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
};
