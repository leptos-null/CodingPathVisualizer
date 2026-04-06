# CodingPath Visualizer

Paste JSON and a Swift `DecodingError` string, and see exactly which node in the JSON tree caused the failure.

## Usage

1. Paste your JSON payload into the **JSON** field.
2. Paste the output of `String(describing: error)` for a `DecodingError` into the **DecodingError** field.
3. The tree view highlights the node at the error's `codingPath`. For `keyNotFound` errors, the missing key is shown as a ghost entry.

Click any of the built-in examples to see it in action.

### Supported error cases

| Case | What it highlights |
|---|---|
| `typeMismatch` | The value that had the wrong type |
| `valueNotFound` | The `null` where a value was expected |
| `keyNotFound` | The parent object, with the missing key shown inline |
| `dataCorrupted` | The value that couldn't be parsed |

## Development

No build step required. Serve `site/` with any static server:

```sh
python3 -m http.server -d site
```

### Run tests

```sh
bun tests/run.js
```

Requires [Bun](<https://bun.sh>) (Node's `fetch` doesn't support `file://` URLs).
Tests can also be run in the browser by opening `tests/index.html` through a local server.

### Regenerate fixtures

The `fixtures/` directory is a Swift Package that produces real `DecodingError` strings by decoding intentionally malformed JSON. To regenerate:

```sh
cd fixtures && swift run Fixtures ../site/fixtures
```
