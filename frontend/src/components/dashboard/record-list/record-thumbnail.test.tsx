import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecordThumbnail } from "./record-thumbnail";

const hooks = vi.hoisted(() => ({
  effect: undefined as undefined | (() => void | (() => void)),
  setPreview: vi.fn(), frame: {}, getPages: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: () => ({ current: hooks.frame }),
  useState: () => [null, hooks.setPreview],
  useEffect: (effect: () => void | (() => void)) => { hooks.effect = effect; },
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/lib/record-extras-api", () => ({ getOnlineMediaPages: hooks.getPages }));

let notify: (entries: { isIntersecting: boolean }[]) => void;
const disconnect = vi.fn();
const observe = vi.fn();
function mount(id: string | null = "asset") {
  RecordThumbnail({ mediaAssetId: id, alt: "Specimen" });
  return hooks.effect?.();
}
async function flush() { await Promise.resolve(); await Promise.resolve(); }
beforeEach(() => {
  vi.clearAllMocks();
  hooks.getPages.mockResolvedValue([{ kind: "display", url: "display" }, { kind: "thumbnail", url: "small" }]);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof notify) { notify = callback; }
    observe = observe;
    disconnect = disconnect;
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("RecordThumbnail request lifecycle", () => {
  it("defers hidden previews and loads the thumbnail only once near the viewport", async () => {
    mount();
    expect(observe).toHaveBeenCalledWith(hooks.frame);
    expect(hooks.getPages).not.toHaveBeenCalled();
    notify([{ isIntersecting: false }]);
    expect(hooks.getPages).not.toHaveBeenCalled();
    notify([{ isIntersecting: true }]);
    notify([{ isIntersecting: true }]);
    await flush();
    expect(hooks.getPages).toHaveBeenCalledExactlyOnceWith("asset", { includeThumbnails: true });
    expect(hooks.setPreview).toHaveBeenCalledWith({ mediaAssetId: "asset", url: "small" });
  });
  it("ignores completed requests after unmount or an asset change", async () => {
    let resolve!: (pages: unknown[]) => void;
    hooks.getPages.mockReturnValue(new Promise((done) => { resolve = done; }));
    const cleanup = mount();
    notify([{ isIntersecting: true }]);
    cleanup?.();
    resolve([{ kind: "thumbnail", url: "old" }]);
    await flush();
    expect(disconnect).toHaveBeenCalled();
    expect(hooks.setPreview).not.toHaveBeenCalled();
  });
  it("falls back to the available derivative without IntersectionObserver", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    hooks.getPages.mockResolvedValue([{ kind: "display", url: "fallback" }]);
    mount(); await flush();
    expect(hooks.setPreview).toHaveBeenCalledWith({ mediaAssetId: "asset", url: "fallback" });
  });
  it("retains the processing state when the preview request fails", async () => {
    hooks.getPages.mockRejectedValue(new Error("Access denied"));
    mount(); notify([{ isIntersecting: true }]); await flush();
    expect(hooks.setPreview).toHaveBeenCalledWith({ mediaAssetId: "asset", url: null });
  });
  it("makes no preview request for a record without an image", () => {
    mount(null);
    expect(observe).not.toHaveBeenCalled();
    expect(hooks.getPages).not.toHaveBeenCalled();
  });
});
