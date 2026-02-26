import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { Login } from "./Login";
import * as apiCalls from "../api/calls";

vi.mock("../api/calls", () => ({
  login: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Login Component", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it("renders login form fields", () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Username, email, phone, or national ID/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });

  it("shows validation error for empty submit", async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Enter your identifier/i)).toBeInTheDocument();
    });
  });

  it("calls login and navigates on success", async () => {
    const user = userEvent.setup();
    apiCalls.login.mockResolvedValue({
      tokens: { access: "test-token", refresh: "refresh-token" },
      user: { id: 1, username: "testuser" },
    });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    await user.type(
      screen.getByPlaceholderText(/Username, email, phone, or national ID/i),
      "testuser",
    );
    await user.type(screen.getByLabelText(/Password/i), "password123");
    await user.click(screen.getByRole("button", { name: /Login/i }));

    await waitFor(() => {
      expect(apiCalls.login).toHaveBeenCalledWith({
        identifier: "testuser",
        password: "password123",
      });
      expect(localStorage.getItem("access_token")).toBe("test-token");
      expect(localStorage.getItem("refresh_token")).toBe("refresh-token");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows API error on login failure", async () => {
    const user = userEvent.setup();
    const err = new Error("Invalid credentials");
    err.status = 401;
    apiCalls.login.mockRejectedValue(err);

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    await user.type(
      screen.getByPlaceholderText(/Username, email, phone, or national ID/i),
      "bad",
    );
    await user.type(screen.getByLabelText(/Password/i), "bad");
    await user.click(screen.getByRole("button", { name: /Login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Login Failed/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /Invalid credentials\. Please check your identifier and password\./i,
        ),
      ).toBeInTheDocument();
    });
  });
});
