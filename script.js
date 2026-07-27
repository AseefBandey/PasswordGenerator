// script.js
// ---------
// Wires the DOM to the pure functions in core.js. No generation or
// entropy math lives here on purpose - see core.js and tests.js.

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    passwordOutput: $('passwordOutput'),
    copyBtn: $('copyBtn'),
    generateBtn: $('generateBtn'),
    themeToggle: $('themeToggle'),
    tabs: document.querySelectorAll('.tab'),
    passwordOptions: $('passwordOptions'),
    passphraseControls: $('passphraseControls'),
    lengthSlider: $('lengthSlider'),
    lengthValue: $('lengthValue'),
    uppercase: $('uppercase'),
    lowercase: $('lowercase'),
    numbers: $('numbers'),
    symbols: $('symbols'),
    excludeAmbiguous: $('excludeAmbiguous'),
    customCharset: $('customCharset'),
    wordCountSlider: $('wordCountSlider'),
    wordCountValue: $('wordCountValue'),
    includeNumbers: $('includeNumbers'),
    strengthFill: $('strengthFill'),
    strengthText: $('strengthText'),
    toggleDetailsBtn: $('toggleDetailsBtn'),
    strengthDetails: $('strengthDetails'),
    lengthScore: $('lengthScore'),
    varietyScore: $('varietyScore'),
    entropyScore: $('entropyScore'),
    charTypes: $('charTypes'),
    exportJsonBtn: $('exportJsonBtn'),
    exportCsvBtn: $('exportCsvBtn'),
    historyList: $('historyList'),
    clearHistoryBtn: $('clearHistoryBtn')
  };

  var state = {
    mode: 'password',
    lastValue: '',
    lastMeta: null,
    // Deliberately in-memory only. Persisting generated passwords to
    // localStorage would mean a secret sitting in plaintext on disk
    // long after the tab is closed - not a trade-off a password tool
    // should make quietly.
    history: []
  };

  // ---------- theme ----------
  function initTheme() {
    var saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    els.themeToggle.setAttribute('aria-pressed', String(saved === 'dark'));
  }
  function toggleTheme() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    els.themeToggle.setAttribute('aria-pressed', String(next === 'dark'));
    els.themeToggle.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  initTheme();
  els.themeToggle.addEventListener('click', toggleTheme);

  // ---------- mode tabs ----------
  function setMode(mode) {
    state.mode = mode;
    els.tabs.forEach(function (tab) {
      var active = tab.dataset.mode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    els.passwordOptions.hidden = mode !== 'password';
    els.passphraseControls.hidden = mode !== 'passphrase';
    generate();
  }
  els.tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { setMode(tab.dataset.mode); });
  });

  // ---------- option readers ----------
  function readPasswordOptions() {
    return {
      length: parseInt(els.lengthSlider.value, 10),
      upper: els.uppercase.checked,
      lower: els.lowercase.checked,
      digits: els.numbers.checked,
      symbols: els.symbols.checked,
      excludeAmbiguous: els.excludeAmbiguous.checked,
      custom: els.customCharset.value
    };
  }
  function readPassphraseOptions() {
    return {
      wordCount: parseInt(els.wordCountSlider.value, 10),
      includeNumber: els.includeNumbers.checked,
      separator: '-'
    };
  }

  // ---------- entropy / strength for the *current settings*, so the
  // meter updates live as sliders/checkboxes move, before Generate
  // is even clicked ----------
  function currentEntropyBits() {
    if (state.mode === 'passphrase') {
      var pOpts = readPassphraseOptions();
      return PasswordCore.passphraseEntropyBits(pOpts.wordCount, PasswordCore.WORD_LIST.length, pOpts.includeNumber);
    }
    var opts = readPasswordOptions();
    var custom = opts.custom.trim();
    var poolSize = custom.length > 0
      ? new Set(opts.excludeAmbiguous ? PasswordCore.stripAmbiguous(custom) : custom).size
      : PasswordCore.buildCharset(opts).length;
    return PasswordCore.passwordEntropyBits(opts.length, poolSize);
  }

  function renderStrength(bits, charTypesLabel) {
    var result = PasswordCore.classifyStrength(bits);
    var labels = ['weak', 'medium', 'strong'];
    var cls = labels[result.level];

    els.strengthFill.className = 'strength-fill ' + cls;
    els.strengthText.className = 'strength-text ' + cls;
    els.strengthText.textContent = result.label;

    els.entropyScore.textContent = bits.toFixed(1) + ' bits';
    if (state.mode === 'passphrase') {
      var pOpts = readPassphraseOptions();
      els.lengthScore.textContent = pOpts.wordCount + ' words';
      els.varietyScore.textContent = pOpts.includeNumber ? 'words + number' : 'words only';
    } else {
      var opts = readPasswordOptions();
      els.lengthScore.textContent = opts.length + ' chars';
      var count = [opts.upper, opts.lower, opts.digits, opts.symbols].filter(Boolean).length;
      els.varietyScore.textContent = count + ' / 4 sets';
    }
    els.charTypes.textContent = charTypesLabel || '—';
  }

  // ---------- generation ----------
  function generate() {
    var value, charTypesLabel;

    if (state.mode === 'passphrase') {
      value = PasswordCore.generatePassphrase(readPassphraseOptions());
      charTypesLabel = 'lowercase words' + (readPassphraseOptions().includeNumber ? ' + number' : '');
    } else {
      var opts = readPasswordOptions();
      value = PasswordCore.generatePassword(opts);
      if (value) {
        var types = PasswordCore.detectCharTypes(value);
        charTypesLabel = Object.keys(types).filter(function (k) { return types[k]; }).join(', ') || 'none';
      }
    }

    if (!value) {
      els.passwordOutput.value = '';
      els.passwordOutput.placeholder = 'select at least one character set';
      renderStrength(0, '—');
      return;
    }

    els.passwordOutput.value = value;
    state.lastValue = value;
    state.lastMeta = { mode: state.mode, generatedAt: new Date().toISOString() };

    renderStrength(currentEntropyBits(), charTypesLabel);
    addToHistory(value);
  }

  // ---------- live strength preview while adjusting controls ----------
  function previewStrength() {
    // Only touches the meter, never regenerates the value in the box.
    var bits = currentEntropyBits();
    var placeholderTypes = state.mode === 'passphrase'
      ? 'lowercase words' + (readPassphraseOptions().includeNumber ? ' + number' : '')
      : (function () {
          var o = readPasswordOptions();
          var picked = [];
          if (o.upper) picked.push('upper');
          if (o.lower) picked.push('lower');
          if (o.digits) picked.push('digits');
          if (o.symbols) picked.push('symbols');
          return picked.join(', ') || 'none';
        })();
    renderStrength(bits, placeholderTypes);
  }

  [els.lengthSlider, els.uppercase, els.lowercase, els.numbers, els.symbols, els.excludeAmbiguous]
    .forEach(function (el) { el.addEventListener('input', previewStrength); });
  els.lengthSlider.addEventListener('input', function () { els.lengthValue.textContent = els.lengthSlider.value; });
  els.wordCountSlider.addEventListener('input', function () {
    els.wordCountValue.textContent = els.wordCountSlider.value;
    previewStrength();
  });
  els.includeNumbers.addEventListener('input', previewStrength);
  els.customCharset.addEventListener('input', previewStrength);

  // ---------- strength details toggle ----------
  els.toggleDetailsBtn.addEventListener('click', function () {
    var open = els.strengthDetails.hidden;
    els.strengthDetails.hidden = !open;
    els.toggleDetailsBtn.textContent = open ? 'hide details' : 'show details';
    els.toggleDetailsBtn.setAttribute('aria-expanded', String(open));
  });

  // ---------- copy ----------
  async function copyToClipboard() {
    if (!state.lastValue) return;
    try {
      await navigator.clipboard.writeText(state.lastValue);
    } catch (err) {
      els.passwordOutput.select();
      document.execCommand('copy');
    }
    els.copyBtn.classList.add('copied');
    setTimeout(function () { els.copyBtn.classList.remove('copied'); }, 1500);
  }

  // ---------- export ----------
  function download(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    if (!state.lastValue) return;
    var data = {
      value: state.lastValue,
      mode: state.lastMeta.mode,
      length: state.lastValue.length,
      strength: els.strengthText.textContent,
      entropyBits: els.entropyScore.textContent,
      generatedAt: state.lastMeta.generatedAt
    };
    download('password-' + Date.now() + '.json', JSON.stringify(data, null, 2), 'application/json');
  }

  function exportCSV() {
    if (!state.lastValue) return;
    var rows = [
      ['value', 'mode', 'length', 'strength', 'entropy_bits', 'generated_at'],
      [state.lastValue, state.lastMeta.mode, state.lastValue.length, els.strengthText.textContent, els.entropyScore.textContent, state.lastMeta.generatedAt]
    ];
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    download('password-' + Date.now() + '.csv', csv, 'text/csv');
  }

  // ---------- session history ----------
  function addToHistory(value) {
    state.history.unshift({ value: value, mode: state.mode, at: Date.now() });
    state.history = state.history.slice(0, 8);
    renderHistory();
  }

  function renderHistory() {
    els.historyList.innerHTML = '';
    if (state.history.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'history-empty';
      empty.textContent = 'nothing generated yet';
      els.historyList.appendChild(empty);
      return;
    }
    state.history.forEach(function (entry) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      span.textContent = entry.value;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'copy';
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(entry.value).catch(function () {});
      });
      li.appendChild(span);
      li.appendChild(btn);
      els.historyList.appendChild(li);
    });
  }

  els.clearHistoryBtn.addEventListener('click', function () {
    state.history = [];
    renderHistory();
  });

  // ---------- wire up generate / copy / export ----------
  els.generateBtn.addEventListener('click', generate);
  els.copyBtn.addEventListener('click', copyToClipboard);
  els.exportJsonBtn.addEventListener('click', exportJSON);
  els.exportCsvBtn.addEventListener('click', exportCSV);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && document.activeElement !== els.customCharset) {
      generate();
    }
  });

  // ---------- boot ----------
  renderHistory();
  generate();
})();
