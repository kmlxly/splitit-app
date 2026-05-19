import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server";

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  const folder = searchParams.get("folder") || "trips";

  if (!filename || !request.body) {
    return NextResponse.json(
      { error: "Missing filename or body" },
      { status: 400 },
    );
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `${folder}/${user.id}/${Date.now()}-${safeName}`;

  const blob = await put(fullPath, request.body, {
    access: "public",
    contentType:
      request.headers.get("content-type") || "application/octet-stream",
  });

  return NextResponse.json({ url: blob.url });
}
