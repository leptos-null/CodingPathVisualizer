// Recursive descent parser for Swift DecodingError description strings.
//
// Input:  String(describing: someDecodingError)
// Output: { errorCase, codingPath, debugDescription, expectedType, codingKey }

export function parseDecodingError(input) {
    const parser = new Parser(input);
    try {
        return parser.parse();
    } catch {
        return null;
    }
}

class Parser {
    constructor(input) {
        this.input = input;
        this.pos = 0;
    }

    parse() {
        const errorCase = this.parseErrorCase();
        this.expect("(");

        let result;
        switch (errorCase) {
            case "typeMismatch":
            case "valueNotFound": {
                const expectedType = this.parseType();
                this.expect(", ");
                const context = this.parseContext();
                result = { errorCase, expectedType, codingKey: null, ...context };
                break;
            }
            case "keyNotFound": {
                const codingKey = this.parseCodingKeyEntry();
                this.expect(", ");
                const context = this.parseContext();
                result = { errorCase, expectedType: null, codingKey, ...context };
                break;
            }
            case "dataCorrupted": {
                const context = this.parseContext();
                result = { errorCase, expectedType: null, codingKey: null, ...context };
                break;
            }
            default:
                throw new Error(`Unhandled error case: ${errorCase}`);
        }

        this.expect(")");
        return result;
    }

    parseErrorCase() {
        for (const prefix of ["Swift.DecodingError.", "DecodingError.", ""]) {
            if (this.input.startsWith(prefix, this.pos)) {
                const afterPrefix = this.pos + prefix.length;
                for (const c of ["typeMismatch", "valueNotFound", "keyNotFound", "dataCorrupted"]) {
                    if (this.input.startsWith(c, afterPrefix)) {
                        this.pos = afterPrefix + c.length;
                        return c;
                    }
                }
            }
        }
        throw new Error(`Expected error case at position ${this.pos}`);
    }

    parseContext() {
        for (const prefix of ["Swift.DecodingError.Context(", "DecodingError.Context(", "Context("]) {
            if (this.input.startsWith(prefix, this.pos)) {
                this.pos += prefix.length;
                return this._parseContextBody();
            }
        }
        throw new Error(`Expected DecodingError.Context at position ${this.pos}`);
    }

    _parseContextBody() {
        const codingPath = this.parseCodingPathField();
        this.expect(", ");
        const debugDescription = this.parseDebugDescriptionField();
        // Consume optional trailing fields like underlyingError
        this.consumeRemainingContextFields();
        this.expect(")");
        return { codingPath, debugDescription };
    }

    parseCodingPathField() {
        this.expect("codingPath: ");
        return this.parseCodingPath();
    }

    parseDebugDescriptionField() {
        this.expect("debugDescription: ");
        return this.parseQuotedString();
    }

    consumeRemainingContextFields() {
        // Consume ", underlyingError: ..." and any other trailing fields
        // by reading up to the matching closing paren of the Context
        while (this.pos < this.input.length && this.peek() === ",") {
            this.pos++; // skip comma
            this.skipWhitespace();
            // Consume "fieldName: value" — value may contain nested parens
            this.consumeUntilContextEnd();
        }
    }

    consumeUntilContextEnd() {
        // Read field name
        while (this.pos < this.input.length && this.peek() !== ":") {
            this.pos++;
        }
        this.expect(": ");
        // Read value, respecting nested parens
        let depth = 0;
        while (this.pos < this.input.length) {
            const ch = this.peek();
            if (ch === "(") depth++;
            else if (ch === ")") {
                if (depth === 0) return;
                depth--;
            } else if (ch === "," && depth === 0) {
                return;
            }
            this.pos++;
        }
    }

    parseCodingPath() {
        this.expect("[");
        const entries = [];
        if (this.peek() !== "]") {
            entries.push(this.parseCodingKeyEntry());
            while (this.peek() === ",") {
                this.expect(",");
                this.skipWhitespace();
                entries.push(this.parseCodingKeyEntry());
            }
        }
        this.expect("]");
        return entries;
    }

    parseCodingKeyEntry() {
        // e.g. CodingKeys(stringValue: "user", intValue: nil)
        //   or _CodingKey(stringValue: "Index 0", intValue: 0)
        this.parseIdentifier(); // consume the type name (CodingKeys, _CodingKey, etc.)
        this.expect("(");
        this.expect("stringValue: ");
        const stringValue = this.parseQuotedString();
        this.expect(", ");
        this.expect("intValue: ");
        const intValue = this.parseIntOrNil();
        this.expect(")");

        if (intValue !== null) {
            return { index: intValue };
        }
        return { key: stringValue };
    }

    parseType() {
        // Swift type like "Swift.Int", "Swift.Optional<Swift.String>", "Swift.Array<Any>"
        let result = "";
        let angleBracketDepth = 0;
        while (this.pos < this.input.length) {
            const ch = this.peek();
            if (ch === "<") {
                angleBracketDepth++;
                result += ch;
                this.pos++;
            } else if (ch === ">") {
                angleBracketDepth--;
                result += ch;
                this.pos++;
            } else if (angleBracketDepth === 0 && (ch === "," || ch === ")")) {
                break;
            } else {
                result += ch;
                this.pos++;
            }
        }
        return result.trim();
    }

    parseQuotedString() {
        this.expect('"');
        let result = "";
        while (this.pos < this.input.length) {
            const ch = this.input[this.pos];
            if (ch === "\\") {
                this.pos++;
                const escaped = this.input[this.pos];
                if (escaped === '"') result += '"';
                else if (escaped === "\\") result += "\\";
                else if (escaped === "n") result += "\n";
                else if (escaped === "t") result += "\t";
                else result += escaped;
                this.pos++;
            } else if (ch === '"') {
                this.pos++;
                return result;
            } else {
                result += ch;
                this.pos++;
            }
        }
        throw new Error("Unterminated string");
    }

    parseIdentifier() {
        const start = this.pos;
        while (this.pos < this.input.length && /[A-Za-z0-9_.]/.test(this.input[this.pos])) {
            this.pos++;
        }
        if (this.pos === start) {
            throw new Error(`Expected identifier at position ${this.pos}`);
        }
        return this.input.slice(start, this.pos);
    }

    parseIntOrNil() {
        if (this.input.startsWith("nil", this.pos)) {
            this.pos += 3;
            return null;
        }
        const start = this.pos;
        if (this.peek() === "-") this.pos++;
        const digitStart = this.pos;
        while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
            this.pos++;
        }
        if (this.pos === digitStart) {
            throw new Error(`Expected int or nil at position ${this.pos}`);
        }
        return parseInt(this.input.slice(start, this.pos), 10);
    }

    expect(str) {
        if (this.input.startsWith(str, this.pos)) {
            this.pos += str.length;
        } else {
            const got = this.input.slice(this.pos, this.pos + 20);
            throw new Error(`Expected "${str}" at position ${this.pos}, got "${got}"`);
        }
    }

    peek() {
        return this.input[this.pos];
    }

    skipWhitespace() {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
            this.pos++;
        }
    }
}
