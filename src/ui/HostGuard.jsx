/**
 * HostGuard — keeps the marketing site and the app on separate hosts:
 *   - vidquence.com / www.vidquence.com → marketing pages only; /login + app routes bounce to app.
 *   - app.vidquence.com                 → the app; marketing content bounces back to the root domain
 * Auth lives entirely on app.vidquence.com (Supabase sessions are per-origin), so login + the app
 * share one origin. Any other host (localhost, *.railway.app) is left untouched, so local dev and
 * Railway previews behave exactly as before. Rendered once inside <BrowserRouter>.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const APP_HOST = "app.vidquence.com";
const MARKETING_HOSTS = ["vidquence.com", "www.vidquence.com"];
// Content pages that belong on the marketing host; everything else (login, app, admin) is the app.
const MARKETING_PATHS = ["/", "/about", "/faq", "/help", "/terms", "/privacy", "/refunds", "/status", "/pricing"];
const isMarketingPath = (p) =>
  MARKETING_PATHS.some((m) => (m === "/" ? p === "/" : p === m || p.startsWith(m + "/")));

export default function HostGuard() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    const host = window.location.hostname;
    const suffix = `${pathname}${search}${hash}`;
    if (host === APP_HOST) {
      if (isMarketingPath(pathname)) window.location.replace(`https://vidquence.com${suffix}`);
    } else if (MARKETING_HOSTS.includes(host)) {
      if (!isMarketingPath(pathname)) window.location.replace(`https://${APP_HOST}${suffix}`);
    }
  }, [pathname, search, hash]);
  return null;
}
