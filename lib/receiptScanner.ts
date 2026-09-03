/**
 * Receipt Scanner Helpers for SplitIt & Budget
 */

export const SPLITIT_RECEIPT_PROMPT = `You are an expert receipt OCR scanner. Extract all details from this receipt into valid JSON.

CRITICAL INSTRUCTIONS:
1. TOTAL AMOUNT (MUST INCLUDE TAX):
   - "totalAmount": Detect the FINAL PAYABLE GRAND TOTAL on the receipt (this includes all taxes like SST/GST, service charges, and after any discounts/rounding).
   - If the receipt has NO tax or service charge, "totalAmount" MUST be the standard final total.
   - Do NOT return the pre-tax subtotal as totalAmount. It MUST be the final grand total printed on the receipt.

2. QUANTITY SPLITTING (CRITICAL):
   - If any item on the receipt has a quantity greater than 1 (for example: "3x Teh Tarik @ 3.00 = 9.00" or "2 Nasi Goreng 24.00" or "Burger x 2"):
     YOU MUST SPLIT THEM INTO SEPARATE INDIVIDUAL ENTRIES in the "items" array!
   - Each individual entry MUST have its single unit price (e.g. price: 3.00, NOT the combined 9.00).
   - Number them with "#1", "#2", etc. (e.g. "Teh Tarik #1", "Teh Tarik #2", "Teh Tarik #3").
   - Every single physical order/item must be its own row so diners can split or claim items individually.

3. BREAKDOWN:
   - "subtotal": Subtotal of items before taxes/charges.
   - "tax": Tax amount (SST, GST, VAT) if shown (0.00 if none).
   - "serviceCharge": Service charge amount (e.g. 10%) if shown (0.00 if none).
   - "discount": Discount amount if shown (0.00 if none).
   - "deposit": Deposit or rounding adjustment if shown (0.00 if none).
   - "currency": Detected 3-letter currency code (e.g. MYR, THB, SGD, USD). Default to 'MYR' if unsure.

RETURN ONLY VALID JSON (no markdown, no backticks):
{
  "items": [
    { "name": "Teh Tarik #1", "price": 3.00, "quantity": 1 },
    { "name": "Teh Tarik #2", "price": 3.00, "quantity": 1 }
  ],
  "totalAmount": 15.00,
  "subtotal": 12.00,
  "tax": 0.72,
  "serviceCharge": 1.20,
  "discount": 0.00,
  "deposit": 0.00,
  "currency": "MYR"
}`;

export type ScannedRawItem = {
    name?: string;
    price?: number | string;
    quantity?: number | string;
    qty?: number | string;
    unitPrice?: number | string;
    totalPrice?: number | string;
    sharedBy?: string[];
};

export type ExpandedScannedItem = {
    name: string;
    price: number;
    sharedBy: string[];
};

/**
 * Expands multi-quantity items into individual items:
 * E.g. "3x Teh Tarik" (price: 9.00) -> 3 items of "Teh Tarik #1", "Teh Tarik #2", "Teh Tarik #3" @ 3.00 each.
 */
