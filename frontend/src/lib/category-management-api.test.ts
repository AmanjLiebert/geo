import { afterEach, describe, expect, it, vi } from "vitest";
import {
  changeCategoryArchive,
  getCategoryActions,
  getCategoryBadgeState,
  getCategoryImagePreviewUrl,
  getCategoryReadiness,
  listManagedCategories,
  publishCategory,
  unpublishCategory,
  type ManagedCategory,
} from "./category-management-api";

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

  it("parses managed categories including readiness and honest display states", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "cat-1",
              parentId: null,
              name: "Fossils",
              summary: "Fossil specimens",
              description: "Detailed description",
              publicationStatus: "draft",
              status: "active",
              position: 0,
              imageMediaAssetId: "img-1",
              draftRevision: null,
              displayState: "draft",
              hasUnpublishedChanges: false,
              readiness: {
                publishable: false,
                issues: [
                  {
                    field: "image",
                    code: "image_not_approved",
                    message: "The category image must be approved before publication.",
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const categories = await listManagedCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0]?.displayState).toBe("draft");
    expect(categories[0]?.readiness?.publishable).toBe(false);
    expect(categories[0]?.readiness?.issues[0]?.code).toBe("image_not_approved");
  });

  it("fetches category readiness result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          categoryId: "cat-1",
          publishable: true,
          issues: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const readiness = await getCategoryReadiness("cat-1");
    expect(readiness.publishable).toBe(true);
    expect(readiness.issues).toEqual([]);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/scientific-structure/categories/cat-1/readiness");
  });

  it("uses an authorized thumbnail before a larger category image", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          disposition: "inline",
          items: [
            { kind: "display", pageNumber: null, url: "https://media.example/display.jpg" },
            { kind: "thumbnail", pageNumber: null, url: "https://media.example/thumb.jpg" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCategoryImagePreviewUrl("img-1")).resolves.toBe(
      "https://media.example/thumb.jpg",
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/media/img-1/view");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("rejects non-HTTPS category image previews", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            disposition: "inline",
            items: [{ kind: "thumbnail", pageNumber: null, url: "http://media.example/thumb.jpg" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(getCategoryImagePreviewUrl("img-1")).resolves.toBeNull();
  });

  it.each([
    ["missing readiness", { displayState: "draft", hasUnpublishedChanges: false }],
    ["invalid display state", { displayState: "hidden", hasUnpublishedChanges: false, readiness: { publishable: true, issues: [] } }],
    ["invalid unpublished-change flag", { displayState: "draft", hasUnpublishedChanges: "false", readiness: { publishable: true, issues: [] } }],
    ["malformed readiness issue", { displayState: "draft", hasUnpublishedChanges: false, readiness: { publishable: false, issues: [{ field: "image", code: 42, message: "Image required." }] } }],
  ])("rejects a managed category response with %s", async (_name, contractFields) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{
            id: "cat-1",
            parentId: null,
            name: "Fossils",
            summary: "Fossil specimens",
            description: "Detailed description",
            publicationStatus: "draft",
            status: "active",
            position: 0,
            imageMediaAssetId: "img-1",
            draftRevision: null,
            ...contractFields,
          }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listManagedCategories()).rejects.toMatchObject({ message: "Categories could not be loaded.", kind: "server" });
  });

  it("rejects malformed category readiness issues instead of coercing them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ categoryId: "cat-1", publishable: false, issues: [{ field: "image", code: { unsafe: true }, message: "Image required." }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCategoryReadiness("cat-1")).rejects.toMatchObject({ message: "Category readiness could not be loaded.", kind: "server" });
  });

  it("publishes category via POST /publish", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cat-1",
          publicationStatus: "published",
          promotedDraft: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishCategory("cat-1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/scientific-structure/categories/cat-1/publish");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("unpublishes category via POST /unpublish", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cat-1",
          publicationStatus: "draft",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(unpublishCategory("cat-1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/scientific-structure/categories/cat-1/unpublish");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  describe("UI-state and lifecycle distinctions", () => {
    const baseCategory: ManagedCategory = {
      id: "cat-1",
      parentId: null,
      name: "Tectonic Units",
      summary: "Regional geology",
      description: "Detailed description",
      publicationStatus: "draft",
      status: "active",
      position: 0,
      imageMediaAssetId: "img-1",
      draftRevision: null,
      displayState: "draft",
      hasUnpublishedChanges: false,
      readiness: { publishable: true, issues: [] },
    };

    it("correctly determines badge states for draft, published, unpublished, and removed", () => {
      expect(getCategoryBadgeState({ ...baseCategory, displayState: "draft" })).toBe("draft");
      expect(getCategoryBadgeState({ ...baseCategory, displayState: "published" })).toBe("published");
      expect(getCategoryBadgeState({ ...baseCategory, displayState: "unpublished" })).toBe("unpublished");
      expect(getCategoryBadgeState({ ...baseCategory, status: "archived" })).toBe("removed");
    });

    it("evaluates draft category actions and readiness disabling", () => {
      const incompleteCategory: ManagedCategory = {
        ...baseCategory,
        readiness: {
          publishable: false,
          issues: [{ field: "image", code: "image_missing", message: "Image required." }],
        },
      };
      const incompleteActions = getCategoryActions(incompleteCategory);
      expect(incompleteActions.canEdit).toBe(true);
      expect(incompleteActions.canPublish).toBe(true);
      expect(incompleteActions.isPublishDisabled).toBe(true);
      expect(incompleteActions.publishLabel).toBe("Publish");
      expect(incompleteActions.canUnpublish).toBe(false);
      expect(incompleteActions.canRemove).toBe(true);
      expect(incompleteActions.canRestore).toBe(false);
      expect(incompleteActions.showReadinessIssues).toBe(true);
      expect(incompleteActions.isReadyToPublish).toBe(false);

      const completeActions = getCategoryActions(baseCategory);
      expect(completeActions.canPublish).toBe(true);
      expect(completeActions.isPublishDisabled).toBe(false);
      expect(completeActions.isReadyToPublish).toBe(true);
      expect(completeActions.showReadinessIssues).toBe(false);
    });

    it("evaluates published category without draft changes (shows unpublish, not publish)", () => {
      const publishedCategory: ManagedCategory = {
        ...baseCategory,
        publicationStatus: "published",
        displayState: "published",
      };
      const actions = getCategoryActions(publishedCategory);
      expect(actions.canEdit).toBe(true);
      expect(actions.canPublish).toBe(false);
      expect(actions.canUnpublish).toBe(true);
      expect(actions.canRemove).toBe(true);
      expect(actions.hasUnpublishedChanges).toBe(false);
    });

    it("evaluates published category with draft changes (shows publish changes and unpublish)", () => {
      const publishedWithChanges: ManagedCategory = {
        ...baseCategory,
        publicationStatus: "published",
        displayState: "published",
        hasUnpublishedChanges: true,
        draftRevision: {
          title: "New Title",
          summary: "New Summary",
          description: "New Desc",
          imageMediaAssetId: "img-2",
          position: 1,
        },
      };
      const actions = getCategoryActions(publishedWithChanges);
      expect(actions.canEdit).toBe(true);
      expect(actions.canPublish).toBe(true);
      expect(actions.publishLabel).toBe("Publish changes");
      expect(actions.canUnpublish).toBe(true);
      expect(actions.hasUnpublishedChanges).toBe(true);
      expect(actions.canRemove).toBe(true);
    });

    it("evaluates unpublished category (shows publish, but unpublish is unavailable)", () => {
      const unpublishedCategory: ManagedCategory = {
        ...baseCategory,
        publicationStatus: "draft",
        displayState: "unpublished",
      };
      const actions = getCategoryActions(unpublishedCategory);
      expect(actions.canEdit).toBe(true);
      expect(actions.canPublish).toBe(true);
      expect(actions.canUnpublish).toBe(false);
      expect(actions.canRemove).toBe(true);
    });

    it("evaluates archived/removed category and restore disabling under archived parent", () => {
      const archivedRoot: ManagedCategory = {
        ...baseCategory,
        status: "archived",
      };
      const rootActions = getCategoryActions(archivedRoot);
      expect(rootActions.canEdit).toBe(false);
      expect(rootActions.canPublish).toBe(false);
      expect(rootActions.canUnpublish).toBe(false);
      expect(rootActions.canRemove).toBe(false);
      expect(rootActions.canRestore).toBe(true);
      expect(rootActions.isRestoreDisabled).toBe(false);

      const archivedChild: ManagedCategory = {
        ...baseCategory,
        id: "cat-child",
        parentId: "cat-1",
        status: "archived",
      };
      const childActions = getCategoryActions(archivedChild, true, archivedRoot);
      expect(childActions.canRestore).toBe(true);
      expect(childActions.isRestoreDisabled).toBe(true);
    });
  });
});
