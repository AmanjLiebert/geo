export const DASHBOARD_SIDEBAR_PREFERENCE_KEY =
  "geo-kurdistan:dashboard-sidebar-pinned";

export const DASHBOARD_SIDEBAR_DEFAULT_PINNED = false;

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Reads the pinned sidebar preference. Storage can be unavailable in privacy
 * modes or restricted embeds; the collapsed rail remains a safe fallback.
 */
export function readSidebarPinnedPreference(
  storage: PreferenceStorage | null | undefined,
): boolean {
  if (!storage) return DASHBOARD_SIDEBAR_DEFAULT_PINNED;
  try {
    const value = storage.getItem(DASHBOARD_SIDEBAR_PREFERENCE_KEY);
    if (value === "expanded") return true;
    if (value === "collapsed") return false;
    return DASHBOARD_SIDEBAR_DEFAULT_PINNED;
  } catch {
    return DASHBOARD_SIDEBAR_DEFAULT_PINNED;
  }
}

export function writeSidebarPinnedPreference(
  storage: PreferenceStorage | null | undefined,
  pinnedExpanded: boolean,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      DASHBOARD_SIDEBAR_PREFERENCE_KEY,
      pinnedExpanded ? "expanded" : "collapsed",
    );
  } catch {
    // A blocked preference write must never break dashboard navigation.
  }
}

export function getSidebarPreferenceStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const preferenceListeners = new Set<() => void>();

/**
 * Subscribes dashboard layouts to local and cross-tab preference changes.
 * Used with useSyncExternalStore so the stored pin is read after hydration
 * without synchronously setting state inside an effect.
 */
export function subscribeSidebarPinnedPreference(
  listener: () => void,
): () => void {
  preferenceListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === DASHBOARD_SIDEBAR_PREFERENCE_KEY
    ) {
      listener();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    preferenceListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function getSidebarPinnedPreferenceSnapshot(): boolean {
  return readSidebarPinnedPreference(getSidebarPreferenceStorage());
}

export function getSidebarPinnedPreferenceServerSnapshot(): boolean {
  return DASHBOARD_SIDEBAR_DEFAULT_PINNED;
}

export function setSidebarPinnedPreference(pinnedExpanded: boolean): void {
  writeSidebarPinnedPreference(
    getSidebarPreferenceStorage(),
    pinnedExpanded,
  );
  for (const listener of preferenceListeners) {
    listener();
  }
}

export function getSidebarToggleLabel(
  pinnedExpanded: boolean,
  temporaryExpanded: boolean,
): string {
  if (pinnedExpanded) return "Collapse dashboard sidebar";
  if (temporaryExpanded) return "Pin dashboard sidebar expanded";
  return "Expand dashboard sidebar";
}

export function shouldCollapseTemporarySidebarOnEscape(
  key: string,
  pinnedExpanded: boolean,
  temporaryExpanded: boolean,
): boolean {
  return key === "Escape" && !pinnedExpanded && temporaryExpanded;
}
