// JSON tree renderer with path-based highlighting.
//
// renderJson(value, currentPath, highlightPath, missingKey) -> HTMLElement
//
// highlightPath and currentPath are flat arrays of string|number.
// missingKey is a string used for keyNotFound to render a ghost entry.

export function renderJson(value, currentPath, highlightPath, missingKey) {
    const highlighted = highlightPath !== null && pathsEqual(currentPath, highlightPath);
    const onPath = highlightPath !== null && isStrictPrefix(currentPath, highlightPath);

    if (value === null) return makeToken("null", "null", highlighted);
    if (typeof value === "boolean") return makeToken(String(value), "boolean", highlighted);
    if (typeof value === "number") return makeToken(String(value), "number", highlighted);
    if (typeof value === "string") return makeToken(`"${jsonEscapeString(value)}"`, "string", highlighted);

    if (Array.isArray(value)) {
        return renderArray(value, currentPath, highlightPath, missingKey, highlighted, onPath);
    }
    if (typeof value === "object") {
        return renderObject(value, currentPath, highlightPath, missingKey, highlighted, onPath);
    }

    return makeToken(String(value), "unknown", highlighted);
}

function renderArray(arr, currentPath, highlightPath, missingKey, highlighted, onPath) {
    const el = document.createElement("div");
    el.className = cls("json-array", highlighted && "highlighted", onPath && "on-path");

    el.appendChild(makePunct("["));

    if (arr.length > 0) {
        const children = document.createElement("div");
        children.className = "json-children";
        arr.forEach((item, idx) => {
            const row = document.createElement("div");
            row.className = "json-row";

            const indexLabel = document.createElement("span");
            indexLabel.className = "json-index";
            indexLabel.textContent = String(idx);
            row.appendChild(indexLabel);

            const sep = document.createElement("span");
            sep.className = "json-sep";
            sep.textContent = ": ";
            row.appendChild(sep);

            row.appendChild(renderJson(item, [...currentPath, idx], highlightPath, missingKey));
            children.appendChild(row);
        });
        el.appendChild(children);
    }

    el.appendChild(makePunct("]"));
    return el;
}

function renderObject(obj, currentPath, highlightPath, missingKey, highlighted, onPath) {
    const el = document.createElement("div");
    el.className = cls("json-object", highlighted && "highlighted", onPath && "on-path");

    el.appendChild(makePunct("{"));

    const entries = Object.entries(obj);
    const showMissingKey = highlighted && missingKey !== null && !(missingKey in obj);

    if (entries.length > 0 || showMissingKey) {
        const children = document.createElement("div");
        children.className = "json-children";

        for (const [key, val] of entries) {
            const row = document.createElement("div");
            row.className = "json-row";

            const keySpan = document.createElement("span");
            keySpan.className = "json-key";
            keySpan.textContent = `"${key}"`;
            row.appendChild(keySpan);

            const sep = document.createElement("span");
            sep.className = "json-sep";
            sep.textContent = ": ";
            row.appendChild(sep);

            row.appendChild(renderJson(val, [...currentPath, key], highlightPath, missingKey));
            children.appendChild(row);
        }

        if (showMissingKey) {
            const row = document.createElement("div");
            row.className = "json-row json-missing-row";

            const keySpan = document.createElement("span");
            keySpan.className = "json-key json-missing-key";
            keySpan.textContent = `"${missingKey}"`;
            row.appendChild(keySpan);

            const hint = document.createElement("span");
            hint.className = "json-missing-hint";
            hint.textContent = " ← missing";
            row.appendChild(hint);

            children.appendChild(row);
        }

        el.appendChild(children);
    }

    el.appendChild(makePunct("}"));
    return el;
}

function makeToken(text, type, highlighted) {
    const span = document.createElement("span");
    span.className = cls(`json-${type}`, highlighted && "highlighted");
    span.textContent = text;
    return span;
}

function makePunct(text) {
    const span = document.createElement("span");
    span.className = "json-punct";
    span.textContent = text;
    return span;
}

function pathsEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

function isStrictPrefix(prefix, full) {
    if (prefix.length >= full.length) return false;
    return prefix.every((v, i) => v === full[i]);
}

function cls(...names) {
    return names.filter(Boolean).join(" ");
}

function jsonEscapeString(str) {
    return JSON.stringify(str).slice(1, -1);
}
