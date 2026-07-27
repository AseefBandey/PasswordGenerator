/**
 * tests.js
 * --------
 * Run with: node tests.js
 *
 * Plain-Node tests (no test runner dependency) covering the pure
 * logic in core.js: RNG range/uniformity, password/passphrase
 * construction rules, and the entropy math the strength meter
 * relies on.
 */

const assert = require('assert');
const core = require('./core.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  - ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL - ${name}`);
    console.log(`         ${err.message}`);
  }
}

console.log('secureRandomInt');
test('stays within [0, max)', () => {
  for (let i = 0; i < 5000; i++) {
    const n = core.secureRandomInt(7);
    assert.ok(n >= 0 && n < 7, `${n} out of range`);
  }
});
test('handles max = 1', () => {
  assert.strictEqual(core.secureRandomInt(1), 0);
});
test('covers the full range given enough samples', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(core.secureRandomInt(10));
  assert.strictEqual(seen.size, 10);
});

console.log('buildCharset');
test('combines only the selected categories', () => {
  const set = core.buildCharset({ upper: true, digits: true });
  assert.ok(set.includes('A') && set.includes('5'));
  assert.ok(!/[a-z]/.test(set));
  assert.ok(!/[!@#]/.test(set));
});
test('excludeAmbiguous strips I/l/1/O/0', () => {
  const set = core.buildCharset({ upper: true, lower: true, digits: true, excludeAmbiguous: true });
  for (const ch of core.AMBIGUOUS) {
    assert.ok(!set.includes(ch), `${ch} should have been stripped`);
  }
});

console.log('generatePassword');
test('returns null when nothing is selected', () => {
  assert.strictEqual(core.generatePassword({ length: 12 }), null);
});
test('respects requested length', () => {
  const pw = core.generatePassword({ length: 20, upper: true, lower: true, digits: true, symbols: true });
  assert.strictEqual(pw.length, 20);
});
test('includes at least one char from every selected category', () => {
  for (let i = 0; i < 200; i++) {
    const pw = core.generatePassword({ length: 12, upper: true, lower: true, digits: true, symbols: true });
    const types = core.detectCharTypes(pw);
    assert.ok(types.upper && types.lower && types.digits && types.symbols, pw);
  }
});
test('custom charset ignores checkbox categories', () => {
  const pw = core.generatePassword({ length: 10, custom: 'ab', upper: true });
  assert.ok(/^[ab]+$/.test(pw), pw);
});
test('does not crash when length < number of selected categories', () => {
  const pw = core.generatePassword({ length: 2, upper: true, lower: true, digits: true, symbols: true });
  assert.strictEqual(pw.length, 2);
});

console.log('generatePassphrase');
test('joins the requested word count with a separator', () => {
  const phrase = core.generatePassphrase({ wordCount: 5, separator: '-' });
  assert.strictEqual(phrase.split('-').length, 5);
});
test('appends a 0-999 number when requested', () => {
  const phrase = core.generatePassphrase({ wordCount: 3, includeNumber: true });
  assert.ok(/\d{1,3}$/.test(phrase), phrase);
});

console.log('entropy math');
test('password entropy scales with length', () => {
  const short = core.passwordEntropyBits(8, 26);
  const long = core.passwordEntropyBits(16, 26);
  assert.ok(long > short * 1.9);
});
test('passphrase entropy matches wordCount * log2(listSize)', () => {
  const bits = core.passphraseEntropyBits(4, 56, false);
  assert.ok(Math.abs(bits - 4 * Math.log2(56)) < 1e-9);
});
test('classifyStrength buckets correctly', () => {
  assert.strictEqual(core.classifyStrength(20).label, 'Weak');
  assert.strictEqual(core.classifyStrength(50).label, 'Medium');
  assert.strictEqual(core.classifyStrength(90).label, 'Strong');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
