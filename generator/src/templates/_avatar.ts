/**
 * Shared placeholder avatar generator — replaces real-people stock photos
 * (pravatar.cc etc.) with neutral initials-on-color SVG silhouettes.
 *
 * Demo prospects must not see fictional team members rendered with real
 * strangers' faces — that creates implied impersonation.
 */

export function avatarPlaceholder(name: string, accentColor: string, size = 400): string {
  const initials = name
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-zÄÖÜäöüß]/g, '')[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const safeColor = accentColor.startsWith('#') ? accentColor : '#6b7280';
  const fontSize = Math.round(size * 0.42);

  // Subtle silhouette — geometric circle + initials, no head/shoulder shape
  // (which could imply specific demographics).
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${safeColor}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${safeColor}" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <text x="50%" y="56%" text-anchor="middle" fill="rgba(255,255,255,0.92)"
          font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">${escapeXml(initials)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] as string),
  );
}

/**
 * "Symbolfoto" CSS + badge HTML — paste once per template's <style> block,
 * then add the <span class="avatar-symbolic-tag">Symbolfoto</span>
 * inside any avatar wrapper.
 */
export const SYMBOLIC_TAG_CSS = `
  .avatar-symbolic-wrap { position: relative; }
  .avatar-symbolic-tag {
    position: absolute; bottom: 6px; right: 6px;
    background: rgba(0,0,0,0.7); color: #fff;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0.18rem 0.45rem; border-radius: 4px;
    pointer-events: none;
    backdrop-filter: blur(2px);
  }
`;
