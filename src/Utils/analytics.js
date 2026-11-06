/**
 * Send a custom event to Umami. The script is deferred, cookieless and pinned
 * to the production domain via data-domains, so it is absent on localhost and
 * previews — analytics is never worth breaking the app over, so every call is
 * best-effort.
 * @param {string} event
 * @param {Record<string, string>} [data]
 */
export function track(event, data) {
  try {
    if (data === undefined) window.umami?.track(event);
    else window.umami?.track(event, data);
  } catch {
    // Blocked by an extension, offline, or the script failed to load.
  }
}
