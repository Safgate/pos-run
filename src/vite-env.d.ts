/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECEIPT_PAPER_MM?: string;
  /** Width multiplier for receipt page (default 1 = base width). */
  readonly VITE_RECEIPT_WIDTH_MULTIPLIER?: string;
  /** Optional fixed @page height in mm; omit for `auto` (recommended for browser/Electron). */
  readonly VITE_RECEIPT_PAGE_LENGTH_MM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ReceiptPrintResult {
  success: boolean;
  error?: string;
}

interface ElectronAPI {
  printReceiptSilent: (html: string) => Promise<ReceiptPrintResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
