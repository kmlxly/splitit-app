# Kmlxly Apps (Super App) 🚀

A personal web utilities toolbox built with **Next.js**.
This project serves as a central hub (Super App) for various productivity tools, starting with **SplitIt**.

## 📱 Apps Included

### 1. SplitIt v2.6 (Bill Splitter)
A brutalist-style bill splitting application designed for efficiency.
* **OCR Scanning:** Scan receipts automatically using AI (Tesseract.js). supports Camera & Gallery import.
* **Flexible Splitting:** Support for "Equal Split" (Kongsi Rata) and "Itemized Split" (Asing-asing).
* **Smart Tax/Service Charge:** Auto-calculate SST (6%) and Service Charge (10%) proportionally.
* **WhatsApp Summary:** Generate settlement summaries with one click.
* **Payment Profiles:** Save bank details & DuitNow QR for easy transfers.

## 🛠️ Tech Stack
* **Framework:** Next.js 14 (App Router)
* **Styling:** Tailwind CSS (Brutalism UI)
* **Icons:** Lucide React
* **OCR Engine:** Tesseract.js
* **Image Handling:** html2canvas

## 📂 Project Structure
This project uses a multi-app directory structure:
src/app/ ├── page.tsx # Home / Menu Utama (App Selector) ├── layout.tsx # Global Layout └── splitit/ # SplitIt App Module └── page.tsx # Main Logic for Split Bill


## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run locally**
    ```bash
    npm run dev
    ```

4.  **Build for Production**
    ```bash
    npm run build
    npm start
    ```

## 📝 Changelog
**v2.6.2 (Current)**
* Refactored into Super App structure (`/` Home, `/splitit` Sub-app).
* Added Tesseract.js for OCR receipt scanning.
* Added Scan Method Modal (Camera vs Gallery).
* Cleaned up UI for input forms & dashboard.
* Fixed mobile responsiveness and removed heavy animations for performance.

---
*Built by kmlxly.*