# Kmlxly Apps (Super App) 🚀

A personal web utilities toolbox built with **Next.js**.
This project serves as a central hub (Super App) for various productivity tools, starting with **SplitIt**.

## 📱 Apps Included

### 1. SplitIt v3.1 (Bill Splitter AI)
A brutalist-style bill splitting application turbo-charged with AI.
* **🤖 AI Smart Scan:** Powered by **Google Gemini 2.0 Flash**. Automatically detects items, prices, SST/Tax, Service Charge, Discounts, and Deposits from receipts.
* **✂️ Crop & Zoom:** Integrated `react-easy-crop` for precise QR code and receipt uploads.
* **📝 Flexible Editing:** Edit scanned items, manage shared items, and auto-calculate complex splits (Equal/Itemized).
* **💸 Smart Settlement:** Compact settlement cards showing exactly what each person ordered.
* **📲 WhatsApp Ready:** One-click summary generation (works on HTTP/HTTPS).
* **💳 Payment Profiles:** Save bank details & resizeable DuitNow QR codes.

## 🛠️ Tech Stack
* **Framework:** Next.js 14 (App Router)
* **Styling:** Tailwind CSS (Brutalism UI)
* **Icons:** Lucide React
* **AI Engine:** Google Gemini API (`gemini-2.0-flash` with fallback to `1.5-flash`)
* **Image Handling:** html2canvas, react-easy-crop

## 📂 Project Structure

src/app/ ├── page.tsx # Home / Menu Utama (App Selector) ├── layout.tsx # Global Layout └── splitit/ # SplitIt App Module └── page.tsx # Main Logic (SplitIt V3.1)

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone [REPO_URL]
    ```

2.  **Install dependencies**
    ```bash
    npm install
    npm install react-easy-crop  # Critical for v3.0+
    ```

3.  **Setup API Key**
    * Open `src/app/splitit/page.tsx`
    * Replace `const API_KEY` with your valid Google Gemini API Key.

4.  **Run locally**
    ```bash
    npm run dev
    ```

---
*Built by kmlxly.*