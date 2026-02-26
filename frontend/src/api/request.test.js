import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { get, post, put, patch, del } from "./request";

global.fetch = vi.fn();

describe("API Request Module", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes GET request with correct headers", async () => {
    const mockData = { id: 1, name: "Test" };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(JSON.stringify({ status: "success", data: mockData })),
    });

    const result = await get("/test");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
    expect(result).toEqual(mockData);
  });

  it("includes Authorization header when token exists", async () => {
    localStorage.setItem("access_token", "test-token");

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(JSON.stringify({ status: "success", data: {} })),
    });

    await get("/test");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("makes POST request with body", async () => {
    const postData = { name: "Test", value: 123 };
    const mockResponse = { id: 1, ...postData };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: () =>
        Promise.resolve(
          JSON.stringify({ status: "success", data: mockResponse }),
        ),
    });

    const result = await post("/test", postData);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(postData),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("throws Unauthorized for 401 response", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve(JSON.stringify({ message: "Unauthorized" })),
    });

    await expect(get("/test")).rejects.toThrowError(
      "Session expired. Please login again.",
    );
  });

  it("throws backend error message when present", async () => {
    const errorMessage = "Resource not found";
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () =>
        Promise.resolve(
          JSON.stringify({ status: "error", message: errorMessage }),
        ),
    });

    await expect(get("/test")).rejects.toThrowError(errorMessage);
  });

  it("makes PUT request", async () => {
    const updateData = { name: "Updated" };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({ status: "success", data: updateData }),
        ),
    });

    await put("/test/1", updateData);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/test/1"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("makes PATCH request", async () => {
    const patchData = { status: "active" };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(JSON.stringify({ status: "success", data: patchData })),
    });

    await patch("/test/1", patchData);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/test/1"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("makes DELETE request", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    });

    await del("/test/1");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/test/1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
