# Password Generator

A small, dependency-free password/passphrase generator. Client-side only —
nothing you generate here ever leaves the browser.

## Features

- Password mode: length 4–64, toggle upper/lower/digits/symbols, optional
  "skip ambiguous characters" (`I l 1 O 0`), optional custom character set
- Passphrase mode: 3–10 dictionary words, optional trailing number
- Strength meter driven by actual entropy (bits), not a guess
- Session-only history (see [Why no localStorage for history](#why-no-localstorage-for-history))
- Export the current value as JSON or CSV
- Light/dark theme, keyboard accessible, screen-reader-friendly live regions

## Architecture

```
core.js      pure functions: RNG, charset building, generation, entropy math
             (no DOM — runs in Node or the browser unchanged)
script.js    DOM wiring only: reads inputs, calls core.js, updates the page
tests.js     node tests.js — unit tests for core.js
index.html   markup
style.css    styling
```

Splitting generation logic out of the DOM code means the interesting part —
"is this random, and is this entropy number actually correct" — can be unit
tested without a browser or a mocking framework:

```bash
node tests.js
```

## Notable implementation decisions

**Cryptographically secure randomness.** Password characters, passphrase
words, and the shuffle step are all drawn using `crypto.getRandomValues`
with rejection sampling (not `Math.random`, and not a naive `% modulus`,
which biases toward smaller values whenever the modulus doesn't evenly
divide the RNG's range). See `secureRandomInt` in `core.js`.

**Entropy math, not a lookup table.** The strength meter computes
`length * log2(charset size)` for passwords and
`wordCount * log2(wordlist size)` for passphrases, then buckets the result
into Weak / Medium / Strong at 40 and 70 bits. The previous version scored
password strength by counting checked boxes, which had two consequences:
a checkbox-based score didn't actually reflect the password's entropy, and
it silently reused password-mode checkbox state to score passphrases,
which use no character-set checkboxes at all.

**Guaranteed category coverage.** When multiple character types are
selected, generation seeds one character from each before filling the rest
and shuffling — so a 20-character password with all four types enabled
can't come back all-digits by chance.

### Why no localStorage for history

A password tool that quietly writes generated secrets to disk (even
`localStorage`, even on "your own machine") is a worse tool than one that
doesn't. History here lives in a page-lifetime JS variable — useful if
you generate five and want to compare, gone the moment you reload or
close the tab.

## Word list

The passphrase word list is a curated set of 301 words (~8.2 bits/word).
An earlier draft shipped with only 56 words, which meant even the
maximum 10-word passphrase capped out around 58 bits — never enough to
clear the "Strong" threshold, and the default 4-word passphrase was
always "Weak" regardless of the other settings. With 301 words the
slider (3–12 words, default 6) now spans the full Weak → Medium → Strong
range the way the password side already did.

For anything beyond a demo, swap in the
[EFF long word list](https://www.eff.org/dice) (7,776 words, ~12.9
bits/word) — `generatePassphrase` in `core.js` just indexes into
`WORD_LIST`, so it's a one-array swap.

## Running locally

No build step.

```bash
npx serve .
# or just open index.html directly
```

## Tests

```bash
node tests.js
```

Covers: RNG range and coverage, charset construction (including the
ambiguous-character filter), password generation invariants (length,
category coverage, custom charset override), passphrase construction, and
the entropy formulas the strength meter depends on.

## File structure

```
PasswordGenerator/
├── index.html
├── style.css
├── script.js
├── core.js
├── tests.js
└── README.md
```

## Possible next steps

- [ ] Swap in the EFF long word list
- [ ] Common-password / dictionary-pattern check (e.g. reject `Password1!`)
- [ ] PWA support for offline use

## Author

**Aseef**