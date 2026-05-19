"use server";

import { sql } from "@/lib/db";
import { requireServerUser } from "@/lib/auth/server";

type BudgetTransactionPayload = {
  id: number;
  title: string;
  amount: number;
  category?: string | null;
  date?: string | null;
  iso_date?: string | null;
  items?: any[];
};

const requireUser = requireServerUser;

export async function getBudgetTransactions() {
  const user = await requireUser();
  const rows = await sql`
    SELECT id, title, amount, category, date, iso_date, items
    FROM public.budget_transactions
    WHERE user_id = ${user.id}
    ORDER BY id DESC
  `;
  return rows.map((r: any) => ({
    id: Number(r.id),
    title: r.title,
    amount: Number(r.amount),
    category: r.category,
    date: r.date,
    isoDate: r.iso_date,
    items: r.items || [],
  }));
}

export async function getMonthlyBudgetTotal(monthStr: string) {
  const user = await requireUser();
  const rows = await sql`
    SELECT amount FROM public.budget_transactions
    WHERE user_id = ${user.id}
      AND iso_date >= ${monthStr + "-01"}
      AND iso_date <= ${monthStr + "-31"}
  `;
  return rows.reduce(
    (acc: number, curr: any) => acc + Number(curr.amount || 0),
    0,
  );
}

export async function upsertBudgetTransactions(
  payload: BudgetTransactionPayload[],
) {
  const user = await requireUser();
  if (payload.length === 0) return { success: true };

  for (const t of payload) {
    await sql`
      INSERT INTO public.budget_transactions
        (id, user_id, title, amount, category, date, iso_date, items, updated_at)
      VALUES
        (${t.id}, ${user.id}, ${t.title}, ${t.amount}, ${t.category ?? null},
         ${t.date ?? null}, ${t.iso_date ?? null}, ${JSON.stringify(t.items ?? [])}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        amount = EXCLUDED.amount,
        category = EXCLUDED.category,
        date = EXCLUDED.date,
        iso_date = EXCLUDED.iso_date,
        items = EXCLUDED.items,
        updated_at = now()
    `;
  }
  return { success: true };
}

export async function insertBudgetTransaction(t: BudgetTransactionPayload) {
  const user = await requireUser();
  await sql`
    INSERT INTO public.budget_transactions
      (id, user_id, title, amount, category, date, iso_date, items)
    VALUES
      (${t.id}, ${user.id}, ${t.title}, ${t.amount}, ${t.category ?? null},
       ${t.date ?? null}, ${t.iso_date ?? null}, ${JSON.stringify(t.items ?? [])}::jsonb)
  `;
  return { success: true };
}

export async function deleteBudgetTransaction(id: number) {
  const user = await requireUser();
  await sql`
    DELETE FROM public.budget_transactions
    WHERE id = ${id} AND user_id = ${user.id}
  `;
  return { success: true };
}
