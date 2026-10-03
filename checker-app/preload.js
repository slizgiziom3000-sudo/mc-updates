const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("mcBridge", {
  fetchText: (url) => ipcRenderer.invoke("mc:fetchText", String(url)),
});
