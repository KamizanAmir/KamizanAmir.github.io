// Legacy portfolio-host profile links. Keep an explicit route into KamiTrack
// for existing QR codes without automatic redirects or portfolio indexing.
//
// Deliberately simpler than the moment page: it shows the handle and nothing
// else. A profile preview would mean exposing name and avatar to anybody
// holding a URL, and a QR is a thing people print on posters — the moment page
// can be that open because its author chose to make that post public, and
// nobody chooses that by having a username.

const PACKAGE = 'com.kamitrack.app';
const STORE = `https://play.google.com/store/apps/details?id=${PACKAGE}`;
const SITE = 'https://kamizanamir.my';
const PWA_ORIGIN = process.env.PWA_URL || 'https://app.kamizanamir.my';

const HANDLE = /^[a-z0-9._]{3,30}$/;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  const handle = String((req.query && req.query.u) || '')
    .trim()
    .toLowerCase();

  if (!HANDLE.test(handle)) {
    res.status(404).send('KamiTrack link not found');
    return;
  }

  // Retired portfolio links remain readable without an automatic redirect.
  const url = `${PWA_ORIGIN}/u/${handle}`;
  const title = `@${handle} on KamiTrack`;
  const description =
    'Open this in KamiTrack to see their profile and follow them.';
  const image = `${SITE}/images/kamitrack-share.png`;

  // The escape hatch for in-app browsers, which do not honour App Links.
  // On the verified host; without the app, the fallback is the profile in
  // the web app rather than the store.
  const web = `${PWA_ORIGIN}/u/${handle}`;
  const intent =
    `intent://app.kamizanamir.my/u/${handle}#Intent;scheme=https;` +
    `package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(web)};end`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="canonical" href="${escapeHtml(url)}">
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="KamiTrack">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" href="android-app://${PACKAGE}/https/app.kamizanamir.my/u/${handle}">
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         background:#0A1628; color:#E8F0F8; padding:24px;
         font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  .card { width:100%; max-width:380px; background:#101F35; border:1px solid #1E3350;
          border-radius:18px; padding:26px 22px; text-align:center; }
  h1 { margin:0 0 6px; font-size:19px; font-weight:800; }
  p { margin:0 0 20px; font-size:14px; color:#9FB3CA; }
  a.cta { display:block; text-decoration:none; background:#3DDCFF; color:#06121F;
          font-weight:800; padding:13px 16px; border-radius:12px; }
  a.alt { display:block; margin-top:12px; color:#6E8AA6; font-size:13px;
          text-decoration:none; }
</style>
</head>
<body>
  <div class="card">
    <h1>@${escapeHtml(handle)}</h1>
    <p>${escapeHtml(description)}</p>
    <a class="cta" href="${escapeHtml(intent)}">Open in KamiTrack</a>
    <a class="alt" href="${escapeHtml(web)}">Continue in the browser</a>
    <a class="alt" href="${STORE}">Don't have the app? Get it on Google Play</a>
  </div>
</body>
</html>`);
};
