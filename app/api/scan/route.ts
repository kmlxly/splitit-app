import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server";
import { takeRateLimit } from "@/lib/rateLimit";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemini-2.5-flash-lite";
const MAX_ENCODED_BYTES = 12_000_000;
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
]);

type ScanType = "splitit" | "offline" | "budget";

type ScanPayload = {
    base64Data?: unknown;
    mimeType?: unknown;
    type?: unknown;
    isPDF?: unknown;
};

type OpenRouterResponse = {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
};

async function callOpenRouter(prompt: string, base64Data: string, mimeType: string) {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY tidak ditemui dalam environment variables.");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
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

    return JSON.parse(cleanJson);
}

export async function POST(req: NextRequest) {
    try {
        const user = await getServerUser();
        if (!user) {
            return NextResponse.json(
                { error: "Sila log masuk untuk menggunakan AI Scan." },
                { status: 401 },
            );
        }

        const rateLimit = takeRateLimit(`scan:${user.id}`, {
            limit: 12,
            windowMs: 10 * 60 * 1000,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Terlalu banyak imbasan. Cuba lagi sebentar." },
                {
                    status: 429,
                    headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
                },
            );
        }

        const contentLength = Number(req.headers.get("content-length") || 0);
        if (contentLength > MAX_ENCODED_BYTES + 100_000) {
            return NextResponse.json(
                { error: "Fail terlalu besar. Had maksimum ialah 8MB." },
                { status: 413 },
            );
        }

        const payload = await req.json() as ScanPayload;
        const base64Data = typeof payload.base64Data === "string" ? payload.base64Data : "";
        const mimeType = typeof payload.mimeType === "string" ? payload.mimeType : "image/jpeg";
        const type = payload.type as ScanType;
        const isPDF = payload.isPDF === true;

        if (!base64Data || base64Data.length > MAX_ENCODED_BYTES) {
            return NextResponse.json({ error: "base64Data diperlukan" }, { status: 400 });
        }
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
            return NextResponse.json({ error: "Jenis fail tidak disokong." }, { status: 415 });
        }
        if (!new Set<ScanType>(["splitit", "offline", "budget"]).has(type)) {
            return NextResponse.json({ error: "Jenis imbasan tidak sah." }, { status: 400 });
        }
        if (isPDF !== (mimeType === "application/pdf")) {
            return NextResponse.json({ error: "Format fail tidak sepadan." }, { status: 400 });
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

        const parsedData = await callOpenRouter(prompt, base64Data, mimeType);
        return NextResponse.json(parsedData);

    } catch (error: unknown) {
        console.error("Scan API Error:", error);
        return NextResponse.json(
            { error: "AI gagal memproses fail ini. Sila cuba lagi." },
            { status: 500 },
        );
    }
}
