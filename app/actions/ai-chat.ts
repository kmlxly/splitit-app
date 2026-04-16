"use server";

import { createClient } from "@supabase/supabase-js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function askTheBoss(userMessage: string, accessToken: string) {

    // 1. Setup Supabase Client with User's Token (To pass RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });

    // 2. Fetch Financial Context (RAG)
    let financialContext = "User Stats: Data unavailable (Guest or Error).";

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // A. Pocket Money (Budget Expenses)
            const { data: expenses } = await supabase
                .from('budget_transactions')
                .select('amount')
                .eq('user_id', user.id);

            const totalSpent = expenses?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

            // B. Debts (SplitIt)
            const { data: sessions } = await supabase
                .from('sessions')
                .select('bills(total_amount, paid_by)')
                .eq('owner_id', user.id);

            let totalBillsManaged = 0;
            sessions?.forEach((s: any) => {
                s.bills?.forEach((b: any) => totalBillsManaged += b.total_amount);
            });

            // C. Subscription
            const { data: subs } = await supabase
                .from('subscriptions')
                .select('price')
                .eq('user_id', user.id);
            const totalSubs = subs?.reduce((acc, curr) => acc + (curr.price || 0), 0) || 0;

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

    // 3. Prepare Prompt
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

    // 4. Call OpenRouter API
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
