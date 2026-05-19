"use server";

import { sql } from "@/lib/db";
import { requireServerUser } from "@/lib/auth/server";

type SessionPayload = {
  id: string;
  name: string;
  currency?: string;
  people?: any[];
  paid_status?: Record<string, any>;
};

type BillPayload = {
  id: string;
  session_id: string;
  title?: string | null;
  type?: string | null;
  total_amount?: number | null;
  paid_by?: string | null;
  details?: any;
  menu_items?: any;
  misc_amount?: number | null;
  discount_amount?: number | null;
  tax_method?: string | null;
  discount_method?: string | null;
  original_currency?: string | null;
  original_amount?: number | null;
  exchange_rate?: number | null;
};

const requireUser = requireServerUser;

export async function getMySessionsAndBills() {
  const user = await requireUser();

  // 1. Own sessions
  const myRows = await sql`
    SELECT id, owner_id, name, currency, people, paid_status, created_at
    FROM public.sessions
    WHERE owner_id = ${user.id}
  `;

  // 2. Shared sessions via session_members
  const sharedRows = await sql`
    SELECT s.id, s.owner_id, s.name, s.currency, s.people, s.paid_status, s.created_at
    FROM public.sessions s
    INNER JOIN public.session_members sm ON sm.session_id = s.id
    WHERE sm.user_id = ${user.id} AND s.owner_id != ${user.id}
  `;

  const allSessions = [...myRows, ...sharedRows];
  if (allSessions.length === 0) {
    return { sessions: [], bills: [] };
  }

  const sessionIds = allSessions.map((s: any) => s.id);

  const billRows = await sql`
    SELECT *
    FROM public.bills
    WHERE session_id = ANY(${sessionIds}::text[])
  `;

  return { sessions: allSessions, bills: billRows };
}

export async function joinSessionAsMember(sessionId: string) {
  const user = await requireUser();
  await sql`
    INSERT INTO public.session_members (session_id, user_id)
    VALUES (${sessionId}, ${user.id})
    ON CONFLICT (session_id, user_id) DO NOTHING
  `;
  return { success: true };
}

export async function getBillsForSession(sessionId: string) {
  await requireUser();
  const rows = await sql`
    SELECT * FROM public.bills
    WHERE session_id = ${sessionId}
  `;
  return rows;
}

export async function upsertSession(payload: SessionPayload) {
  const user = await requireUser();
  await sql`
    INSERT INTO public.sessions
      (id, owner_id, name, currency, people, paid_status, updated_at)
    VALUES
      (${payload.id}, ${user.id}, ${payload.name},
       ${payload.currency ?? "RM"},
       ${JSON.stringify(payload.people ?? [])}::jsonb,
       ${JSON.stringify(payload.paid_status ?? {})}::jsonb,
       now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      currency = EXCLUDED.currency,
      people = EXCLUDED.people,
      paid_status = EXCLUDED.paid_status,
      updated_at = now()
  `;
  return { success: true };
}

export async function upsertBills(bills: BillPayload[]) {
  await requireUser();
  if (bills.length === 0) return { success: true };

  for (const b of bills) {
    await sql`
      INSERT INTO public.bills
        (id, session_id, title, type, total_amount, paid_by, details, menu_items,
         misc_amount, discount_amount, tax_method, discount_method,
         original_currency, original_amount, exchange_rate)
      VALUES
        (${b.id}, ${b.session_id}, ${b.title ?? null}, ${b.type ?? null},
         ${b.total_amount ?? null}, ${b.paid_by ?? null},
         ${JSON.stringify(b.details ?? null)}::jsonb,
         ${JSON.stringify(b.menu_items ?? null)}::jsonb,
         ${b.misc_amount ?? null}, ${b.discount_amount ?? null},
         ${b.tax_method ?? null}, ${b.discount_method ?? null},
         ${b.original_currency ?? null}, ${b.original_amount ?? null},
         ${b.exchange_rate ?? null})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        type = EXCLUDED.type,
        total_amount = EXCLUDED.total_amount,
        paid_by = EXCLUDED.paid_by,
        details = EXCLUDED.details,
        menu_items = EXCLUDED.menu_items,
        misc_amount = EXCLUDED.misc_amount,
        discount_amount = EXCLUDED.discount_amount,
        tax_method = EXCLUDED.tax_method,
        discount_method = EXCLUDED.discount_method,
        original_currency = EXCLUDED.original_currency,
        original_amount = EXCLUDED.original_amount,
        exchange_rate = EXCLUDED.exchange_rate
    `;
  }
  return { success: true };
}

export async function deleteSession(sessionId: string) {
  const user = await requireUser();
  await sql`
    DELETE FROM public.sessions
    WHERE id = ${sessionId} AND owner_id = ${user.id}
  `;
  return { success: true };
}

export async function deleteBill(billId: string) {
  await requireUser();
  await sql`
    DELETE FROM public.bills WHERE id = ${billId}
  `;
  return { success: true };
}
