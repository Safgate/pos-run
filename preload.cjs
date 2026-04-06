const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceiptSilent: (html) => ipcRenderer.invoke('print-receipt-html', html),
});
