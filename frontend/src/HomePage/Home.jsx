import { useEffect, useState } from "react";
import { Button, Typography, Spin, Alert } from "antd";
import {
  CheckCircleOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getPublicStatistics } from "../api/calls";
import {
  deskLightTokens,
  siderBg,
  siderTextColor,
  siderTextSecondary,
} from "../theme";

const { Title, Paragraph } = Typography;

export function Home() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const isLoggedIn =
    localStorage.getItem("access_token") && localStorage.getItem("user");

  useEffect(() => {
    async function fetchStatistics() {
      try {
        setLoading(true);
        setError(null);
        const stats = await getPublicStatistics();
        setStatistics({
          solvedCases: stats?.solved_cases || 0,
          activeCases: stats?.active_cases || 0,
          totalEmployees: stats?.total_employees || 0,
        });
      } catch (err) {
        setError(err?.message || "Failed to load statistics.");
      } finally {
        setLoading(false);
      }
    }
    fetchStatistics();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: deskLightTokens.colorBgLayout }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ background: siderBg, borderBottom: `1px solid ${deskLightTokens.colorBorder}` }}
      >
        <span
          className="text-xl font-semibold tracking-wide"
          style={{ color: siderTextColor }}
        >
          L.A. Noire System
        </span>
        <div className="flex gap-3">
          {isLoggedIn ? (
            <Button
              type="primary"
              onClick={() => navigate("/dashboard")}
              style={{
                background: siderTextColor,
                borderColor: siderTextColor,
                color: siderBg,
              }}
            >
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                ghost
                onClick={() => navigate("/login")}
                style={{ color: siderTextColor, borderColor: siderTextSecondary }}
              >
                Login
              </Button>
              <Button
                type="primary"
                onClick={() => navigate("/register")}
                style={{
                  background: siderTextColor,
                  borderColor: siderTextColor,
                  color: siderBg,
                }}
              >
                Register
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section
        className="flex-1 flex flex-col justify-center items-center px-6 py-20 text-center"
        style={{ background: siderBg }}
      >
        <Title
          level={1}
          className="m-0 max-w-3xl font-bold leading-tight"
          style={{
            color: siderTextColor,
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
          }}
        >
          Case Management & Investigation
        </Title>
        <Paragraph
          className="m-0 mt-4 max-w-xl text-lg"
          style={{ color: siderTextSecondary }}
        >
          Los Angeles Police Department — Streamlined evidence tracking,
          suspect identification, and trial preparation.
        </Paragraph>
        <div className="mt-8 flex gap-4">
          {isLoggedIn ? (
            <Button
              size="large"
              type="primary"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => navigate("/dashboard")}
              style={{
                background: siderTextColor,
                borderColor: siderTextColor,
                color: siderBg,
              }}
            >
              Go to Dashboard
            </Button>
          ) : (
            <Button
              size="large"
              type="primary"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => navigate("/register")}
              style={{
                background: siderTextColor,
                borderColor: siderTextColor,
                color: siderBg,
              }}
            >
              Get Started
            </Button>
          )}
        </div>
      </section>

      {/* Stats strip */}
      <section
        className="px-6 py-10"
        style={{
          background: deskLightTokens.colorBgContainer,
          borderTop: `1px solid ${deskLightTokens.colorBorder}`,
        }}
      >
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : error ? (
            <Alert message={error} type="error" showIcon className="max-w-md mx-auto" />
          ) : (
            <div className="flex flex-wrap justify-around gap-8 sm:gap-12">
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-3xl sm:text-4xl font-bold tabular-nums"
                  style={{ color: deskLightTokens.colorSuccess }}
                >
                  {statistics?.solvedCases ?? "—"}
                </span>
                <span className="text-sm" style={{ color: deskLightTokens.colorTextSecondary }}>
                  Solved Cases
                </span>
                <CheckCircleOutlined style={{ color: deskLightTokens.colorSuccess, marginTop: 4 }} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-3xl sm:text-4xl font-bold tabular-nums"
                  style={{ color: deskLightTokens.colorPrimary }}
                >
                  {statistics?.activeCases ?? "—"}
                </span>
                <span className="text-sm" style={{ color: deskLightTokens.colorTextSecondary }}>
                  Active Cases
                </span>
                <FolderOpenOutlined style={{ color: deskLightTokens.colorPrimary, marginTop: 4 }} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-3xl sm:text-4xl font-bold tabular-nums"
                  style={{ color: deskLightTokens.colorPrimary }}
                >
                  {statistics?.totalEmployees ?? "—"}
                </span>
                <span className="text-sm" style={{ color: deskLightTokens.colorTextSecondary }}>
                  Department Personnel
                </span>
                <TeamOutlined style={{ color: deskLightTokens.colorPrimary, marginTop: 4 }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section
        className="px-6 py-16 flex-1"
        style={{ background: deskLightTokens.colorBgLayout }}
      >
        <div className="max-w-4xl mx-auto">
          <Title level={2} className="m-0 mb-6" style={{ color: deskLightTokens.colorText }}>
            About the Department
          </Title>
          <div className="flex flex-col gap-6">
            <Paragraph
              className="m-0 text-base"
              style={{ color: deskLightTokens.colorTextSecondary, lineHeight: 1.8 }}
            >
              The La Noire Web System serves as the digital backbone of the Los
              Angeles Police Department, streamlining case management, evidence
              tracking, and investigative operations. Our department is
              committed to maintaining law and order through systematic
              investigation, evidence-based prosecution, and community safety.
            </Paragraph>
            <Paragraph
              className="m-0 text-base"
              style={{ color: deskLightTokens.colorTextSecondary, lineHeight: 1.8 }}
            >
              <strong style={{ color: deskLightTokens.colorText }}>Core duties:</strong>{" "}
              Criminal investigation and case resolution, evidence collection
              and forensic analysis, witness testimony management, suspect
              identification and tracking, coordination with coroners and
              forensic specialists, trial preparation and judicial support, and
              interdepartmental collaboration to ensure justice is served
              efficiently and effectively.
            </Paragraph>
          </div>
        </div>
      </section>
    </div>
  );
}
