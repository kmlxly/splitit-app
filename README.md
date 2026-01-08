# SplitIt. 🧾

**Bahagi bill cara tenang.**
A modern, mobile-first Split Bill application built with a **Neo-Brutalism** design aesthetic. Designed to solve the headache of splitting complex receipts with friends, complete with tax calculations, discount distribution, and DuitNow QR integration.

🔗 **Live Demo:** [https://splitit-kmlxly.vercel.app](https://splitit-kmlxly.vercel.app) *(Gantikan link sebenar jika ada)*

## ✨ Features

### v1.8.0 (Latest Build)
- 🎨 **Neo-Brutalism UI:** High contrast, hard shadows, and bold typography. Supports Dark/Light mode.
- 🧮 **Hybrid Splitting Logic:**
  - **Kongsi Rata:** Equal split for simple meals.
  - **Split Item:** Individual itemized entry.
  - **Smart Tax/Discount:** Distribute tax/service charge proportionally or equally. Handles discounts logic flawlessly.
- 💾 **Local Persistence:** Auto-saves all data (People, Bills, Payment Profiles) to device storage.
- 💳 **Payment Profiles:** Store Bank Info & Upload **DuitNow QR** for each user.
- ✅ **Settlement Tracker:** Mark debts as "PAID" or "UNPAID" visually.
- 📸 **Share as Image:** Generate a beautiful receipt card image to share directly to WhatsApp/Telegram (powered by `html2canvas`).

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