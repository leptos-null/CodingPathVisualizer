# CodingPathVisualizer

A website where developers paste JSON and a Swift `DecodingError` string, and the site visualizes exactly where in the JSON decoding failed — highlighting the node at the error's `codingPath`.

## Structure

```
site/                    Vanilla HTML/CSS/JS — no build step. Hosted on GitHub Pages.
  index.html             Single-page app entry point
  app.js                 Controller: live-updates on input, loads fixtures, adapts parser output to flat paths
  parser.js              Recursive descent parser for DecodingError description strings
  tree.js                JSON tree renderer; takes flat (string|number)[] highlight path
  style.css              All styling
  fixtures/*.json        Generated fixture files used as "Try an example" inputs
tests/                   Unit tests for the parser
  parser.test.js         Loads fixture files at runtime; defines expected outputs and static edge-case tests
  index.html             Browser-based test runner
  run.js                 CLI test runner: bun tests/run.js
fixtures/                Swift Package that generates real DecodingError strings as fixture files
```

## Development

- **No build step.** Serve `site/` with any static server (e.g. `python3 -m http.server -d site`).
- **Regenerate fixtures:** `cd fixtures && swift run Fixtures ../site/fixtures`
- **Run tests (CLI):** `bun tests/run.js` — requires Bun (not Node; Node's `fetch` doesn't support `file://` URLs)
- **Run tests (browser):** open `tests/index.html` via a static server, not directly as a file (same `file://` fetch restriction applies)

## Architecture notes

- `parser.js` outputs `{ errorCase, codingPath: [{key}|{index}][], ... }`. `app.js` converts this to a flat `(string|number)[]` via `toFlatPath()` before passing to `tree.js` and `resolvePath()`.
- Adding a fixture requires: a new `generate*()` function in `fixtures/Sources/Fixtures/Fixtures.swift`, running `swift run Fixtures`, adding the filename to `FIXTURES` in `app.js` (if it should appear as an example), and adding the ID + expected output to `tests/parser.test.js`.
- `site/fixtures/invalid-json.json` exists for test coverage only and is intentionally excluded from the `FIXTURES` array in `app.js` (it can't be visualised). Do not add it there.
