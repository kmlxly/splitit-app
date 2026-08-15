# Kmlxly Apps

Koleksi utiliti kewangan peribadi berasaskan Next.js: pembahagian bil, bajet, langganan dan perancangan perjalanan.

## Modul

- **SplitIt** — pecah bil secara sama rata atau itemized, imbas resit dengan AI dan jana settlement.
- **Budget.AI** — rekod transaksi, ringkasan bulanan dan analitik perbelanjaan.
- **SubTracker** — jejak langganan berulang dan sync bayaran ke Budget.AI.
- **TripIt** — itinerary, ahli dengan role, checklist, perbelanjaan peribadi dan dokumen percutian.
- **Offline SplitIt** — aliran asas pembahagian bil yang kekal tersedia tanpa rangkaian selepas production shell dicache.

## Stack

- Next.js 16 App Router, React 19 dan TypeScript
- Tailwind CSS, Framer Motion dan Lucide
- Neon Postgres + Neon Auth
- Vercel Blob untuk fail
- OpenRouter untuk scan resit/penyata dan pembantu kewangan

## Pembangunan

```bash
cp .env.example .env.local
npm install
npm run dev
```

Buka `http://localhost:3000`. Rujuk [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) untuk penyediaan Neon, OAuth dan Vercel Blob.

Pemeriksaan sebelum deploy:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

Nota: lint masih digunakan sebagai debt tracker untuk beberapa komponen legacy yang besar; production build menjalankan semakan TypeScript penuh.

## Keselamatan dan privasi

- Semua operasi cloud memerlukan sesi pengguna dan disekop kepada pemilik/ahli resource.
- Endpoint AI dan upload mempunyai had saiz, jenis fail serta rate limit asas.
- Dokumen TripIt baharu disimpan sebagai private blob dan distrim melalui endpoint yang memeriksa akses.
- Kunci AI kekal di server; jangan tambah secret dengan awalan `NEXT_PUBLIC_`.

Built by kmlxly.
