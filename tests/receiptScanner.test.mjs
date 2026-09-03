import test from "node:test";
import assert from "node:assert/strict";
import { expandScannedItems, resolveDetectedBillTotal } from "../lib/receiptScanner.ts";

test("expandScannedItems expands item with explicit quantity > 1", () => {
    const rawItems = [
        { name: "Teh Tarik", price: 9.00, quantity: 3 }
    ];

    const expanded = expandScannedItems(rawItems);
    assert.equal(expanded.length, 3);
    assert.equal(expanded[0].name, "Teh Tarik #1");
    assert.equal(expanded[0].price, 3.00);
    assert.equal(expanded[1].name, "Teh Tarik #2");
    assert.equal(expanded[1].price, 3.00);
    assert.equal(expanded[2].name, "Teh Tarik #3");
    assert.equal(expanded[2].price, 3.00);
});

test("expandScannedItems detects quantity prefix like '3x Burger' and suffix like 'Mee x2'", () => {
    const rawItems = [
        { name: "3x Burger", price: 30.00 },
        { name: "Mee Goreng x2", price: 16.00 },
        { name: "Roti Canai (4)", price: 8.00 },
        { name: "2 Teh O Ais", price: 5.00 }
    ];

    const expanded = expandScannedItems(rawItems);
    assert.equal(expanded.length, 3 + 2 + 4 + 2); // 11 items

    // 3x Burger -> 3 items @ 10.00 each
    assert.equal(expanded[0].name, "Burger #1");
    assert.equal(expanded[0].price, 10.00);
    assert.equal(expanded[2].name, "Burger #3");
    assert.equal(expanded[2].price, 10.00);

    // Mee Goreng x2 -> 2 items @ 8.00 each
    assert.equal(expanded[3].name, "Mee Goreng #1");
    assert.equal(expanded[3].price, 8.00);
    assert.equal(expanded[4].name, "Mee Goreng #2");
    assert.equal(expanded[4].price, 8.00);

    // Roti Canai (4) -> 4 items @ 2.00 each
    assert.equal(expanded[5].name, "Roti Canai #1");
    assert.equal(expanded[5].price, 2.00);
    assert.equal(expanded[8].name, "Roti Canai #4");
    assert.equal(expanded[8].price, 2.00);

    // 2 Teh O Ais -> 2 items @ 2.50 each
    assert.equal(expanded[9].name, "Teh O Ais #1");
    assert.equal(expanded[9].price, 2.50);
    assert.equal(expanded[10].name, "Teh O Ais #2");
    assert.equal(expanded[10].price, 2.50);
});

test("expandScannedItems does not re-split already numbered items", () => {
    const rawItems = [
        { name: "Teh Tarik #1", price: 3.00 },
        { name: "Teh Tarik #2", price: 3.00 }
    ];

    const expanded = expandScannedItems(rawItems);
    assert.equal(expanded.length, 2);
    assert.equal(expanded[0].name, "Teh Tarik #1");
    assert.equal(expanded[0].price, 3.00);
    assert.equal(expanded[1].name, "Teh Tarik #2");
    assert.equal(expanded[1].price, 3.00);
});

test("expandScannedItems preserves sharedBy", () => {
    const rawItems = [
        { name: "Pizza Large", price: 40.00, sharedBy: ["p1", "p2", "p3"] }
    ];

    const expanded = expandScannedItems(rawItems);
    assert.equal(expanded.length, 1);
    assert.deepEqual(expanded[0].sharedBy, ["p1", "p2", "p3"]);
});

test("resolveDetectedBillTotal uses final totalAmount including tax", () => {
    // Total on receipt includes SST 6% + Service 10%
    const total = resolveDetectedBillTotal({
        totalAmount: 116.00,
        subtotal: 100.00,
        tax: 6.00,
        serviceCharge: 10.00,
        itemsSum: 100.00,
    });

    assert.equal(total, 116.00);
});

test("resolveDetectedBillTotal falls back to regular total when no tax", () => {
    // Receipt without tax
    const total = resolveDetectedBillTotal({
        totalAmount: 0,
        tax: 0,
        serviceCharge: 0,
        itemsSum: 45.00,
    });

    assert.equal(total, 45.00);
});
