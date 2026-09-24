import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("jarvis", {
  chat: (payload: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    memories?: string[];
  }) => ipcRenderer.invoke("jarvis:chat", payload),
  getSystemInfo: () => ipcRenderer.invoke("jarvis:systemInfo"),
  getConfig: () => ipcRenderer.invoke("jarvis:getConfig"),
  openExternal: (url: string) => ipcRenderer.invoke("jarvis:openExternal", url),
  openApp: (name: string) => ipcRenderer.invoke("jarvis:openApp", name)
});
