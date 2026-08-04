/**
 * Lightweight deployment version check.
 *
 * Strategy: the built index.html references hashed entry assets
 * (e.g. /assets/index-ab12cd34.js). We snapshot the hashes of the currently
 * running page at boot, then periodically re-fetch index.html with
 * `cache: "no-store"`. If the deployed hashes differ, a new build is live and
 * the running client is stale.
 *
 * No service worker involved — nothing to unregister, nothing to cache.
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const RELOAD_GUARD_KEY = "sm_version_reload_at";
const RELOAD_GUARD_WINDOW_MS = 60 * 1000;

let currentSignature: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let listener: ((remote: string) => void) | null = null;

const extractSignature = (html: string): string | null => {
  const matches = html.match(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g);
  if (!matches || matches.length === 0) return null;
  return Array.from(new Set(matches)).sort().join("|");
};

const readLocalSignature = (): string | null => {
  try {
    const urls = Array.from(
      document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
        'script[src*="/assets/"], link[rel="stylesheet"][href*="/assets/"]'
      )
    )
      .map((el) =>
        el instanceof HTMLScriptElement ? el.getAttribute("src") : el.getAttribute("href")
      )
      .filter((v): v is string => !!v)
      .map((v) => {
        const idx = v.indexOf("/assets/");
        return idx >= 0 ? v.slice(idx).split("?")[0] : v;
      });

    if (urls.length === 0) return null;
    return Array.from(new Set(urls)).sort().join("|");
  } catch {
    return null;
  }
};

const fetchRemoteSignature = async (): Promise<string | null> => {
  try {
    const res = await fetch(`/index.html?_v=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractSignature(html);
  } catch {
    return null;
  }
};

/** True when a reload was already attempted very recently (avoids reload loops). */
export const recentlyReloadedForUpdate = (): boolean => {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    return !!at && Date.now() - at < RELOAD_GUARD_WINDOW_MS;
  } catch {
    return false;
  }
};

export const markUpdateReload = () => {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
};

/**
 * Start polling for a newer deployment.
 * `onUpdateAvailable` fires at most once per detected version.
 */
export const startVersionCheck = (onUpdateAvailable: () => void) => {
  if (!import.meta.env.PROD) return () => {};
  if (timer) return () => stopVersionCheck();

  currentSignature = readLocalSignature();
  let notified = false;

  listener = () => {
    if (notified) return;
    notified = true;
    onUpdateAvailable();
  };

  const run = async () => {
    if (document.visibilityState === "hidden") return;
    const remote = await fetchRemoteSignature();
    if (!remote) return;
    if (!currentSignature) {
      currentSignature = remote;
      return;
    }
    if (remote !== currentSignature) {
      listener?.(remote);
    }
  };

  timer = setInterval(run, CHECK_INTERVAL_MS);
  // Also check when the app returns to the foreground.
  document.addEventListener("visibilitychange", run);
  // First check shortly after boot (not instantly, to avoid competing with load).
  const bootTimeout = setTimeout(run, 15000);

  return () => {
    clearTimeout(bootTimeout);
    document.removeEventListener("visibilitychange", run);
    stopVersionCheck();
  };
};

export const stopVersionCheck = () => {
  if (timer) clearInterval(timer);
  timer = null;
  listener = null;
};
