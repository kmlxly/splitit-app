"use server";

import { sql } from "@/lib/db";
import { getServerUser } from "@/lib/auth/server";

type DashboardStats = {
  toCollect: number;
  pocketBalance: number;
  nextBill: string;
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
    const sessionIds = allSessions.map((s: any) => s.id);
    const myBills = await sql`
      SELECT * FROM public.bills WHERE session_id = ANY(${sessionIds}::text[])
    `;

    let totalReceivable = 0;
    let totalPayable = 0;

    allSessions.forEach((sess: any) => {
      const isOwner = sess.owner_id === userId;
      const people = sess.people || [];
      const paidStatus = sess.paid_status || {};
      const peopleIds = people.map((p: any) => p.id);

      // Robust identity check
      let myPersonId = isOwner ? "p1" : "";
      const nameMatch = people.find((p: any) => {
        const n = p.name.toLowerCase();
        return n === "aku" || n === "me" || n === myEmailPrefix;
      });
      if (nameMatch) {
        if (!isOwner || (isOwner && nameMatch.id === "p1"))
          myPersonId = nameMatch.id;
      }
      if (!myPersonId) {
        const guest = people.find((p: any) => p.id !== "p1");
        myPersonId = guest ? guest.id : people[0]?.id || "p1";
      }

      const sessBills = myBills.filter((b: any) => b.session_id === sess.id);
      const debtMap: Record<string, Record<string, number>> = {};
      peopleIds.forEach((id: string) => (debtMap[id] = {}));

      sessBills.forEach((b: any) => {
        const payerId = b.paid_by;
        if (!debtMap[payerId]) return;
        b.details?.forEach((d: any) => {
          const consumerId = d.personId;
          if (
            consumerId !== payerId &&
            d.total > 0 &&
            debtMap[consumerId]
          ) {
            debtMap[consumerId][payerId] =
              (debtMap[consumerId][payerId] || 0) + Number(d.total);
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
    (acc: number, curr: any) => acc + Number(curr.amount || 0),
    0,
  );

  // ============== SUBSCRIPTIONS ==============
  const subRows = await sql`
    SELECT * FROM public.subscriptions WHERE user_id = ${userId}
  `;
  if (subRows.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nearestDays = Infinity;
    let nearestSub: any = null;

    subRows.forEach((sub: any) => {
      if (!sub.first_bill_date) return;
      const due = new Date(sub.first_bill_date);
      due.setHours(0, 0, 0, 0);
      let diffDays = Math.ceil(
        (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (sub.cycle === "Monthly" && diffDays < 0) {
        const nextMonth = new Date(due);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        if (nextMonth.getDate() !== due.getDate()) nextMonth.setDate(0);
        diffDays = Math.ceil(
          (nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
      if (diffDays >= 0 && diffDays < nearestDays) {
        nearestDays = diffDays;
        nearestSub = sub;
      }
    });
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
