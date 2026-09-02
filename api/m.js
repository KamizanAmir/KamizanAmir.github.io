// A shared KamiTrack moment, as a web page.
//
// ## What this is for
//
// The app shares moments as https://kamizanamir.vercel.app/m/<post id>. Three
// different readers follow that link and each needs something different:
//
//   1. A phone with KamiTrack installed. Android verifies the app against
//      /.well-known/assetlinks.json and opens the moment directly — this file
//      is never fetched at all.
//   2. A phone or desktop without it. The browser loads this page, which shows
//      the moment and offers the Play Store.
//   3. WhatsApp, Facebook, Telegram, X. Before a human sees anything, their
//      crawler fetches this URL and reads the Open Graph tags to build the
//      preview card. Crawlers do not run JavaScript, which is why the redirect
//      below is in a script and not a 302 — a redirect would send the crawler
//      to the Play Store and the preview would be an advert for an app rather
//      than a picture of somebody's run.
//
// ## Privacy
//
// Everything shown here comes from `moment_preview` (migration 179), which
// returns rows only for posts whose visibility is 'public' and which have not
// expired. A friends-only moment is a valid URL that previews as a generic
// KamiTrack card — the link still works and still opens the app for anybody
// entitled to see the post, it just does not describe it to anybody else.
//
// If SUPABASE_URL / SUPABASE_ANON_KEY are not set in the Vercel project, or
// the lookup fails for any reason, the page degrades to that same generic
// card. It never fails closed: a broken preview is a loss, a broken link is a
// bug.

const PACKAGE = 'com.kamitrack.app';
const STORE = `https://play.google.com/store/apps/details?id=${PACKAGE}`;
const SITE = 'https://kamizanamir.vercel.app';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// One line, because a preview card shows one or two and cuts the rest anyway.
function trim(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

async function loadMoment(id) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  try {
    const response = await fetch(`${base}/rest/v1/rpc/moment_preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ p_post: id }),
      // A crawler will not wait forever, and neither should a reader.
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (error) {
    // Deliberately swallowed. See the note about failing closed above.
    console.error('moment_preview', error);
    return null;
  }
}

function page({ id, title, description, image }) {
  const url = `${SITE}/m/${id}`;

  // The escape hatch for in-app browsers. WhatsApp and Instagram open links in
  // a WebView, and a WebView does not honour Android App Links — so the app is
  // installed, the link is verified, and it still opens as a web page. An
  // `intent://` URL is the one thing that reliably hands off from inside one,
  // and `browser_fallback_url` means somebody without the app lands on the
  // store rather than on an error.
  const intent =
    `intent://kamizanamir.vercel.app/m/${id}#Intent;scheme=https;` +
    `package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(STORE)};end`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="KamiTrack">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="${escapeHtml(title)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">

<!-- Tells Android and Chrome this URL has an app, which is what produces the
     "Open in app" banner on a page reached through a WebView. There is no iOS
     app, so there is no smart-app-banner tag to go with it. -->
<link rel="alternate" href="android-app://${PACKAGE}/https/kamizanamir.vercel.app/m/${id}">

<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #0A1628; color: #E8F0F8; padding: 24px;
    font: 15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .card {
    width: 100%; max-width: 420px; background: #101F35;
    border: 1px solid #1E3350; border-radius: 18px; overflow: hidden;
  }
  .shot { display: block; width: 100%; aspect-ratio: 4/5; object-fit: cover;
          background: #0A1628; }
  .body { padding: 18px 20px 22px; }
  h1 { margin: 0 0 6px; font-size: 17px; font-weight: 800; }
  p { margin: 0 0 18px; font-size: 14px; color: #9FB3CA; }
  a.cta {
    display: block; text-align: center; text-decoration: none;
    background: #3DDCFF; color: #06121F; font-weight: 800;
    padding: 13px 16px; border-radius: 12px;
  }
  a.alt { display: block; text-align: center; margin-top: 12px;
          color: #6E8AA6; font-size: 13px; text-decoration: none; }
</style>
</head>
<body>
  <div class="card">
    <img class="shot" src="${escapeHtml(image)}" alt="">
    <div class="body">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <a class="cta" id="open" href="${escapeHtml(intent)}">Open in KamiTrack</a>
      <a class="alt" href="${STORE}">Don't have the app? Get it on Google Play</a>
    </div>
  </div>

<script>
  // Only on Android, and only for a real browser. Everything else — a desktop
  // reader, a crawler — is left with the page, which is the useful thing to
  // give them.
  if (/Android/i.test(navigator.userAgent)) {
    setTimeout(function () {
      window.location.href = ${JSON.stringify(intent)};
    }, 900);
  }
</script>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '').trim().toLowerCase();

  if (!UUID.test(id)) {
    res.setHeader('Location', STORE);
    res.status(302).end();
    return;
  }

  const moment = await loadMoment(id);

  const author = moment && moment.author_name ? moment.author_name : null;
  const body = moment && moment.body ? trim(moment.body, 180) : '';

  const html = page({
    id,
    title: author ? `${author} on KamiTrack` : 'A moment on KamiTrack',
    description:
      body ||
      'Runs, workouts and the ground you covered — shared from KamiTrack.',
    image:
      (moment && moment.image_url) || `${SITE}/images/kamitrack-share.png`,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Short, because a post can be edited or deleted and a crawler's copy of the
  // preview should not outlive it by long.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(html);
};
