/**
 * core.js
 * -------
 * All the logic that doesn't need a DOM lives here: random number
 * generation, character sets, password/passphrase construction, and
 * the entropy math behind the strength meter.
 *
 * Keeping this separate from script.js means it can be loaded in
 * Node with no shimming and covered by tests.js. See tests.js.
 */

(function (root) {
  'use strict';

  var CHARSETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    // Kept deliberately conservative: characters like backslash or
    // backtick break plenty of shells/CSV importers if someone
    // pastes a generated password into the wrong place.
    symbols: '!@#$%^&*()_+-=[]{};:,.<>?'
  };

  // Visually ambiguous glyphs people mistype when copying by hand.
  var AMBIGUOUS = 'Il1O0';

  // Small curated list. Good enough for a demo; the EFF long word
  // list (7776 words) would give ~12.9 bits/word instead of the
  // ~5.8 bits/word this list gives - worth swapping in for anything
  // beyond a portfolio project.
  var WORD_LIST = [
    'apple', 'banana', 'cherry', 'dolphin', 'elephant', 'forest', 'guitar', 'horizon',
    'island', 'jungle', 'knight', 'lighthouse', 'mountain', 'nature', 'ocean', 'piano',
    'quantum', 'rainbow', 'sunset', 'tiger', 'universe', 'volcano', 'waterfall', 'xylophone',
    'yacht', 'zebra', 'adventure', 'butterfly', 'crystal', 'dragon', 'eclipse', 'firefly',
    'galaxy', 'harmony', 'infinity', 'journey', 'kingdom', 'legend', 'mystery', 'nebula',
    'oracle', 'phoenix', 'quest', 'river', 'serenity', 'thunder', 'utopia', 'vortex',
    'whisper', 'zenith', 'aurora', 'blossom', 'cascade', 'destiny', 'eternity', 'freedom'
  ];

  /**
   * Cryptographically secure integer in [0, maxExclusive).
   * Uses rejection sampling so the result is uniform - a plain
   * `randomBytes % max` biases toward smaller numbers whenever max
   * doesn't evenly divide 256/2^32.
   */
  function secureRandomInt(maxExclusive) {
    if (maxExclusive <= 0) throw new RangeError('maxExclusive must be > 0');
    if (maxExclusive === 1) return 0;

    var cryptoObj = (typeof root !== 'undefined' && root.crypto) ||
      (typeof globalThis !== 'undefined' && globalThis.crypto);

    if (!cryptoObj || !cryptoObj.getRandomValues) {
      // Node < 19 test environments without the Web Crypto global.
      // Not used in the browser build; only a safety net for tests.
      var nodeCrypto = typeof require === 'function' ? require('crypto') : null;
      if (nodeCrypto) {
        var range = maxExclusive;
        var bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
        var maxValid = Math.floor(256 ** bytesNeeded / range) * range;
        var val;
        do {
          val = nodeCrypto.randomBytes(bytesNeeded).reduce(function (acc, b) {
            return acc * 256 + b;
          }, 0);
        } while (val >= maxValid);
        return val % range;
      }
      throw new Error('No secure random source available');
    }

    var range32 = Math.ceil(maxExclusive / 4294967296) === 1 ? 4294967296 : null;
    var arr = new Uint32Array(1);
    var limit = Math.floor(4294967296 / maxExclusive) * maxExclusive;
    var value;
    do {
      cryptoObj.getRandomValues(arr);
      value = arr[0];
    } while (value >= limit);
    return value % maxExclusive;
  }

  /** Fisher-Yates shuffle driven by secureRandomInt. */
  function secureShuffle(items) {
    var arr = items.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = secureRandomInt(i + 1);
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function secureShuffleString(str) {
    return secureShuffle(str.split('')).join('');
  }

  function stripAmbiguous(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      if (AMBIGUOUS.indexOf(str[i]) === -1) out += str[i];
    }
    return out;
  }

  /**
   * Builds the pool of characters generation draws from, honoring
   * the "exclude ambiguous characters" toggle. Returns '' if nothing
   * is selected so callers can treat that as an error state.
   */
  function buildCharset(opts) {
    opts = opts || {};
    var pool = '';
    if (opts.upper) pool += CHARSETS.upper;
    if (opts.lower) pool += CHARSETS.lower;
    if (opts.digits) pool += CHARSETS.digits;
    if (opts.symbols) pool += CHARSETS.symbols;
    if (opts.excludeAmbiguous) pool = stripAmbiguous(pool);
    return pool;
  }

  /**
   * Generates a password. When `custom` is a non-empty string it's
   * used verbatim as the character pool (checkboxes are ignored -
   * that's the documented behavior, not a bug: it's how you'd
   * generate e.g. a PIN from '0123456789').
   *
   * Guarantees at least one character from every selected category
   * (skipped in custom mode, since there are no categories) so a
   * long password can't accidentally end up all-digits by chance.
   *
   * Returns null when there's nothing to draw from.
   */
  function generatePassword(opts) {
    opts = opts || {};
    var length = opts.length || 16;
    var custom = (opts.custom || '').trim();

    if (custom.length > 0) {
      var pool = opts.excludeAmbiguous ? stripAmbiguous(custom) : custom;
      if (pool.length === 0) return null;
      var chars = [];
      for (var i = 0; i < length; i++) {
        chars.push(pool[secureRandomInt(pool.length)]);
      }
      return secureShuffleString(chars.join(''));
    }

    var categories = [];
    if (opts.upper) categories.push(opts.excludeAmbiguous ? stripAmbiguous(CHARSETS.upper) : CHARSETS.upper);
    if (opts.lower) categories.push(opts.excludeAmbiguous ? stripAmbiguous(CHARSETS.lower) : CHARSETS.lower);
    if (opts.digits) categories.push(opts.excludeAmbiguous ? stripAmbiguous(CHARSETS.digits) : CHARSETS.digits);
    if (opts.symbols) categories.push(opts.excludeAmbiguous ? stripAmbiguous(CHARSETS.symbols) : CHARSETS.symbols);

    var full = buildCharset(opts);
    if (full.length === 0 || categories.length === 0) return null;
    if (length < categories.length) {
      // Can't guarantee one-of-each in fewer slots than categories;
      // fall back to plain random draws rather than crashing.
      var out = '';
      for (var k = 0; k < length; k++) out += full[secureRandomInt(full.length)];
      return out;
    }

    var result = categories.map(function (cat) {
      return cat[secureRandomInt(cat.length)];
    });
    for (var j = result.length; j < length; j++) {
      result.push(full[secureRandomInt(full.length)]);
    }
    return secureShuffleString(result.join(''));
  }

  function generatePassphrase(opts) {
    opts = opts || {};
    var wordCount = opts.wordCount || 4;
    var separator = opts.separator || '-';
    var words = [];
    for (var i = 0; i < wordCount; i++) {
      words.push(WORD_LIST[secureRandomInt(WORD_LIST.length)]);
    }
    var phrase = words.join(separator);
    if (opts.includeNumber) {
      phrase += secureRandomInt(1000).toString();
    }
    return phrase;
  }

  function detectCharTypes(str) {
    return {
      upper: /[A-Z]/.test(str),
      lower: /[a-z]/.test(str),
      digits: /[0-9]/.test(str),
      symbols: /[^A-Za-z0-9]/.test(str)
    };
  }

  /** Shannon entropy estimate for a random draw from a fixed-size pool. */
  function passwordEntropyBits(length, charsetSize) {
    if (charsetSize <= 0) return 0;
    return length * Math.log2(charsetSize);
  }

  /** Entropy for a passphrase: each word contributes log2(wordListSize) bits. */
  function passphraseEntropyBits(wordCount, wordListSize, includeNumber) {
    var bits = wordCount * Math.log2(wordListSize);
    if (includeNumber) bits += Math.log2(1000);
    return bits;
  }

  /**
   * Buckets an entropy value into a human strength label. These
   * cutoffs follow the common "bits of entropy" guidance (roughly:
   * <40 bits is crackable by a determined attacker in a reasonable
   * offline-attack budget, 40-69 is adequate for most accounts,
   * 70+ is comfortable even against fast offline hash cracking).
   */
  function classifyStrength(bits) {
    if (bits < 40) return { label: 'Weak', level: 0 };
    if (bits < 70) return { label: 'Medium', level: 1 };
    return { label: 'Strong', level: 2 };
  }

  var api = {
    CHARSETS: CHARSETS,
    AMBIGUOUS: AMBIGUOUS,
    WORD_LIST: WORD_LIST,
    secureRandomInt: secureRandomInt,
    secureShuffle: secureShuffle,
    secureShuffleString: secureShuffleString,
    stripAmbiguous: stripAmbiguous,
    buildCharset: buildCharset,
    generatePassword: generatePassword,
    generatePassphrase: generatePassphrase,
    detectCharTypes: detectCharTypes,
    passwordEntropyBits: passwordEntropyBits,
    passphraseEntropyBits: passphraseEntropyBits,
    classifyStrength: classifyStrength
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PasswordCore = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
