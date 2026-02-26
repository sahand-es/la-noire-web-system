import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { Register } from "./Register";
import * as apiCalls from "../api/calls";

vi.mock("../api/calls", () => ({
  register: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Register Component", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it("renders required registration fields", () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>,
    );

    expect(screen.getByText("Create account")).toBeInTheDocument();
    expect(screen.getByLabelText(/First name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/National ID/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Register/i }),
    ).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Register/i }));

    await waitFor(() => {
      expect(screen.getByText(/Enter your first name/i)).toBeInTheDocument();
    });
  });

  it("calls register API and navigates on success", async () => {
    const user = userEvent.setup();
    apiCalls.register.mockResolvedValue({
      tokens: { access: "new-token", refresh: "new-refresh" },
      user: { id: 1, username: "newuser" },
    });

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>,
    );

    await user.type(screen.getByLabelText(/First name/i), "John");
    await user.type(screen.getByLabelText(/Last name/i), "Doe");
    await user.type(screen.getByLabelText(/Username/i), "johndoe");
    await user.type(screen.getByLabelText(/Email/i), "john@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "SecurePass123!");
    await user.type(
      screen.getByLabelText(/Confirm password/i),
      "SecurePass123!",
    );
    await user.type(screen.getByLabelText(/Phone number/i), "09121234567");
    await user.type(screen.getByLabelText(/National ID/i), "1234567890");
    await user.click(screen.getByRole("button", { name: /Register/i }));

    await waitFor(() => {
      expect(apiCalls.register).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: "John",
          last_name: "Doe",
          username: "johndoe",
          email: "john@example.com",
        }),
      );
      expect(localStorage.getItem("access_token")).toBe("new-token");
      expect(localStorage.getItem("refresh_token")).toBe("new-refresh");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  }, 20000);

  it("shows error message on registration failure", async () => {
    const user = userEvent.setup();
    apiCalls.register.mockRejectedValue(new Error("Username already exists"));

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>,
    );

    await user.type(screen.getByLabelText(/First name/i), "John");
    await user.type(screen.getByLabelText(/Last name/i), "Doe");
    await user.type(screen.getByLabelText(/Username/i), "existinguser");
    await user.type(screen.getByLabelText(/Email/i), "john@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "Pass123!");
    await user.type(screen.getByLabelText(/Confirm password/i), "Pass123!");
    await user.type(screen.getByLabelText(/Phone number/i), "09121234567");
    await user.type(screen.getByLabelText(/National ID/i), "1234567890");
    await user.click(screen.getByRole("button", { name: /Register/i }));

    await waitFor(() => {
      expect(screen.getByText(/Registration Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });
  }, 20000);

  it("has a link to login page", () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>,
    );

    const loginLink = screen.getByRole("link", { name: /Login/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});