export function expandScannedItems(rawItems: ScannedRawItem[]): ExpandedScannedItem[] {
    if (!Array.isArray(rawItems)) return [];
    const result: ExpandedScannedItem[] = [];

    rawItems.forEach((item, index) => {
        const rawName = String(item.name || `Item ${index + 1}`).trim();
        const rawPrice = parseFloat(String(item.price ?? 0)) || 0;
        const rawQty = parseInt(String(item.quantity || item.qty || "1"), 10);
        const sharedBy = Array.isArray(item.sharedBy) ? item.sharedBy : [];

        // If the name already has a suffix like "#1", "#2", don't re-split
        const isAlreadyNumbered = /#\d+$/.test(rawName);

        let detectedQty = 1;
        let cleanName = rawName;

        if (!isAlreadyNumbered) {
            const prefixMatch = rawName.match(/^(\d+)\s*[xX*]\s*(.+)$/);
            const suffixMatch = rawName.match(/^(.+?)\s*[xX*]\s*(\d+)$/);
            const parenMatch = rawName.match(/^(.+?)\s*[\(\[]\s*(?:qty|quantity)?\s*[xX*]?\s*(\d+)\s*[\)\]]$/i);
            const countNameMatch = rawName.match(/^(\d+)\s+([a-zA-Z\u00C0-\u024F].+)$/);

            if (!isNaN(rawQty) && rawQty > 1) {
                detectedQty = rawQty;
            } else if (prefixMatch && parseInt(prefixMatch[1], 10) > 1) {
                detectedQty = parseInt(prefixMatch[1], 10);
                cleanName = prefixMatch[2].trim();
            } else if (suffixMatch && parseInt(suffixMatch[2], 10) > 1) {
                detectedQty = parseInt(suffixMatch[2], 10);
                cleanName = suffixMatch[1].trim();
            } else if (parenMatch && parseInt(parenMatch[2], 10) > 1) {
                detectedQty = parseInt(parenMatch[2], 10);
                cleanName = parenMatch[1].trim();
            } else if (countNameMatch && parseInt(countNameMatch[1], 10) > 1 && parseInt(countNameMatch[1], 10) <= 50) {
                detectedQty = parseInt(countNameMatch[1], 10);
                cleanName = countNameMatch[2].trim();
            }
        }

        if (detectedQty > 1) {
            let unitPrice = rawPrice;
            if (item.unitPrice && parseFloat(String(item.unitPrice)) > 0) {
                unitPrice = parseFloat(String(item.unitPrice));
            } else if (item.totalPrice && parseFloat(String(item.totalPrice)) > 0) {
                unitPrice = parseFloat(String(item.totalPrice)) / detectedQty;
            } else {
                // Receipt line item is typically total price for the row: e.g. "3x Burger 30.00" -> 10.00 each
                unitPrice = rawPrice / detectedQty;
            }

            const roundedUnitPrice = Math.round(unitPrice * 100) / 100;

            for (let q = 1; q <= detectedQty; q++) {
                result.push({
                    name: `${cleanName} #${q}`,
                    price: roundedUnitPrice,
                    // Keep original sharedBy on first item or keep individual
                    sharedBy: q === 1 ? [...sharedBy] : [],
                });
            }
        } else {
            result.push({
                name: cleanName,
                price: Math.round(rawPrice * 100) / 100,
                sharedBy: [...sharedBy],
            });
        }
    });

    return result;
}

/**
 * Resolves the final bill total amount:
 * Picks the total amount including tax if available, otherwise calculates or falls back to regular total.
 */
export function resolveDetectedBillTotal(params: {
    totalAmount?: number;
    subtotal?: number;
    tax?: number;
    serviceCharge?: number;
    discount?: number;
    deposit?: number;
    itemsSum: number;
    includeTax?: boolean;
    includeDiscount?: boolean;
}): number {
    const {
        totalAmount = 0,
        tax = 0,
        serviceCharge = 0,
        discount = 0,
        deposit = 0,
        itemsSum,
        includeTax = true,
        includeDiscount = true,
    } = params;

    const totalTaxService = tax + serviceCharge;
    const totalDeductions = discount + deposit;

    // 1. If AI detected a positive final totalAmount from the receipt, use it directly!
    if (totalAmount > 0) {
        return Math.round(totalAmount * 100) / 100;
    }

    // 2. If tax/service charge is detected, add to items sum
    if (totalTaxService > 0 || totalDeductions > 0) {
        const calculated = itemsSum + (includeTax ? totalTaxService : 0) - (includeDiscount ? totalDeductions : 0);
        return Math.round(Math.max(0, calculated) * 100) / 100;
    }

    // 3. If no tax detected, pick the regular total (itemsSum)
    return Math.round(itemsSum * 100) / 100;
}
