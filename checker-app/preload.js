const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("mcBridge", {
  fetchText: (url) => ipcRenderer.invoke("mc:fetchText", String(url)),
  postJson: (url, body) => ipcRenderer.invoke("mc:postJson", String(url), body),
});
