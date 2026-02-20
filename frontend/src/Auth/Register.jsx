import { useState } from "react";
import { Card, Form, Input, Button, Typography, Alert } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/calls";

const { Title, Text } = Typography;

export function Register() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      setError(null);

      const data = await register(values);
      if (data?.tokens?.access) {
        localStorage.setItem("access_token", data.tokens.access);
      }
      if (data?.tokens?.refresh) {
        localStorage.setItem("refresh_token", data.tokens.refresh);
      }
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <Title level={2} className="m-0">
              Create account
            </Title>
            <Text type="secondary">Register for access to the system</Text>
          </div>

          {error ? <Alert type="error" message={error} showIcon /> : null}

          <Form layout="vertical" onFinish={handleFinish}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="First name"
                name="first_name"
                rules={[{ required: true, message: "Enter your first name" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Last name"
                name="last_name"
                rules={[{ required: true, message: "Enter your last name" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: "Choose a username" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Enter your email" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Phone number"
                name="phone_number"
                rules={[{ required: true, message: "Enter your phone number" }]}
              >
                <Input placeholder="09xxxxxxxxx" />
              </Form.Item>

              <Form.Item
                label="National ID"
                name="national_id"
                rules={[{ required: true, message: "Enter your national ID" }]}
              >
                <Input placeholder="10 digits" />
              </Form.Item>
            </div>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Enter a password" }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              label="Confirm password"
              name="password_confirm"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Confirm your password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading} block>
              Register
            </Button>
          </Form>

          <Text className="text-center">
            Already have an account? <Link to="/login">Login</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
