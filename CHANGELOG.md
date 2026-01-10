# Changelog

## [v3.1.0] - 2026-01-10 (Latest Stable)
### Fixed
- **Code Structure Refactor:** Moved all helper functions (`compressImage`, `getCroppedImg`) to the top level to resolve "ReferenceError" / "Red squiggly line" issues in TypeScript/ESLint.
- **Copy Function:** Fixed `navigator.clipboard` error on non-secure (HTTP/Local Network) environments by adding a fallback method.

## [v3.0.0] - 2026-01-10
### Added
- **Image Cropper:** Integrated `react-easy-crop` to allow users to zoom and crop QR codes before saving payment profiles.
- **AI Fallback Logic:** Added auto-retry mechanism. If `gemini-2.0-flash` fails (404), it automatically switches to `gemini-1.5-flash-8b`.

## [v2.9.1]
### Improved
- **QR Display:** Resized generated QR code in settlement card (from `w-40` to `w-28`) to prevent the card from becoming too tall and cutting off content.

## [v2.8.2]
### Improved
- **Settlement Card:** Redesigned to be more compact. Added a "Context" list (e.g., "Untuk: Nasi Lemak, Teh O") to show exactly what the payment is for.

## [v2.8.1]
### Added
- **AI Financial Detection:** Expanded AI prompt to detect "Discount" and "Deposit" amounts from receipts and offer auto-fill options.

## [v2.8.0]
### Added
- **Edit Mode:** Scanned items can now be edited (Name/Price/Shared By) directly in the input form instead of just deleting them.
- **Tax Detection:** AI now detects SST/Service Charge and suggests adding it to "Caj Tetap".

## [v2.7.0]
### Changed
- **OCR Engine:** Migrated from `tesseract.js` (Classic OCR) to **Google Gemini API** for intelligent parsing.
- **Image Compression:** Added auto-compression (max 1024px) to ensure fast API uploads.

---