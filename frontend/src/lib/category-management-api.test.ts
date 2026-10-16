import { afterEach, describe, expect, it, vi } from "vitest";
import { changeCategoryArchive } from "./category-management-api";

describe("category management API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends only confirmed counts when archiving a preview response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ categoryCount: 2, recordCount: 3, status: "archived" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await changeCategoryArchive("category-id", false, {
      categoryCount: 2,
      recordCount: 3,
      status: "active",
    } as { categoryCount: number; recordCount: number });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      categoryCount: 2,
      recordCount: 3,
    });
  });
});
