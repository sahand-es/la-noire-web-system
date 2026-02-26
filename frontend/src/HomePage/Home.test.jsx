import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Home } from "./Home";
import * as apiCalls from "../api/calls";

vi.mock("../api/calls", () => ({
  getPublicStatistics: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Home Page", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it("shows statistics when loaded", async () => {
    apiCalls.getPublicStatistics.mockResolvedValue({
      solved_cases: 150,
      active_cases: 25,
      total_employees: 200,
      total_cases: 175,
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("200")).toBeInTheDocument();
    });
  });

  it("shows error alert when statistics fail", async () => {
    apiCalls.getPublicStatistics.mockRejectedValue(new Error("Network error"));

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Statistics/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it("shows Register and Login buttons when not logged in", async () => {
    apiCalls.getPublicStatistics.mockResolvedValue({
      solved_cases: 1,
      active_cases: 1,
      total_employees: 1,
      total_cases: 1,
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Register/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Login/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows Go to Dashboard button when logged in", async () => {
    localStorage.setItem("access_token", "token");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));

    apiCalls.getPublicStatistics.mockResolvedValue({
      solved_cases: 1,
      active_cases: 1,
      total_employees: 1,
      total_cases: 1,
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Go to Dashboard/i }),
      ).toBeInTheDocument();
    });
  });
});
