import { parseDecodingError } from "../site/parser.js";

const FIXTURE_IDS = [
    "type-mismatch",
    "value-not-found",
    "key-not-found",
    "data-corrupted",
    "array-index",
    "invalid-json",
];

// Expected parse result for each fixture, keyed by fixture ID.
// The input (error string) is loaded from the fixture file at test time.
const EXPECTED = {
    "type-mismatch": {
        errorCase: "typeMismatch",
        expectedType: "Swift.Int",
        codingKey: null,
        codingPath: [{ key: "user" }, { key: "age" }],
        debugDescription: "Expected to decode Int but found a string instead.",
    },
    "value-not-found": {
        errorCase: "valueNotFound",
        expectedType: "Swift.String",
        codingKey: null,
        codingPath: [{ key: "user" }, { key: "email" }],
        debugDescription: "Cannot get value of type String -- found null value instead",
    },
    "key-not-found": {
        errorCase: "keyNotFound",
        expectedType: null,
        codingKey: { key: "email" },
        codingPath: [{ key: "user" }],
        debugDescription: `No value associated with key CodingKeys(stringValue: "email", intValue: nil) ("email").`,
    },
    "data-corrupted": {
        errorCase: "dataCorrupted",
        expectedType: null,
        codingKey: null,
        codingPath: [{ key: "events" }, { index: 0 }],
        debugDescription: "Expected date string to be ISO8601-formatted.",
    },
    "array-index": {
        errorCase: "typeMismatch",
        expectedType: "Swift.Int",
        codingKey: null,
        codingPath: [{ key: "scores" }, { index: 2 }],
        debugDescription: "Expected to decode Int but found a string instead.",
    },
    "invalid-json": {
        errorCase: "dataCorrupted",
        expectedType: null,
        codingKey: null,
        codingPath: [],
        debugDescription: "The given data was not valid JSON.",
    },
};

const STATIC_TESTS = [
    {
        name: "invalid input returns null",
        input: "this is not a decoding error",
        expected: null,
    },
    {
        name: "empty string returns null",
        input: "",
        expected: null,
    },
];

export async function loadTests() {
    const fixtureTests = await Promise.all(
        FIXTURE_IDS.map(async (id) => {
            const expected = EXPECTED[id];
            if (!expected) {
                throw new Error(`No expected output defined for fixture: ${id}`);
            }
            const url = new URL(`../site/fixtures/${id}.json`, import.meta.url);
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`Failed to load fixture: ${id}.json (${resp.status})`);
            }
            const fixture = await resp.json();

            return { name: fixture.name, input: fixture.error, expected };
        })
    );
    return [...fixtureTests, ...STATIC_TESTS];
}

export function runTests(tests) {
    const results = [];
    for (const test of tests) {
        const actual = parseDecodingError(test.input);
        const pass = deepEqual(actual, test.expected);
        results.push({ name: test.name, pass, actual, expected: test.expected });
    }
    return results;
}

function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        return a.every((v, i) => deepEqual(v, b[i]));
    }
    if (typeof a === "object" && typeof b === "object") {
        const keysA = Object.keys(a);
        if (keysA.length !== Object.keys(b).length) return false;
        return keysA.every(k => k in b && deepEqual(a[k], b[k]));
    }
    return false;
}
