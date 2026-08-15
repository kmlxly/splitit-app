"use server";

import { sql } from "@/lib/db";
import { requireServerUser } from "@/lib/auth/server";

type SubscriptionPayload = {
  id: number;
  title: string;
  price: number;
  cycle: string;
  first_bill_date?: string | null;
  category?: string | null;
  share_with?: string | null;
  link?: string | null;
};

const requireUser = requireServerUser;

export async function getSubscriptions() {
  const user = await requireUser();
  const rows = await sql`
    SELECT id, title, price, cycle, first_bill_date, category, share_with, link
    FROM public.subscriptions
    WHERE user_id = ${user.id}
    ORDER BY id ASC
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.title,
    price: Number(r.price),
    cycle: r.cycle,
    nextPaymentDate: r.first_bill_date,
    category: r.category,
    shareWith: r.share_with || undefined,
    link: r.link || undefined,
  }));
}

export async function upsertSubscriptions(payload: SubscriptionPayload[]) {
  const user = await requireUser();
  if (payload.length === 0) return { success: true };

  for (const s of payload) {
    const rows = await sql`
      INSERT INTO public.subscriptions AS target
        (id, user_id, title, price, cycle, first_bill_date, category, share_with, link, updated_at)
      VALUES
        (${s.id}, ${user.id}, ${s.title}, ${s.price}, ${s.cycle},
         ${s.first_bill_date ?? null}, ${s.category ?? null},
         ${s.share_with ?? null}, ${s.link ?? null}, now())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        price = EXCLUDED.price,
        cycle = EXCLUDED.cycle,
        first_bill_date = EXCLUDED.first_bill_date,
        category = EXCLUDED.category,
        share_with = EXCLUDED.share_with,
        link = EXCLUDED.link,
        updated_at = now()
      WHERE target.user_id = ${user.id}
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new Error("ID langganan bertembung dengan rekod pengguna lain.");
    }
  }
  return { success: true };
}

export async function deleteSubscription(id: number) {
  const user = await requireUser();
  await sql`
    DELETE FROM public.subscriptions
    WHERE id = ${id} AND user_id = ${user.id}
  `;
  return { success: true };
}
