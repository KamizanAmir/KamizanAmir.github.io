const { test } = require('node:test');
const assert = require('node:assert/strict');
for (const [kind, query] of [['m', { id: '11111111-1111-1111-1111-111111111111' }], ['u', { u: 'kamizan' }]]) {
  const handler = require(`../api/${kind}.js`);
  for (const agent of ['Mozilla/5.0', 'Mozilla/5.0 Android', 'Googlebot', 'WhatsApp/2']) {
    test(`${kind}: ${agent} gets a readable, non-indexed page without a redirect`, async () => {
      const headers = {};
      const res = { setHeader(k,v) { headers[k] = v; }, status(s) { this.code = s; return this; }, send(body) { this.body = body; } };
      await handler({ query, headers: { 'user-agent': agent } }, res);
      assert.equal(res.code, 200);
      assert.equal(headers['X-Robots-Tag'], 'noindex');
      assert.equal(headers.Location, undefined);
      assert.match(res.body, /rel="canonical" href="https:\/\/app.kamizanamir.my\//);
      assert.doesNotMatch(res.body, /window.location|location.replace|http-equiv="refresh"/);
    });
  }
  test(`${kind}: invalid links are 404, not store redirects`, async () => {
    const headers = {};
    const res = { setHeader(k,v) { headers[k] = v; }, status(s) { this.code = s; return this; }, send() {} };
    await handler({ query: { id: 'bad', u: '<bad>' }, headers: {} }, res);
    assert.equal(res.code, 404);
    assert.equal(headers.Location, undefined);
  });
}
