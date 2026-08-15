"use server";

import { sql } from "@/lib/db";
import { requireServerUser } from "@/lib/auth/server";
import { del } from "@vercel/blob";
import {
  requireOwnPersonalExpense,
  requireTripChecklistItemRole,
  requireTripChecklistRole,
  requireTripDocumentRole,
  requireTripItemRole,
  requireTripMemberRole,
  requireTripRole,
} from "@/lib/authorization";

const requireUser = requireServerUser;

// ============ TRIPS ============
export async function getMyTrips() {
  const user = await requireUser();
  const rows = await sql`
    SELECT * FROM public.trips
    WHERE owner_id = ${user.id}
       OR id IN (SELECT trip_id FROM public.trip_members WHERE auth_id = ${user.id})
    ORDER BY start_date ASC NULLS LAST
  `;
  return rows;
}

export async function getTripById(tripId: string) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId);
  const trips = await sql`
    SELECT * FROM public.trips WHERE id = ${tripId}::uuid
  `;
  if (trips.length === 0) return null;
  return trips[0];
}

export async function createTrip(payload: {
  name: string;
  start_date: string;
  end_date?: string | null;
  budget_limit?: number;
  cover_image?: string | null;
  currency?: string;
  destination_currency?: string;
}) {
  const user = await requireUser();
  const rows = await sql`
    INSERT INTO public.trips
      (owner_id, name, start_date, end_date, budget_limit, cover_image, currency, destination_currency)
    VALUES
      (${user.id}, ${payload.name}, ${payload.start_date},
       ${payload.end_date ?? null}, ${payload.budget_limit ?? 0},
       ${payload.cover_image ?? null}, ${payload.currency ?? "MYR"},
       ${payload.destination_currency ?? "SGD"})
    RETURNING *
  `;
  const trip = rows[0];

  // Auto-add owner as trip member
  const displayName =
    (user.displayName as string | undefined) ||
    (user.primaryEmail as string | undefined)?.split("@")[0] ||
    "Owner";

  await sql`
    INSERT INTO public.trip_members (trip_id, auth_id, name, role)
    VALUES (${trip.id}, ${user.id}, ${displayName}, 'owner')
  `;
  return trip;
}

export async function updateTrip(
  tripId: string,
  payload: {
    name: string;
    start_date: string;
    end_date?: string | null;
    budget_limit?: number;
    cover_image?: string | null;
    currency?: string;
    destination_currency?: string;
  },
) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId, ["owner"]);
  await sql`
    UPDATE public.trips SET
      name = ${payload.name},
      start_date = ${payload.start_date},
      end_date = ${payload.end_date ?? null},
      budget_limit = ${payload.budget_limit ?? 0},
      cover_image = ${payload.cover_image ?? null},
      currency = ${payload.currency ?? "MYR"},
      destination_currency = ${payload.destination_currency ?? "SGD"}
    WHERE id = ${tripId}::uuid
  `;
  return { success: true };
}

export async function updateTripCover(tripId: string, coverUrl: string) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId, ["owner"]);
  await sql`
    UPDATE public.trips SET cover_image = ${coverUrl}
    WHERE id = ${tripId}::uuid
  `;
  return { success: true };
}

export async function deleteTrip(tripId: string) {
  const user = await requireUser();
  await sql`
    DELETE FROM public.trips
    WHERE id = ${tripId}::uuid AND owner_id = ${user.id}
  `;
  return { success: true };
}

// ============ TRIP ITEMS ============
export async function getTripItems(tripId: string) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId);
  const rows = await sql`
    SELECT * FROM public.trip_items
    WHERE trip_id = ${tripId}::uuid
    ORDER BY day_date ASC
  `;
  return rows;
}

export async function addTripItem(payload: {
  trip_id: string;
  title: string;
  type: string;
  location?: string | null;
  start_time?: string | null;
  day_date: string;
  color?: string;
  cost?: number;
  original_currency?: string;
  original_amount?: number;
  exchange_rate?: number;
}) {
  const user = await requireUser();
  await requireTripRole(user.id, payload.trip_id, ["owner", "editor"]);
  const rows = await sql`
    INSERT INTO public.trip_items
      (trip_id, title, type, location, start_time, day_date, color, cost,
       original_currency, original_amount, exchange_rate)
    VALUES
      (${payload.trip_id}::uuid, ${payload.title}, ${payload.type},
       ${payload.location ?? null}, ${payload.start_time ?? null},
       ${payload.day_date}, ${payload.color ?? "bg-blue-600"},
       ${payload.cost ?? 0},
       ${payload.original_currency ?? "MYR"},
       ${payload.original_amount ?? 0},
       ${payload.exchange_rate ?? 1})
    RETURNING *
  `;
  return rows[0];
}

