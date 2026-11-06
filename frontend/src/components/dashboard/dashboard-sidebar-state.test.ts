import { describe, expect, it, vi } from "vitest";
import {
  DASHBOARD_SIDEBAR_DEFAULT_PINNED,
  DASHBOARD_SIDEBAR_PREFERENCE_KEY,
  getSidebarPinnedPreferenceServerSnapshot,
  getSidebarPinnedPreferenceSnapshot,
  getSidebarPreferenceStorage,
  getSidebarToggleLabel,
  readSidebarPinnedPreference,
  setSidebarPinnedPreference,
  shouldCollapseTemporarySidebarOnEscape,
  subscribeSidebarPinnedPreference,
  writeSidebarPinnedPreference,
} from "./dashboard-sidebar-state";

function storageWith(value: string | null) {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  };
}

describe("readSidebarPinnedPreference", () => {
  it("starts collapsed when no preference has been stored", () => {
    expect(DASHBOARD_SIDEBAR_DEFAULT_PINNED).toBe(false);
    expect(readSidebarPinnedPreference(storageWith(null))).toBe(false);
  });

  it("restores the pinned expanded preference", () => {
    expect(readSidebarPinnedPreference(storageWith("expanded"))).toBe(true);
  });

  it("restores the pinned collapsed preference", () => {
    expect(readSidebarPinnedPreference(storageWith("collapsed"))).toBe(false);
  });

  it("ignores unknown stored values", () => {
    expect(readSidebarPinnedPreference(storageWith("sideways"))).toBe(false);
  });

  it("falls back safely when storage is unavailable", () => {
    expect(readSidebarPinnedPreference(null)).toBe(false);
    expect(readSidebarPinnedPreference(undefined)).toBe(false);
  });

  it("falls back safely when reading throws", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
      setItem: vi.fn(),
    };
    expect(readSidebarPinnedPreference(storage)).toBe(false);
  });

  it("reads the documented preference key", () => {
    const storage = storageWith("expanded");
    readSidebarPinnedPreference(storage);
    expect(storage.getItem).toHaveBeenCalledWith(
      DASHBOARD_SIDEBAR_PREFERENCE_KEY,
    );
  });
});

describe("writeSidebarPinnedPreference", () => {
  it("stores the pinned expanded preference", () => {
    const storage = storageWith(null);
    writeSidebarPinnedPreference(storage, true);
    expect(storage.setItem).toHaveBeenCalledWith(
      DASHBOARD_SIDEBAR_PREFERENCE_KEY,
      "expanded",
    );
  });

  it("stores the pinned collapsed preference", () => {
    const storage = storageWith(null);
    writeSidebarPinnedPreference(storage, false);
    expect(storage.setItem).toHaveBeenCalledWith(
      DASHBOARD_SIDEBAR_PREFERENCE_KEY,
      "collapsed",
    );
  });

  it("never throws when storage is unavailable or blocked", () => {
    expect(() => writeSidebarPinnedPreference(null, true)).not.toThrow();
    expect(() =>
      writeSidebarPinnedPreference(
        {
          getItem: vi.fn(() => null),
          setItem: vi.fn(() => {
            throw new Error("quota");
          }),
        },
        true,
      ),
    ).not.toThrow();
  });
});

describe("getSidebarPreferenceStorage", () => {
  it("returns null outside a browser", () => {
    expect(getSidebarPreferenceStorage()).toBeNull();
  });
});

describe("sidebar preference store", () => {
  it("uses the collapsed default for server rendering and unavailable storage", () => {
    expect(getSidebarPinnedPreferenceServerSnapshot()).toBe(false);
    expect(getSidebarPinnedPreferenceSnapshot()).toBe(false);
  });

  it("notifies and unsubscribes same-tab listeners", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSidebarPinnedPreference(listener);

    setSidebarPinnedPreference(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setSidebarPinnedPreference(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("getSidebarToggleLabel", () => {
  it("describes expand, temporary pin, and collapse actions", () => {
    expect(getSidebarToggleLabel(false, false)).toBe(
      "Expand dashboard sidebar",
    );
    expect(getSidebarToggleLabel(false, true)).toBe(
      "Pin dashboard sidebar expanded",
    );
    expect(getSidebarToggleLabel(true, false)).toBe(
      "Collapse dashboard sidebar",
    );
  });
});

describe("shouldCollapseTemporarySidebarOnEscape", () => {
  it("closes an unpinned temporary expansion on Escape", () => {
    expect(
      shouldCollapseTemporarySidebarOnEscape("Escape", false, true),
    ).toBe(true);
  });

  it("leaves a pinned sidebar expanded on Escape", () => {
    expect(
      shouldCollapseTemporarySidebarOnEscape("Escape", true, true),
    ).toBe(false);
  });

  it("ignores Escape when the sidebar is already collapsed", () => {
    expect(
      shouldCollapseTemporarySidebarOnEscape("Escape", false, false),
    ).toBe(false);
  });

  it("ignores other keys", () => {
    expect(shouldCollapseTemporarySidebarOnEscape("Tab", false, true)).toBe(
      false,
    );
    expect(shouldCollapseTemporarySidebarOnEscape("Enter", false, true)).toBe(
      false,
    );
  });
});
