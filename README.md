# SplitIt. 🧾

**Bahagi bill cara tenang.**
A modern, mobile-first Split Bill application built with a **Neo-Brutalism** design aesthetic. Designed to solve the headache of splitting complex receipts with friends, complete with tax calculations, discount distribution, and DuitNow QR integration.

🔗 **Live Demo:** [https://splitit-kmlxly.vercel.app](https://splitit-kmlxly.vercel.app)

## ✨ Features

### v1.9.0 (Latest Build)
- 📱 **Mobile Optimized:** Redesigned "Pay Terminal" modal to be compact and fit nicely on smaller screens.
- 🖼️ **Framed Receipt Sharing:** Generates a beautiful, square-framed receipt image (Insta-story style) for sharing, ensuring text doesn't look "naked" or cropped.
- 🚀 **Performance:** Optimized image generation scaling to prevent crashes on mobile browsers.
- 🎨 **Neo-Brutalism UI:** High contrast, hard shadows, and bold typography. Supports Dark/Light mode.
- 💳 **Payment Profiles:** Store Bank Info & Upload **DuitNow QR** for each user.
- ✅ **Settlement Tracker:** Mark debts as "PAID" or "UNPAID".

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
v1.9.0 - Mobile & Social Ready
UI Overhaul: Redesigned Pay Modal to be slimmer and mobile-friendly.

Social Share: Added background frame & padding to receipt screenshots for better aesthetics when sharing to WhatsApp/IG.

Bugfix: Adjusted html2canvas scaling to fix rendering issues on mobile devices.

v1.8.1 - Mobile Layout Fix
Fixed alignment issues in receipt view (vertical layout for mobile safety).

Added visual dashed lines for better ticket/receipt feel.

v1.8.0 - Picture Perfect
Added feature to generate and share receipt as an image using html2canvas.

Fixed UI visibility issues in Dark Mode headers.

v1.7.0 - Status Tracker
Added "Mark as Paid" toggle in settlement list (Green/Red indicator).

Improved "Copy All" formatted text for WhatsApp.

v1.6.0 - Settlement Pro
Added Payment Profile (Bank Name, Account No, QR Image).

Added Payment Modal popup with QR display.

v1.5.3 - UI Polish
Added animated hover effects on name buttons.

Cleaned up background (removed blobs) for pure Brutalism look.

Fixed dark mode icon colors.

v1.5.0 - The Brutal Update
Rebrand: Total UI overhaul to Neo-Brutalism (Thick borders, hard shadows).

Logic: Added Smart Tax & Service Charge calculations.

Edit Mode: Ability to edit existing bills.

v1.0.0 - Foundation
Initial release with basic Equal & Itemized split logic.

LocalStorage persistence.

Built by kmlxly