/**
 * True when the URL's hostname is on gambling.com.
 * Prefer this over `url.includes('gambling.com')` — affiliate landers often
 * carry a `referrer=https://www.gambling.com/...` query param that would
 * falsely look on-site.
 */
export function isOnGamblingComHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'gambling.com' || hostname.endsWith('.gambling.com');
  } catch {
    return false;
  }
}
