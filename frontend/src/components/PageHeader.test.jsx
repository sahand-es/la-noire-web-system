import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "antd";
import { PageHeader } from "./PageHeader";

describe("PageHeader Component", () => {
  it("renders title", () => {
    render(<PageHeader title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<PageHeader title="Main Title" subtitle="This is a subtitle" />);

    expect(screen.getByText("Main Title")).toBeInTheDocument();
    expect(screen.getByText("This is a subtitle")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(<PageHeader title="Only Title" />);

    expect(screen.getByText("Only Title")).toBeInTheDocument();
    expect(screen.queryByText("This is a subtitle")).not.toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    const actions = (
      <>
        <Button type="primary">Add New</Button>
        <Button>Export</Button>
      </>
    );

    render(<PageHeader title="Page with Actions" actions={actions} />);

    expect(screen.getByText("Page with Actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add New/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export/i })).toBeInTheDocument();
  });

  it("renders title subtitle and actions together", () => {
    const actions = <Button>Action Button</Button>;

    render(
      <PageHeader
        title="Complete Header"
        subtitle="With all props"
        actions={actions}
      />,
    );

    expect(screen.getByText("Complete Header")).toBeInTheDocument();
    expect(screen.getByText("With all props")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Action Button/i }),
    ).toBeInTheDocument();
  });
});
