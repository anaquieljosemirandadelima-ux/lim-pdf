import assert from "node:assert/strict";
import { bookletOrder, bookletSheets, buildPrintPlan, nUpGrid, nUpSheets, standardSheets } from "../src/lib/pdf-print";

const booklet = bookletOrder(5);
assert.equal(booklet.paddedTotal, 8);
assert.equal(booklet.blankPages, 3);
assert.deepEqual(booklet.pages, [null, 0, 1, null, null, 2, 3, 4]);
assert.equal(bookletSheets(5).length, 4);
assert.deepEqual(bookletSheets(5)[0].pages, [null, 0]);
assert.deepEqual(bookletSheets(5)[1].pages, [1, null]);

assert.deepEqual(nUpGrid(2), { columns: 1, rows: 2 });
assert.deepEqual(nUpGrid(4), { columns: 2, rows: 2 });
assert.deepEqual(nUpGrid(6), { columns: 2, rows: 3 });
assert.equal(nUpSheets(7, 4).length, 2);
assert.deepEqual(nUpSheets(7, 4)[1].pages, [4, 5, 6, null]);
assert.equal(standardSheets(3).length, 3);
assert.equal(buildPrintPlan(8, "booklet").length, 4);
assert.equal(buildPrintPlan(8, "nup", 4).length, 2);
assert.throws(() => nUpGrid(3));
assert.throws(() => bookletOrder(0));

console.log("PDF print tests passed: booklet, N-up, standard sheets, validation");
