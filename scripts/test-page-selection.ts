import assert from "node:assert/strict";
import { parsePageOrder, parsePages } from "../src/lib/page-selection";

assert.deepEqual(parsePages("1,3-5", 6), [0, 2, 3, 4]);
assert.deepEqual(parsePages("", 3, true), [0, 1, 2]);
assert.deepEqual(parsePageOrder("3,1,2,5-4", 5), [2, 0, 1, 4, 3]);
assert.deepEqual(parsePageOrder("3,3,1", 3), [2, 2, 0]);
assert.throws(() => parsePages("0", 3), /possui 3/);
assert.throws(() => parsePages("4", 3), /possui 3/);
assert.throws(() => parsePages("3-1", 3), /Intervalo inválido/);
assert.throws(() => parsePageOrder("5", 3), /possui 3/);
console.log(JSON.stringify({ ok: true, suite: "page-selection", assertions: 8 }));
