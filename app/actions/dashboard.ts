"use server";

import { sql } from "@/lib/db";
import { getServerUser } from "@/lib/auth/server";
import { getDaysUntilBilling, type BillingCycle } from "@/lib/billing";

type DashboardStats = {
  toCollect: number;
  pocketBalance: number;
  nextBill: string;
};

type SessionPerson = { id: string; name: string };
type SessionRow = {
  id: string;
  owner_id: string;
  people?: SessionPerson[];
  paid_status?: Record<string, boolean>;
};
type BillRow = {
  session_id: string;
  paid_by: string;
  details?: Array<{ personId: string; total: number | string }>;
};
type SubscriptionRow = {
  title: string;
  first_bill_date: string | null;
  cycle: BillingCycle;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await getServerUser();
  if (!user) {
    return { toCollect: 0, pocketBalance: 0, nextBill: "Tiada Data" };
  }

  const userId = user.id;
  const myEmailPrefix =
    user.primaryEmail?.split("@")[0].toLowerCase() || "";

  let finalToCollect = 0;
  let finalPocketBalance = 0;
  let finalNextBill = "Tiada Data";

  // ============== SPLITIT ==============
  // own sessions + shared sessions
  const allSessions = await sql`
    SELECT id, people, owner_id, paid_status FROM public.sessions
    WHERE owner_id = ${userId}
       OR id IN (SELECT session_id FROM public.session_members WHERE user_id = ${userId})
  `;

  if (allSessions.length > 0) {
    const sessions = allSessions as SessionRow[];
    const sessionIds = sessions.map((session) => session.id);
    const myBills = await sql`
      SELECT * FROM public.bills WHERE session_id = ANY(${sessionIds}::text[])
    `;
    const bills = myBills as BillRow[];

    let totalReceivable = 0;
    let totalPayable = 0;

    sessions.forEach((sess) => {
      const isOwner = sess.owner_id === userId;
      const people = sess.people || [];
      const paidStatus = sess.paid_status || {};
      const peopleIds = people.map((person) => person.id);

      // Robust identity check
      let myPersonId = isOwner ? "p1" : "";
      const nameMatch = people.find((person) => {
        const n = person.name.toLowerCase();
        return n === "aku" || n === "me" || n === myEmailPrefix;
      });
      if (nameMatch) {
        if (!isOwner || (isOwner && nameMatch.id === "p1"))
          myPersonId = nameMatch.id;
      }
      if (!myPersonId) {
        const guest = people.find((person) => person.id !== "p1");
        myPersonId = guest ? guest.id : people[0]?.id || "p1";
      }

      const sessBills = bills.filter((bill) => bill.session_id === sess.id);
      const debtMap: Record<string, Record<string, number>> = {};
      peopleIds.forEach((id: string) => (debtMap[id] = {}));

      sessBills.forEach((bill) => {
        const payerId = bill.paid_by;
        if (!debtMap[payerId]) return;
        bill.details?.forEach((detail) => {
          const consumerId = detail.personId;
          const detailTotal = Number(detail.total);
          if (
            consumerId !== payerId &&
            detailTotal > 0 &&
            debtMap[consumerId]
          ) {
            debtMap[consumerId][payerId] =
              (debtMap[consumerId][payerId] || 0) + detailTotal;
          }
        });
      });

      const processed = new Set<string>();
      peopleIds.forEach((idA: string) => {
        peopleIds.forEach((idB: string) => {
          if (idA === idB) return;
          const key = [idA, idB].sort().join("-");
          if (processed.has(key)) return;

          const aOwesB = debtMap[idA]?.[idB] || 0;
          const bOwesA = debtMap[idB]?.[idA] || 0;

          let transfer: { from: string; to: string; amount: number } | null =
            null;
          if (aOwesB > bOwesA)
            transfer = { from: idA, to: idB, amount: aOwesB - bOwesA };
          else if (bOwesA > aOwesB)
            transfer = { from: idB, to: idA, amount: bOwesA - aOwesB };

          if (transfer && transfer.amount > 0.05) {
            const isPaid = paidStatus[`${transfer.from}-${transfer.to}`];
            if (!isPaid) {
              if (transfer.to === myPersonId)
                totalReceivable += transfer.amount;
              if (transfer.from === myPersonId)
                totalPayable += transfer.amount;
            }
          }
          processed.add(key);
        });
      });
    });
    finalToCollect = totalReceivable - totalPayable;
  }

  // ============== BUDGET (current month) ==============
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const budgetRows = await sql`
    SELECT amount FROM public.budget_transactions
    WHERE user_id = ${userId}
      AND iso_date >= ${currentMonthStr + "-01"}
      AND iso_date <= ${currentMonthStr + "-31"}
  `;
  finalPocketBalance = budgetRows.reduce(
    (acc, curr) => acc + Number(curr.amount || 0),
    0,
  );

  // ============== SUBSCRIPTIONS ==============
  const subRows = await sql`
    SELECT * FROM public.subscriptions WHERE user_id = ${userId}
  `;
  if (subRows.length > 0) {
    let nearestDays = Infinity;
    let nearestSub: SubscriptionRow | null = null;

    for (const sub of subRows as SubscriptionRow[]) {
      if (!sub.first_bill_date) continue;
      const diffDays = getDaysUntilBilling(sub.first_bill_date, sub.cycle);
      if (diffDays === null) continue;
      if (diffDays >= 0 && diffDays < nearestDays) {
        nearestDays = diffDays;
        nearestSub = sub;
      }
    }
    if (nearestSub) {
      const label = nearestDays === 0 ? "HARI NI!" : `${nearestDays} hari`;
      finalNextBill = `${nearestSub.title} (${label})`;
    }
  }

  if (Math.abs(finalToCollect) < 0.05) finalToCollect = 0;

  return {
    toCollect: finalToCollect,
    pocketBalance: finalPocketBalance,
    nextBill: finalNextBill,
  };
}
