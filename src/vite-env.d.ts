/// <reference types="vite/client" />

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
