import { parseDecodingError } from "./parser.js";
import { renderJson } from "./tree.js";

const jsonInput = document.getElementById("json-input");
const errorInput = document.getElementById("error-input");
const output = document.getElementById("output");
const pathDisplay = document.getElementById("path-display");
const examplesContainer = document.getElementById("examples");

const FIXTURES = [
    "type-mismatch.json",
    "value-not-found.json",
    "key-not-found.json",
    "data-corrupted.json",
    "array-index.json",
];

async function loadFixtures() {
    const results = await Promise.allSettled(
        FIXTURES.map(f => fetch(`fixtures/${f}`).then(r => r.ok ? r.json() : null))
    );
    for (const result of results) {
        if (result.status !== "fulfilled" || !result.value) continue;
        const fixture = result.value;
        const btn = document.createElement("button");
        btn.textContent = fixture.name;
        btn.addEventListener("click", () => {
            jsonInput.value = fixture.json.trim();
            errorInput.value = fixture.error;
            update();
        });
        examplesContainer.appendChild(btn);
    }
}

// Converts the parser's [{key}|{index}] segments to a flat string|number array
// compatible with resolvePath and renderJson.
function toFlatPath(codingPath) {
    return codingPath.map(seg => "key" in seg ? seg.key : seg.index);
}

function flatPathToString(flatPath) {
    return flatPath
        .map(p => (typeof p === "number" ? `[${p}]` : `.${p}`))
        .join("")
        .replace(/^\./, "");
}

function resolvePath(json, path) {
    let current = json;
    for (const key of path) {
        if (current === null || current === undefined) return false;
        if (typeof key === "number") {
            if (!Array.isArray(current) || key < 0 || key >= current.length) return false;
            current = current[key];
        } else {
            if (typeof current !== "object" || Array.isArray(current)) return false;
            if (!(key in current)) return false;
            current = current[key];
        }
    }
    return true;
}

function update() {
    const jsonText = jsonInput.value.trim();
    const errorText = errorInput.value.trim();

    if (!jsonText) {
        pathDisplay.hidden = true;
        setOutputMessage("Paste JSON above to get started.", "output-placeholder");
        return;
    }

    let jsonValue;
    try {
        jsonValue = JSON.parse(jsonText);
    } catch (e) {
        pathDisplay.hidden = true;
        setOutputMessage(`JSON parse error: ${e.message}`, "output-error");
        return;
    }

    if (!errorText) {
        pathDisplay.hidden = false;
        pathDisplay.className = "path-display hint";
        pathDisplay.replaceChildren();
        const hint = document.createElement("div");
        hint.className = "path-message";
        hint.textContent = "Enter a DecodingError above to highlight the failing node.";
        pathDisplay.appendChild(hint);
        renderTree(jsonValue, null, null);
        return;
    }

    const parsed = parseDecodingError(errorText);

    if (!parsed) {
        pathDisplay.hidden = false;
        pathDisplay.className = "path-display error-mismatch";
        pathDisplay.replaceChildren();
        const msg = document.createElement("div");
        msg.className = "path-label";
        msg.textContent = "Could not parse this DecodingError string.";
        pathDisplay.appendChild(msg);
        renderTree(jsonValue, null, null);
        return;
    }

    const flatPath = toFlatPath(parsed.codingPath);
    const missingKey = parsed.codingKey && "key" in parsed.codingKey ? parsed.codingKey.key : null;

    if (!resolvePath(jsonValue, flatPath)) {
        const pathStr = flatPathToString(flatPath);
        pathDisplay.hidden = false;
        pathDisplay.className = "path-display error-mismatch";
        pathDisplay.replaceChildren();
        const msg = document.createElement("div");
        msg.className = "path-label";
        msg.textContent = pathStr
            ? `Path "${pathStr}" does not exist in this JSON - does this error belong to a different payload?`
            : "The coding path does not exist in this JSON - does this error belong to a different payload?";
        pathDisplay.appendChild(msg);
        renderTree(jsonValue, null, null);
        return;
    }

    renderPathDisplay(parsed.errorCase, flatPath, missingKey, parsed.debugDescription);
    renderTree(jsonValue, flatPath, missingKey);
}

function renderPathDisplay(errorCase, flatPath, missingKey, debugDescription) {
    pathDisplay.hidden = false;
    pathDisplay.className = `path-display error-${errorCase}`;
    pathDisplay.replaceChildren();

    const pathStr = flatPathToString(flatPath);

    const label = document.createElement("div");
    label.className = "path-label";

    const typeTag = document.createElement("span");
    typeTag.className = "error-type-tag";
    typeTag.textContent = errorCase;
    label.appendChild(typeTag);

    const pathSegment = document.createElement("span");
    pathSegment.className = "path-segment";
    pathSegment.textContent = pathStr ? ` at ${pathStr}` : " at root";
    label.appendChild(pathSegment);

    if (missingKey) {
        const missingSpan = document.createElement("span");
        missingSpan.className = "missing-key-label";
        missingSpan.textContent = ` - missing key "${missingKey}"`;
        label.appendChild(missingSpan);
    }

    pathDisplay.appendChild(label);

    if (debugDescription) {
        const msg = document.createElement("div");
        msg.className = "path-message";
        msg.textContent = debugDescription;
        pathDisplay.appendChild(msg);
    }
}

function renderTree(jsonValue, highlightPath, missingKey) {
    output.replaceChildren();
    const tree = document.createElement("div");
    tree.className = "json-tree";
    tree.appendChild(renderJson(jsonValue, [], highlightPath, missingKey));
    output.appendChild(tree);
}

function setOutputMessage(text, className) {
    output.replaceChildren();
    const div = document.createElement("div");
    div.className = className;
    div.textContent = text;
    output.appendChild(div);
}

jsonInput.addEventListener("input", update);
errorInput.addEventListener("input", update);

loadFixtures();
update();
