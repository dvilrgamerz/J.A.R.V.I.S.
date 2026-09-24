/// <reference types="vite/client" />

interface Navigator {
  deviceMemory?: number;
}

interface Window {
  puter?: {
    ai?: {
      chat: (...args: any[]) => Promise<any>;
      listModels?: (...args: any[]) => Promise<any[]>;
    };
  };
}