export async function updateTripItem(
  itemId: string,
  payload: {
    title: string;
    type: string;
    location?: string | null;
    start_time?: string | null;
    day_date: string;
    color?: string;
    cost?: number;
    original_currency?: string;
    original_amount?: number;
    exchange_rate?: number;
  },
) {
  const user = await requireUser();
  await requireTripItemRole(user.id, itemId, ["owner", "editor"]);
  await sql`
    UPDATE public.trip_items SET
      title = ${payload.title},
      type = ${payload.type},
      location = ${payload.location ?? null},
      start_time = ${payload.start_time ?? null},
      day_date = ${payload.day_date},
      color = ${payload.color ?? "bg-blue-600"},
      cost = ${payload.cost ?? 0},
      original_currency = ${payload.original_currency ?? "MYR"},
      original_amount = ${payload.original_amount ?? 0},
      exchange_rate = ${payload.exchange_rate ?? 1}
    WHERE id = ${itemId}::uuid
  `;
  return { success: true };
}

export async function toggleTripItemComplete(
  itemId: string,
  newStatus: boolean,
) {
  const user = await requireUser();
  await requireTripItemRole(user.id, itemId, ["owner", "editor"]);
  await sql`
    UPDATE public.trip_items SET is_completed = ${newStatus}
    WHERE id = ${itemId}::uuid
  `;
  return { success: true };
}

export async function deleteTripItem(itemId: string) {
  const user = await requireUser();
  await requireTripItemRole(user.id, itemId, ["owner", "editor"]);
  await sql`
    DELETE FROM public.trip_items WHERE id = ${itemId}::uuid
  `;
  return { success: true };
}

// ============ TRIP MEMBERS ============
export async function getTripMembers(tripId: string) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId);
  const rows = await sql`
    SELECT * FROM public.trip_members
    WHERE trip_id = ${tripId}::uuid
  `;
  return rows;
}

export async function addTripMember(tripId: string, name: string) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId, ["owner"]);
  const rows = await sql`
    INSERT INTO public.trip_members (trip_id, name, role)
    VALUES (${tripId}::uuid, ${name}, 'editor')
    RETURNING *
  `;
  return rows[0];
}

export async function removeTripMember(memberId: string) {
  const user = await requireUser();
  await requireTripMemberRole(user.id, memberId, ["owner"]);
  const rows = await sql`
    DELETE FROM public.trip_members
    WHERE id = ${memberId}::uuid AND role <> 'owner'
    RETURNING id
  `;
  if (rows.length === 0) throw new Error("Pemilik trip tidak boleh dibuang.");
  return { success: true };
}

