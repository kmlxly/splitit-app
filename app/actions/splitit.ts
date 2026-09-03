"use server";

import { sql } from "@/lib/db";
import { requireServerUser } from "@/lib/auth/server";
import { requireSessionAccess } from "@/lib/authorization";

type SessionPayload = {
  id: string;
  name: string;
  currency?: string;
  people?: unknown[];
  paid_status?: Record<string, boolean>;
};

type BillPayload = {
  id: string;
  session_id: string;
  title?: string | null;
  type?: string | null;
  total_amount?: number | null;
  paid_by?: string | null;
  details?: unknown;
  menu_items?: unknown;
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
    ORDER BY created_at DESC
  `;

  // 2. Shared sessions via session_members
  const sharedRows = await sql`
    SELECT s.id, s.owner_id, s.name, s.currency, s.people, s.paid_status, s.created_at
    FROM public.sessions s
    INNER JOIN public.session_members sm ON sm.session_id = s.id
    WHERE sm.user_id = ${user.id} AND s.owner_id != ${user.id}
    ORDER BY s.created_at DESC
  `;

  const allSessions = [...myRows, ...sharedRows];
  if (allSessions.length === 0) {
    return { sessions: [], bills: [] };
  }

  const sessionIds = allSessions.map((session) => session.id);

  const billRows = await sql`
    SELECT *
    FROM public.bills
    WHERE session_id = ANY(${sessionIds}::text[])
    ORDER BY created_at DESC
  `;

  return { sessions: allSessions, bills: billRows };
}

export async function joinSessionAsMember(sessionId: string) {
  const user = await requireUser();
  if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
    throw new Error("Link jemputan tidak sah.");
  }
  const sessions = await sql`
    SELECT id FROM public.sessions WHERE id = ${sessionId} LIMIT 1
  `;
  if (sessions.length === 0) throw new Error("Sesi tidak ditemui.");
  await sql`
    INSERT INTO public.session_members (session_id, user_id)
    VALUES (${sessionId}, ${user.id})
    ON CONFLICT (session_id, user_id) DO NOTHING
  `;
  return { success: true };
}

export async function getBillsForSession(sessionId: string) {
  const user = await requireUser();
  await requireSessionAccess(user.id, sessionId);
  const rows = await sql`
    SELECT * FROM public.bills
    WHERE session_id = ${sessionId}
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function upsertSession(payload: SessionPayload) {
  const user = await requireUser();
  const rows = await sql`
    INSERT INTO public.sessions AS target
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
    WHERE target.owner_id = ${user.id}
       OR EXISTS (
         SELECT 1 FROM public.session_members sm
         WHERE sm.session_id = target.id AND sm.user_id = ${user.id}
       )
    RETURNING id
  `;
  if (rows.length === 0) {
    throw new Error("Anda tidak mempunyai akses untuk mengubah sesi ini.");
  }
  return { success: true };
}

export async function upsertBills(bills: BillPayload[]) {
  const user = await requireUser();
  if (bills.length === 0) return { success: true };

  for (const b of bills) {
    await requireSessionAccess(user.id, b.session_id);
    const rows = await sql`
      INSERT INTO public.bills AS target
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
      WHERE EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.id = target.session_id
          AND (
            s.owner_id = ${user.id}
            OR EXISTS (
              SELECT 1 FROM public.session_members sm
              WHERE sm.session_id = s.id AND sm.user_id = ${user.id}
            )
          )
      )
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new Error("Anda tidak mempunyai akses untuk mengubah bil ini.");
    }
  }
  return { success: true };
}

export async function deleteSession(sessionId: string) {
  const user = await requireUser();
  if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
    throw new Error("Event tidak sah.");
  }

  const rows = await sql`
    DELETE FROM public.sessions
    WHERE id = ${sessionId} AND owner_id = ${user.id}
    RETURNING id
  `;
  return { success: true, deleted: rows.length > 0 };
}

export async function leaveSession(sessionId: string) {
  const user = await requireUser();
  if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
    throw new Error("Event tidak sah.");
  }

  const rows = await sql`
    DELETE FROM public.session_members sm
    WHERE sm.session_id = ${sessionId}
      AND sm.user_id = ${user.id}
      AND EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.id = sm.session_id AND s.owner_id != ${user.id}
      )
    RETURNING sm.session_id
  `;
  return { success: true, left: rows.length > 0 };
}

export async function deleteBill(billId: string) {
  const user = await requireUser();
  const rows = await sql`
    DELETE FROM public.bills b
    WHERE b.id = ${billId}
      AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = b.session_id
          AND (
            s.owner_id = ${user.id}
            OR EXISTS (
              SELECT 1 FROM public.session_members sm
              WHERE sm.session_id = s.id AND sm.user_id = ${user.id}
            )
          )
      )
    RETURNING b.id
  `;
  if (rows.length === 0) {
    throw new Error("Bil tidak ditemui atau akses ditolak.");
  }
  return { success: true };
}
