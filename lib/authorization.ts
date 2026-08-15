import "server-only";

import { sql } from "@/lib/db";
import { isTripRoleAllowed, TRIP_ROLES, type TripRole } from "@/lib/roles";

export type { TripRole } from "@/lib/roles";

function forbidden(): never {
  throw new Error("Anda tidak mempunyai akses kepada data ini.");
}

function missing(): never {
  throw new Error("Rekod tidak ditemui.");
}

export async function requireTripRole(
  userId: string,
  tripId: string,
  allowedRoles: readonly TripRole[] = TRIP_ROLES,
): Promise<TripRole> {
  const rows = await sql`
    SELECT CASE
      WHEN t.owner_id = ${userId} THEN 'owner'
      ELSE tm.role
    END AS role
    FROM public.trips t
    LEFT JOIN public.trip_members tm
      ON tm.trip_id = t.id AND tm.auth_id = ${userId}
    WHERE t.id = ${tripId}::uuid
      AND (t.owner_id = ${userId} OR tm.auth_id = ${userId})
    LIMIT 1
  `;

  const role: unknown = rows[0]?.role;
  if (!isTripRoleAllowed(role, allowedRoles)) forbidden();
  return role;
}

async function tripIdForItem(itemId: string): Promise<string> {
  const rows = await sql`
    SELECT trip_id FROM public.trip_items WHERE id = ${itemId}::uuid
  `;
  const tripId = rows[0]?.trip_id as string | undefined;
  if (!tripId) missing();
  return tripId;
}

async function tripIdForMember(memberId: string): Promise<string> {
  const rows = await sql`
    SELECT trip_id FROM public.trip_members WHERE id = ${memberId}::uuid
  `;
  const tripId = rows[0]?.trip_id as string | undefined;
  if (!tripId) missing();
  return tripId;
}

async function tripIdForDocument(documentId: string): Promise<string> {
  const rows = await sql`
    SELECT trip_id FROM public.trip_documents WHERE id = ${documentId}::uuid
  `;
  const tripId = rows[0]?.trip_id as string | undefined;
  if (!tripId) missing();
  return tripId;
}

async function tripIdForChecklist(checklistId: string): Promise<string> {
  const rows = await sql`
    SELECT trip_id FROM public.trip_checklists WHERE id = ${checklistId}::uuid
  `;
  const tripId = rows[0]?.trip_id as string | undefined;
  if (!tripId) missing();
  return tripId;
}

async function tripIdForChecklistItem(itemId: string): Promise<string> {
  const rows = await sql`
    SELECT c.trip_id
    FROM public.trip_checklist_items i
    INNER JOIN public.trip_checklists c ON c.id = i.checklist_id
    WHERE i.id = ${itemId}::uuid
  `;
  const tripId = rows[0]?.trip_id as string | undefined;
  if (!tripId) missing();
  return tripId;
}

export async function requireTripItemRole(
  userId: string,
  itemId: string,
  allowedRoles: TripRole[],
) {
  return requireTripRole(userId, await tripIdForItem(itemId), allowedRoles);
}

export async function requireTripMemberRole(
  userId: string,
  memberId: string,
  allowedRoles: TripRole[],
) {
  return requireTripRole(userId, await tripIdForMember(memberId), allowedRoles);
}

export async function requireTripDocumentRole(
  userId: string,
  documentId: string,
  allowedRoles: TripRole[],
) {
  return requireTripRole(
    userId,
    await tripIdForDocument(documentId),
    allowedRoles,
  );
}

export async function requireTripChecklistRole(
  userId: string,
  checklistId: string,
  allowedRoles: TripRole[],
) {
  return requireTripRole(
    userId,
    await tripIdForChecklist(checklistId),
    allowedRoles,
  );
}

export async function requireTripChecklistItemRole(
  userId: string,
  itemId: string,
  allowedRoles: TripRole[],
) {
  return requireTripRole(
    userId,
    await tripIdForChecklistItem(itemId),
    allowedRoles,
  );
}

export async function requireOwnPersonalExpense(
  userId: string,
  expenseId: string,
) {
  const rows = await sql`
    SELECT trip_id, user_id
    FROM public.trip_personal_expenses
    WHERE id = ${expenseId}::uuid
  `;
  const expense = rows[0] as
    | { trip_id: string; user_id: string }
    | undefined;
  if (!expense) missing();
  if (expense.user_id !== userId) forbidden();
  await requireTripRole(userId, expense.trip_id);
}

export async function requireSessionAccess(userId: string, sessionId: string) {
  const rows = await sql`
    SELECT s.id
    FROM public.sessions s
    WHERE s.id = ${sessionId}
      AND (
        s.owner_id = ${userId}
        OR EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = ${userId}
        )
      )
    LIMIT 1
  `;
  if (rows.length === 0) forbidden();
}

export async function requireSessionOwner(userId: string, sessionId: string) {
  const rows = await sql`
    SELECT id FROM public.sessions
    WHERE id = ${sessionId} AND owner_id = ${userId}
    LIMIT 1
  `;
  if (rows.length === 0) forbidden();
}