// ============ TRIP DOCUMENTS ============
export async function getTripDocuments(tripId: string) {
  const user = await requireUser();
  const role = await requireTripRole(user.id, tripId);
  const rows = await sql`
    SELECT * FROM public.trip_documents
    WHERE trip_id = ${tripId}::uuid
      AND (
        is_private = FALSE
        OR user_id = ${user.id}
        OR ${role} = 'owner'
      )
    ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    ...row,
    file_url: `/api/documents/${row.id}`,
  }));
}

export async function addTripDocument(payload: {
  trip_id: string;
  title: string;
  file_url: string;
  type: string;
  is_private?: boolean;
}) {
  const user = await requireUser();
  await requireTripRole(user.id, payload.trip_id, ["owner", "editor"]);
  const rows = await sql`
    INSERT INTO public.trip_documents (trip_id, user_id, title, file_url, type, is_private)
    VALUES (${payload.trip_id}::uuid, ${user.id}, ${payload.title},
            ${payload.file_url}, ${payload.type}, ${payload.is_private ?? false})
    RETURNING *
  `;
  return {
    ...rows[0],
    file_url: `/api/documents/${rows[0].id}`,
  };
}

export async function deleteTripDocument(docId: string) {
  const user = await requireUser();
  const role = await requireTripDocumentRole(user.id, docId, [
    "owner",
    "editor",
  ]);
  const rows = await sql`
    DELETE FROM public.trip_documents
    WHERE id = ${docId}::uuid
      AND (${role} = 'owner' OR user_id = ${user.id})
    RETURNING id, file_url
  `;
  if (rows.length === 0) {
    throw new Error("Hanya pemilik dokumen atau pemilik trip boleh memadamnya.");
  }
  const fileUrl = rows[0]?.file_url as string | undefined;
  if (fileUrl) {
    await del(fileUrl).catch((error: unknown) => {
      console.error("Gagal memadam fail Blob:", error);
    });
  }
  return { success: true };
}

// ============ TRIP CHECKLISTS ============
export async function getTripChecklists(tripId: string) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId);
  const checklists = await sql`
    SELECT * FROM public.trip_checklists
    WHERE trip_id = ${tripId}::uuid
    ORDER BY created_at ASC
  `;
  if (checklists.length === 0) return [];

  const checklistIds = checklists.map((checklist) => checklist.id);
  const items = await sql`
    SELECT * FROM public.trip_checklist_items
    WHERE checklist_id = ANY(${checklistIds}::uuid[])
    ORDER BY created_at ASC
  `;

  return checklists.map((checklist) => ({
    ...checklist,
    trip_checklist_items: items.filter((item) => item.checklist_id === checklist.id),
  }));
}

export async function addChecklist(tripId: string, title: string) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId, ["owner", "editor"]);
  const rows = await sql`
    INSERT INTO public.trip_checklists (trip_id, title)
    VALUES (${tripId}::uuid, ${title})
    RETURNING *
  `;
  return { ...rows[0], trip_checklist_items: [] };
}

export async function addChecklistItem(
  checklistId: string,
  itemName: string,
) {
  const user = await requireUser();
  await requireTripChecklistRole(user.id, checklistId, ["owner", "editor"]);
  const rows = await sql`
    INSERT INTO public.trip_checklist_items (checklist_id, item_name)
    VALUES (${checklistId}::uuid, ${itemName})
    RETURNING *
  `;
  return rows[0];
}

export async function toggleChecklistItem(
  itemId: string,
  newStatus: boolean,
) {
  const user = await requireUser();
  await requireTripChecklistItemRole(user.id, itemId, ["owner", "editor"]);
  await sql`
    UPDATE public.trip_checklist_items
    SET is_checked = ${newStatus}, checked_by = ${user.id}
    WHERE id = ${itemId}::uuid
  `;
  return { success: true };
}

export async function deleteChecklist(checklistId: string) {
  const user = await requireUser();
  await requireTripChecklistRole(user.id, checklistId, ["owner", "editor"]);
  await sql`
    DELETE FROM public.trip_checklists WHERE id = ${checklistId}::uuid
  `;
  return { success: true };
}

export async function deleteChecklistItem(itemId: string) {
  const user = await requireUser();
  await requireTripChecklistItemRole(user.id, itemId, ["owner", "editor"]);
  await sql`
    DELETE FROM public.trip_checklist_items WHERE id = ${itemId}::uuid
  `;
  return { success: true };
}

// ============ PERSONAL EXPENSES ============
export async function getPersonalExpenses(tripId: string) {
  const user = await requireUser();
  await requireTripRole(user.id, tripId);
  const rows = await sql`
    SELECT * FROM public.trip_personal_expenses
    WHERE trip_id = ${tripId}::uuid AND user_id = ${user.id}
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function addPersonalExpense(payload: {
  trip_id: string;
  title: string;
  amount: number;
  category?: string | null;
  original_currency?: string;
  original_amount?: number;
  exchange_rate?: number;
}) {
  const user = await requireUser();
  await requireTripRole(user.id, payload.trip_id);
  const rows = await sql`
    INSERT INTO public.trip_personal_expenses
      (trip_id, user_id, title, amount, category, original_currency, original_amount, exchange_rate)
    VALUES
      (${payload.trip_id}::uuid, ${user.id}, ${payload.title},
       ${payload.amount}, ${payload.category ?? null},
       ${payload.original_currency ?? "MYR"},
       ${payload.original_amount ?? 0},
       ${payload.exchange_rate ?? 1})
    RETURNING *
  `;
  return rows[0];
}

export async function deletePersonalExpense(expenseId: string) {
  const user = await requireUser();
  await requireOwnPersonalExpense(user.id, expenseId);
  await sql`
    DELETE FROM public.trip_personal_expenses
    WHERE id = ${expenseId}::uuid AND user_id = ${user.id}
  `;
  return { success: true };
}

// ============ JOIN BY TOKEN ============
export async function joinTripByToken(token: string) {
  const user = await requireUser();
  const displayName =
    (user.displayName as string | undefined) ||
    (user.primaryEmail as string | undefined)?.split("@")[0] ||
    "New Member";

  const rows = await sql`
    SELECT public.join_trip_by_token(${token}, ${user.id}, ${displayName}) as result
  `;
  return rows[0]?.result;
}
