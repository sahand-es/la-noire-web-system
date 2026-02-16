import { useState } from "react";
import { Card, Form, Input, Button, Typography, Alert } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/calls";

const { Title, Text } = Typography;

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      setError(null);

      const data = await login(values);
      if (data?.tokens?.access) {
        localStorage.setItem("access_token", data.tokens.access);
      }
      if (data?.tokens?.refresh) {
        localStorage.setItem("refresh_token", data.tokens.refresh);
      }

      navigate("/");
    } catch (err) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <Title level={2} className="m-0">
              Sign in
            </Title>
            <Text type="secondary">Access the La Noire system</Text>
          </div>

          {error ? <Alert type="error" message={error} showIcon /> : null}

          <Form layout="vertical" onFinish={handleFinish}>
            <Form.Item
              label="Identifier"
              name="identifier"
              rules={[{ required: true, message: "Enter your identifier" }]}
            >
              <Input placeholder="Username, email, phone, or national ID" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Enter your password" }]}
            >
              <Input.Password placeholder="Password" />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading} block>
              Login
            </Button>
          </Form>

          <Text className="text-center">
            Don't have an account? <Link to="/register">Register</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
