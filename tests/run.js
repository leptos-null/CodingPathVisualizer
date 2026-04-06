import { loadTests, runTests } from "./parser.test.js";

const tests = await loadTests();
const results = runTests(tests);
let allPass = true;
for (const result of results) {
    const icon = result.pass ? "\u2713" : "\u2717";
    console.log(`${icon} ${result.name}`);
    if (!result.pass) {
        allPass = false;
        console.log("  Expected:", JSON.stringify(result.expected));
        console.log("  Actual:  ", JSON.stringify(result.actual));
    }
}
console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed`);
process.exit(allPass ? 0 : 1);
