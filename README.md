# SplitIt. 🧾

**Bahagi bill cara tenang.**
A modern, mobile-first Split Bill application built with a **Neo-Brutalism** design aesthetic. Designed to solve the headache of splitting complex receipts with friends, complete with tax calculations, discount distribution, and DuitNow QR integration.

🔗 **Live Demo:** [https://splitit-kmlxly.vercel.app](https://splitit-kmlxly.vercel.app)

## ✨ Features

### v1.9.3 (Latest Build)
- 📱 **Mobile Optimized:** Redesigned "Pay Terminal" modal to be compact with a fixed footer, ensuring buttons are always visible on small screens.
- 🖼️ **Framed Receipt Sharing:** Generates a beautiful, square-framed receipt image (Insta-story style) for sharing via WhatsApp/Telegram.
- 🎨 **High Contrast UI:** Fixed visibility issues in Dark Mode, specifically for modal footers and action buttons.
- 🧮 **Hybrid Splitting Logic:** Supports both "Kongsi Rata" (Equal) and "Split Item" (Itemized) with Smart Tax/Discount distribution.
- 💾 **Local Persistence:** Auto-saves all data to device storage.
- 💳 **Payment Profiles:** Store Bank Info & Upload **DuitNow QR** for each user.
- ✅ **Settlement Tracker:** Mark debts as "PAID" or "UNPAID" visually.

## 🛠 Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Image Gen:** [html2canvas](https://html2canvas.hertzen.com/)
- **Deployment:** Vercel

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev

Open http://localhost:3000 with your browser to see the result.

📝 Changelog History
v1.9.5 - Stable Release (The "Open Tab" Solution)
Core Fix: Switched receipt generation method from navigator.share (which fails on non-HTTPS/embedded browsers) to window.open(). This ensures 100% compatibility across iOS and Android.

UI Patch: Forced solid background colors on Modal Footers to fix "Invisible Button" issues in Dark Mode/High Contrast settings.

Refactor: Expanded code blocks to prevent Parsing ecmascript build errors.

v1.9.0 - Mobile & Social Ready
UI Overhaul: Redesigned Pay Modal to be slimmer and mobile-friendly.

Social Share: Added background frame & padding to receipt screenshots for better aesthetics.

Bugfix: Optimized scaling to prevent crashes on mobile browsers.

v1.8.1 - Mobile Layout Fix
Fixed alignment issues in receipt view (vertical layout for mobile safety).

Added visual dashed lines for better ticket/receipt feel.

v1.8.0 - Picture Perfect
Added feature to generate and share receipt as an image using html2canvas.

v1.7.0 - Status Tracker
Added "Mark as Paid" toggle in settlement list.

Improved "Copy All" formatted text with versioning.

v1.6.0 - Settlement Pro
Added Payment Profile (Bank Name, Account No, QR Image).

Added Payment Modal popup with QR display.

v1.5.0 - The Brutal Update
Rebrand: Total UI overhaul to Neo-Brutalism.

v1.0.0 - Foundation
Initial release with basic Equal & Itemized split logic.

LocalStorage persistence.

Built by kmlxly