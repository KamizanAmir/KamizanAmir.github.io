const path = require("path").join(__dirname, "..");
const m = require(path + '/api/m.js');
const u = require(path + '/api/u.js');
function run(h, query, ua) {
  return new Promise((resolve) => {
    const out = { headers: {}, status: 0, body: '' };
    const res = {
      setHeader: (k, v) => { out.headers[k] = v; },
      status: (c) => { out.status = c; return res; },
      end: () => resolve(out),
      send: (b) => { out.body = b; resolve(out); },
    };
    h({ query, headers: { 'user-agent': ua } }, res);
  });
}
const id = '19d6d3f1-211e-4e14-b819-8ff20f8177a5';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36';
const WA = 'WhatsApp/2.24.1 A';
const DESK = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/128';
(async () => {
  let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
  const a = await run(m, { id }, ANDROID);
  check(a.status === 200, 'android gets page');
  check(a.body.includes(`intent://kamizanamir.my/m/${id}#Intent`), 'intent on verified host');
  check(a.body.includes(encodeURIComponent(`https://app.kamizanamir.my/m/${id}`)), 'fallback to PWA');
  check(a.body.includes('Continue in the browser'), 'continue link');
  check(!a.body.includes('setTimeout'), 'no auto-launch');
  check(!a.body.includes('vercel.app'), 'no retired host');
  check(a.headers.Vary === 'User-Agent', 'vary');
  const w = await run(m, { id }, WA);
  check(w.status === 200 && w.body.includes('og:title'), 'crawler gets card');
  const d = await run(m, { id }, DESK);
  check(d.status === 302 && d.headers.Location === `https://app.kamizanamir.my/m/${id}`, 'desktop to PWA');
  const bad = await run(m, { id: 'nope' }, ANDROID);
  check(bad.status === 302, 'bad id');
  const ua = await run(u, { u: 'kamizanamir' }, ANDROID);
  check(ua.status === 200 && ua.body.includes('intent://kamizanamir.my/u/kamizanamir') && !ua.body.includes('setTimeout'), 'profile android');
  const ud = await run(u, { u: 'kamizanamir' }, DESK);
  check(ud.status === 302 && ud.headers.Location.endsWith('/u/kamizanamir'), 'profile desktop');
  console.log(fails ? `${fails} FAILED` : 'ALL PASS');
})();
