import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { requireTripRole } from "@/lib/authorization";
import { getServerUser } from "@/lib/auth/server";
import { sql } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const rows = await sql`
    SELECT id, trip_id, user_id, file_url, is_private
    FROM public.trip_documents
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  const document = rows[0] as
    | {
        trip_id: string;
        user_id: string | null;
        file_url: string;
        is_private: boolean;
      }
    | undefined;

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = await requireTripRole(user.id, document.trip_id);
  if (document.is_private && role !== "owner" && document.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let result;
  try {
    result = await get(document.file_url, {
      access: "private",
      useCache: false,
      abortSignal: request.signal,
    });
  } catch {
    // Backward compatibility for documents uploaded before private Blob storage.
    result = await get(document.file_url, {
      access: "public",
      abortSignal: request.signal,
    });
  }

  if (!result?.stream) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    result.blob.contentType || "application/octet-stream",
  );
  if (result.blob.size !== null) {
    headers.set("Content-Length", String(result.blob.size));
  }
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", "inline");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(result.stream, { status: 200, headers });
}
