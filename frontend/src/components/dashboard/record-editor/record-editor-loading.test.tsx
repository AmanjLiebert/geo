import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordEditor } from "./record-editor";

const state = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>, set: vi.fn(),
  categories: vi.fn(), record: vi.fn(), template: vi.fn(), activeTemplate: vi.fn(), types: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [initial, state.set],
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/lib/dashboard-api", async (original) => ({
  ...await original<typeof import("@/lib/dashboard-api")>(),
  listStructureCategories: state.categories, getRecord: state.record,
  getTemplateVersion: state.template, getActiveTemplate: state.activeTemplate,
  listCategoryRecordTypes: state.types,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
function mount(mode: "create" | "edit" = "edit") {
  RecordEditor({ mode, recordId: mode === "edit" ? "record-id" : undefined });
  return state.effects[1]();
}
const record = { categoryId: "category", recordTypeId: "type", templateVersionId: "version", attributes: { field: "value" }, slug: "specimen" };
beforeEach(() => {
  vi.clearAllMocks(); state.effects = [];
  state.categories.mockResolvedValue({ items: [{ id: "category", parentId: null }] });
  state.record.mockResolvedValue(record);
  state.template.mockResolvedValue({ id: "version" });
  state.activeTemplate.mockResolvedValue({ id: "active" });
  state.types.mockResolvedValue({ items: [{ id: "type" }] });
});

describe("RecordEditor initial request scheduling", () => {
  it("starts independent reads together and waits for both before progressing", async () => {
    const categories = deferred<unknown>(); const template = deferred<unknown>();
    state.categories.mockReturnValue(categories.promise); state.template.mockReturnValue(template.promise);
    mount();
    expect(state.categories).toHaveBeenCalledOnce(); expect(state.record).toHaveBeenCalledWith("record-id");
    await flush(); expect(state.template).not.toHaveBeenCalled();
    categories.resolve({ items: [{ id: "category", parentId: null }] }); await flush();
    expect(state.template).toHaveBeenCalledWith("version"); expect(state.types).toHaveBeenCalledWith("category");
    expect(state.set).not.toHaveBeenCalledWith("fields");
    template.resolve({ id: "version" }); await flush();
    expect(state.set).toHaveBeenCalledWith(record.attributes);
    expect(state.set).toHaveBeenCalledWith("specimen");
    expect(state.set).toHaveBeenCalledWith("fields");
  });
  it("keeps create mode free of record/template reads", async () => {
    mount("create"); await flush();
    expect(state.record).not.toHaveBeenCalled(); expect(state.template).not.toHaveBeenCalled();
    expect(state.types).not.toHaveBeenCalled(); expect(state.set).toHaveBeenCalledWith(false);
  });
  it("uses the active template only for a record without a pinned version", async () => {
    state.record.mockResolvedValue({ ...record, templateVersionId: null });
    mount(); await flush();
    expect(state.template).not.toHaveBeenCalled();
    expect(state.activeTemplate).toHaveBeenCalledWith("category", "type");
    expect(state.set).toHaveBeenCalledWith("fields");
  });
  it("does not update state or request templates after the editor unmounts", async () => {
    const pending = deferred<unknown>(); state.record.mockReturnValue(pending.promise);
    const cleanup = mount(); cleanup?.(); state.set.mockClear();
    pending.resolve(record); await flush();
    expect(state.set).not.toHaveBeenCalled(); expect(state.template).not.toHaveBeenCalled();
  });
});
