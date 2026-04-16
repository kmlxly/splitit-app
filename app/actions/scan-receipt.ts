"use server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export async function scanReceipt(base64Data: string) {
    const prompt = "Extract items, prices, tax, service, discount, deposit, AND currency code (e.g. MYR, THB, USD) from receipt. Return valid JSON: { \"items\": [{\"name\": \"Item\", \"price\": 0.00}], \"currency\": \"MYR\", \"tax\": 0.00, \"serviceCharge\": 0.00, \"discount\": 0.00, \"deposit\": 0.00 }. If unsure, default currency to 'MYR'. Return ONLY the JSON, no markdown.";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
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

    if (!rawText) throw new Error("AI tak dapat baca data dari resit ni.");

    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    try {
        return JSON.parse(cleanJson);
    } catch {
        console.error("Failed to parse JSON", rawText);
        throw new Error("Format data AI tak valid.");
    }
}
