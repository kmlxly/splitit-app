# SplitIt. 🧾

**Bahagi bill cara tenang.**
A modern, mobile-first Split Bill application built with a **Neo-Brutalism** design aesthetic. Designed to solve the headache of splitting complex receipts with friends, complete with tax calculations, discount distribution, and DuitNow QR integration.

🔗 **Live Demo:** [https://splitit-kmlxly.vercel.app](https://splitit-kmlxly.vercel.app)

## ✨ Features (v2.2.0)

### 📱 PWA Support (New!)
- **Installable:** Add to Home Screen on iOS and Android.
- **Native Feel:** Runs full-screen without browser bars.
- **Offline Capable:** Loads instantly even on slow connections.

### 📂 Event Manager Pro
- **Multi-Session:** Create separate folders for different events (e.g., "Trip Hatyai", "Office Lunch").
- **Manage Folders:** Rename or Delete sessions easily with a dedicated manager UI.
- **Auto-Save:** All data is persisted locally on your device.

### 📊 Dashboard & Analytics
- **Quick Summary:** View "Total Hangus" (Total Spent) directly on the dashboard.
- **Event Switcher:** Fast-switch between active events via the header or dashboard card.

### 💸 Powerful Splitting Logic
- **Hybrid Splitting:** Supports "Equal Split" & "Itemized Split" in one bill.
- **Smart Tax/Discount:** Auto-distributes Service Tax and Discounts proportionally or equally.
- **Final Settlement:** algorithm calculates the minimum number of transfers required to settle debts.

### 🖼️ Share & Pay
- **Receipt Gen:** Generates high-res, square-framed receipt images for WhatsApp/IG Stories.
- **Payment Profiles:** Store Bank Info & Upload **DuitNow QR** (with smart crop warnings).

## 🛠 Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **PWA:** `next-pwa` standards (Manifest & Metadata)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Image Gen:** [html2canvas](https://html2canvas.hertzen.com/)
- **Deployment:** Vercel

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev

Open http://localhost:3000 with your browser to see the result.

📝 Changelog History
v2.2.0 - Event Manager Update 🛠️
Feature: Added capability to Rename and Delete specific sessions/events.

UI: Improved Session Manager modal with edit/delete icons.

Safety: Prevented deletion of the last remaining session to ensure app stability.

v2.1.2 - PWA & UI Polish 📱
Feature: Full PWA Support (Manifest + Viewport settings).

UI: Fixed Logo visibility in Dark Mode (Auto-white background container).

UX: Added "Total Hangus" summary inside the Settlement Card.

v2.0.0 - The Folder Update 📂
Core: Implemented Multi-Session logic.

Migration: Auto-migrates legacy data into a "Saved Session" folder.


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