export async function uploadFileToBlob(
  file: File | Blob,
  filename: string,
  folder: "trips" | "trip_docs",
): Promise<string> {
  const res = await fetch(
    `/api/upload?filename=${encodeURIComponent(filename)}&folder=${folder}`,
    {
      method: "POST",
      headers: {
        "content-type": file.type || "application/octet-stream",
      },
      body: file,
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}
