"use server";

import { sql } from "@/lib/db";
import { getServerUser } from "@/lib/auth/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export async function askTheBoss(userMessage: string) {

    // 1. Fetch Financial Context (RAG) for authenticated user
    let financialContext = "User Stats: Data unavailable (Guest or Error).";

    try {
        const user = await getServerUser();

        if (user) {
            // A. Pocket Money (Budget Expenses)
            const expenses = await sql`
                SELECT amount FROM public.budget_transactions
                WHERE user_id = ${user.id}
            `;
            const totalSpent = expenses.reduce(
                (acc: number, curr: any) => acc + Number(curr.amount || 0),
                0,
            );

            // B. Bills total from sessions owned by user
            const billRows = await sql`
                SELECT b.total_amount FROM public.bills b
                INNER JOIN public.sessions s ON s.id = b.session_id
                WHERE s.owner_id = ${user.id}
            `;
            const totalBillsManaged = billRows.reduce(
                (acc: number, curr: any) => acc + Number(curr.total_amount || 0),
                0,
            );

            // C. Subscriptions
            const subs = await sql`
                SELECT price FROM public.subscriptions WHERE user_id = ${user.id}
            `;
            const totalSubs = subs.reduce(
                (acc: number, curr: any) => acc + Number(curr.price || 0),
                0,
            );

            financialContext = `
                User Real-Time Stats:
                - Total Spent (Pocket): RM${totalSpent.toFixed(2)}
                - Total Bills Managed: RM${totalBillsManaged.toFixed(2)}
                - Monthly Subscriptions: RM${totalSubs.toFixed(2)}
            `;
        }
    } catch (err) {
        console.error("RAG Error:", err);
    }

    // 2. Prepare Prompt
    const prompt = `
      You are 'The Boss', a neo-brutalism financial advisor app persona.

      CORE PERSONALITY:
      - Name: The Boss
      - Tone: Sarcastic, Strict, Direct, "Savage" but helpful.
      - Language: Informal Malay (Bahasa Pasar) mixed with Manglish. Use words like "Kau", "Aku", "Bro", "Dey", "Adoi".

      CONTEXT:
      ${financialContext}

      INSTRUCTIONS:
      - Answer the user's question directly.
      - Keep it short (Max 3-4 sentences).
      - Use the provided Stats to roast them if they spend too much!
      - If asked about debts ("Minta Hutang"), provide a sarcastic but usable WhatsApp/text template.
      - If asked "Can I Buy This?", compare it against their spending/subs.

      User said: "${userMessage}"
    `;

    // 3. Call OpenRouter API
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash-preview",
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (response.status === 429) {
            console.error("OpenRouter quota exceeded");
            return "QUOTA_EXCEEDED";
        }

        if (!response.ok) {
            console.error(`OpenRouter Error: ${response.status}`);
            return `FALLBACK_TO_CLIENT::${prompt}`;
        }

        const result = await response.json();
        const aiText = result.choices?.[0]?.message?.content;

        if (!aiText) throw new Error("Empty AI Response");

        return aiText;

    } catch (error: any) {
        console.error("AI Chat Action Error:", error);
        return `FALLBACK_TO_CLIENT::${prompt}`;
    }
}
