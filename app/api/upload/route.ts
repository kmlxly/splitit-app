import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server";
import { takeRateLimit } from "@/lib/rateLimit";

const FOLDER_RULES = {
  trips: {
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
    access: "public" as const,
  },
  trip_docs: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
    access: "private" as const,
  },
};

type UploadFolder = keyof typeof FOLDER_RULES;

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  const folder = (searchParams.get("folder") || "trips") as UploadFolder;

  if (!filename || !request.body || !(folder in FOLDER_RULES)) {
    return NextResponse.json(
      { error: "Nama fail, folder atau kandungan tidak sah." },
      { status: 400 },
    );
  }

  const rateLimit = takeRateLimit(`upload:${user.id}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak muat naik. Cuba lagi kemudian." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const rules = FOLDER_RULES[folder];
  const contentType = request.headers.get("content-type") || "";
  if (!rules.mimeTypes.has(contentType)) {
    return NextResponse.json(
      { error: "Jenis fail tidak disokong." },
      { status: 415 },
    );
  }

  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > rules.maxBytes) {
    return NextResponse.json({ error: "Fail terlalu besar." }, { status: 413 });
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > rules.maxBytes) {
    return NextResponse.json({ error: "Fail kosong atau terlalu besar." }, { status: 413 });
  }

  const safeName = filename
    .slice(0, 120)
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `${folder}/${user.id}/${crypto.randomUUID()}-${safeName}`;

  const blob = await put(fullPath, bytes, {
    access: rules.access,
    contentType,
  });

  return NextResponse.json({ url: blob.url });
}
