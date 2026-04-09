/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECEIPT_PAPER_MM?: string;
  /** Width multiplier for receipt page (default 2 = 200% of base mm). Set 1 for base width only. */
  readonly VITE_RECEIPT_WIDTH_MULTIPLIER?: string;
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
