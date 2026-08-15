"use server";

import { requireServerUser } from "@/lib/auth/server";
import { takeRateLimit } from "@/lib/rateLimit";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MAX_ENCODED_BYTES = 12_000_000;

type OpenRouterResponse = {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
};

async function authorizeScan(base64Data: string) {
    const user = await requireServerUser();
    if (!base64Data || base64Data.length > MAX_ENCODED_BYTES) {
        throw new Error("Fail terlalu besar atau tidak sah.");
    }
    const rateLimit = takeRateLimit(`scan-action:${user.id}`, {
        limit: 12,
        windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) throw new Error("Terlalu banyak imbasan. Cuba lagi sebentar.");
}

async function callOpenRouter(prompt: string, base64Data: string, mimeType: string) {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY tidak ditemui. Sila tambah dalam environment variables.");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash-preview",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({})) as OpenRouterResponse;
        const errMessage = errJson.error?.message || response.statusText;
        throw new Error(`OpenRouter Error (${response.status}): ${errMessage}`);
    }

    const result = await response.json() as OpenRouterResponse;
    const rawText = result.choices?.[0]?.message?.content;
    if (!rawText) throw new Error("AI tak dapat baca data dari dokumen ni.");

    const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText.replace(/```json|```/g, "").trim();

    try {
        return JSON.parse(cleanJson);
    } catch {
        console.error("Failed to parse JSON", rawText);
        throw new Error("Format data AI tak valid.");
    }
}

// For SplitIt — extract items, currency, tax, service, discount, deposit
export async function scanReceipt(base64Data: string) {
    await authorizeScan(base64Data);
    const prompt = `Extract items, prices, tax, service, discount, deposit, AND currency code (e.g. MYR, THB, USD) from receipt. Return valid JSON: { "items": [{"name": "Item", "price": 0.00}], "currency": "MYR", "tax": 0.00, "serviceCharge": 0.00, "discount": 0.00, "deposit": 0.00 }. If unsure, default currency to 'MYR'. Return ONLY the JSON, no markdown.`;
    return callOpenRouter(prompt, base64Data, "image/jpeg");
}

// For Budget — extract single transaction or multiple transactions (PDF bank statement)
export async function scanBudgetReceipt(base64Data: string, mimeType: string, isPDF: boolean) {
    await authorizeScan(base64Data);
    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    if (!allowedMimeTypes.has(mimeType) || isPDF !== (mimeType === "application/pdf")) {
        throw new Error("Jenis fail tidak disokong.");
    }
    const prompt = isPDF
        ? `Extract ALL transactions from this bank statement PDF. Return valid JSON:
{
  "transactions": [
    {
      "title": "Merchant/Description",
      "amount": 0.00,
      "category": "One of: Makan, Transport, Shopping, Bills, Utility, Income, Lain-lain",
      "date": "DD MMM YYYY format (e.g., 15 Jan 2025)"
    }
  ]
}
IMPORTANT: For spending/debits amount should be positive. For income/credits category should be "Income". Return ONLY valid JSON, no other text.`
        : `Extract receipt information from this image. Return valid JSON:
{
  "title": "Merchant/Store Name",
  "amount": 0.00,
  "category": "One of: Makan, Transport, Shopping, Bills, Utility, Lain-lain",
  "date": "DD MMM YYYY format (e.g., 12 Jan 2025)",
  "items": [
    { "title": "Item Name", "amount": 0.00 }
  ]
}
CATEGORY GUIDELINES: Makan=food/restaurants, Transport=petrol/grab/parking, Shopping=retail, Bills=TNB/internet/subscriptions, Utility=maintenance/services, Lain-lain=others. Amount should be positive. Return ONLY valid JSON, no other text.`;

    return callOpenRouter(prompt, base64Data, mimeType);
}
