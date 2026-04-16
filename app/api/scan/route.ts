import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemini-2.0-flash-001";

async function callOpenRouter(prompt: string, base64Data: string, mimeType: string) {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY tidak ditemui dalam environment variables.");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
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
        const errJson = await response.json().catch(() => ({}));
        const errMessage = errJson.error?.message || response.statusText;
        throw new Error(`OpenRouter Error (${response.status}): ${errMessage}`);
    }

    const result = await response.json();
    const rawText = result.choices?.[0]?.message?.content;
    if (!rawText) throw new Error("AI tak dapat baca data dari dokumen ni.");

    const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText.replace(/```json|```/g, "").trim();

    return JSON.parse(cleanJson);
}

export async function POST(req: NextRequest) {
    try {
        const { base64Data, mimeType, type, isPDF } = await req.json();

        if (!base64Data) {
            return NextResponse.json({ error: "base64Data diperlukan" }, { status: 400 });
        }

        let prompt = "";

        if (type === "splitit" || type === "offline") {
            prompt = `Extract items, prices, tax, service, discount, deposit, AND currency code (e.g. MYR, THB, USD) from receipt. Return valid JSON: { "items": [{"name": "Item", "price": 0.00}], "currency": "MYR", "tax": 0.00, "serviceCharge": 0.00, "discount": 0.00, "deposit": 0.00 }. If unsure, default currency to 'MYR'. Return ONLY the JSON, no markdown.`;
        } else if (type === "budget" && isPDF) {
            prompt = `Extract ALL transactions from this bank statement. Return valid JSON:
{ "transactions": [{ "title": "Merchant/Description", "amount": 0.00, "category": "One of: Makan, Transport, Shopping, Bills, Utility, Income, Lain-lain", "date": "DD MMM YYYY" }] }
For spending/debits amount positive. For income/credits category="Income". Return ONLY valid JSON.`;
        } else {
            prompt = `Extract receipt information. Return valid JSON:
{ "title": "Merchant Name", "amount": 0.00, "category": "One of: Makan, Transport, Shopping, Bills, Utility, Lain-lain", "date": "DD MMM YYYY", "items": [{ "title": "Item Name", "amount": 0.00 }] }
Amount positive. Return ONLY valid JSON.`;
        }

        const parsedData = await callOpenRouter(prompt, base64Data, mimeType || "image/jpeg");
        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error("Scan API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
