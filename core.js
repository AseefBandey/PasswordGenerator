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

  // 301 unique words -> log2(301) ≈ 8.23 bits/word. Big enough that
  // a 6-word default passphrase clears the "Medium" bar on its own
  // merits, instead of needing an unrealistic word count to do it.
  // The EFF long word list (7776 words, ~12.9 bits/word) is a
  // drop-in upgrade for anything beyond a portfolio project - swap
  // the array, nothing else changes.
  var WORD_LIST = [
    'adder', 'adventure', 'almond', 'amber', 'ampere', 'anchor', 'apple', 'apricot', 'archery', 'archipelago',
    'argon', 'ash', 'aspen', 'atoll', 'aurora', 'azimuth', 'badger', 'banana', 'basalt', 'basil',
    'beacon', 'beaver', 'birch', 'blossom', 'boron', 'boulder', 'breeze', 'bridge', 'bronze', 'buffer',
    'butterfly', 'buzzard', 'canyon', 'caraway', 'carbon', 'cardamom', 'cascade', 'castle', 'cavern', 'cedar',
    'cello', 'chameleon', 'cherry', 'chestnut', 'chord', 'chronicle', 'cipher', 'climbing', 'clove', 'cobra',
    'coconut', 'comet', 'compass', 'compile', 'condor', 'copper', 'coral', 'cosmos', 'coyote', 'crane',
    'crystal', 'cumin', 'current', 'cursor', 'cymbal', 'daemon', 'delta', 'destiny', 'diving', 'dock',
    'dolomite', 'dolphin', 'dragon', 'drum', 'dune', 'eagle', 'eclipse', 'elephant', 'elm', 'ember',
    'epic', 'equinox', 'estuary', 'eternity', 'fable', 'falcon', 'falconry', 'fencing', 'fennel', 'fern',
    'ferret', 'fig', 'finch', 'fir', 'firefly', 'firewall', 'fjord', 'flame', 'flute', 'forest',
    'freedom', 'frost', 'galaxy', 'gateway', 'gecko', 'ginger', 'glacier', 'gneiss', 'granite', 'gravel',
    'grotto', 'guava', 'guitar', 'harbor', 'harmony', 'harrier', 'hawk', 'hazel', 'helium', 'heron',
    'hertz', 'hiking', 'horizon', 'hull', 'iguana', 'infinity', 'iron', 'island', 'isthmus', 'jackal',
    'jade', 'joule', 'journey', 'jungle', 'keel', 'kelvin', 'kernel', 'kestrel', 'kingdom', 'kite',
    'knight', 'krypton', 'lagoon', 'lantern', 'larch', 'lark', 'latitude', 'legend', 'lighthouse', 'limestone',
    'lizard', 'longitude', 'lychee', 'lynx', 'mamba', 'mango', 'maple', 'marble', 'marten', 'mast',
    'matrix', 'meadow', 'melody', 'meridian', 'meteor', 'moss', 'mountain', 'mustard', 'mystery', 'myth',
    'nature', 'nebula', 'neon', 'newt', 'newton', 'nova', 'nutmeg', 'oak', 'obsidian', 'ocean',
    'ohm', 'onyx', 'oracle', 'orbit', 'osprey', 'otter', 'owl', 'oxygen', 'packet', 'panther',
    'papaya', 'paprika', 'pascal', 'pebble', 'peninsula', 'pepper', 'phoenix', 'piano', 'pier', 'pine',
    'pixel', 'plateau', 'plum', 'poplar', 'poppy', 'proverb', 'pulsar', 'pumice', 'python', 'quantum',
    'quartz', 'quartzite', 'quasar', 'quest', 'quince', 'raccoon', 'radon', 'rainbow', 'raven', 'reef',
    'relay', 'rhythm', 'riddle', 'ridge', 'river', 'robin', 'router', 'rowing', 'rudder', 'saffron',
    'saga', 'sail', 'sailing', 'salamander', 'sandstone', 'schist', 'script', 'serenity', 'sesame', 'shale',
    'silicon', 'silver', 'skiing', 'slate', 'smoke', 'socket', 'solstice', 'sonnet', 'spark', 'sparrow',
    'spruce', 'steam', 'stoat', 'storm', 'strait', 'summit', 'sunset', 'surfing', 'swallow', 'switch',
    'tesla', 'thrush', 'thunder', 'thyme', 'tide', 'tiger', 'token', 'tortoise', 'tower', 'trail',
    'tropic', 'trumpet', 'turmeric', 'turtle', 'universe', 'utopia', 'valley', 'vector', 'verse', 'vertex',
    'violin', 'viper', 'volcano', 'volt', 'vortex', 'voyage', 'vulture', 'walnut', 'waterfall', 'watt',
    'weasel', 'whisper', 'whistle', 'willow', 'wren', 'xenon', 'xylophone', 'yacht', 'yew', 'zebra',
    'zenith'
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