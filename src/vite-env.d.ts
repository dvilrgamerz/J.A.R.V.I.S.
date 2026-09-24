/// <reference types="vite/client" />

type JarvisSystemInfo = {
  platform: string;
  release: string;
  hostname: string;
  cpu: string;
  cores: number;
  memoryGb: number;
  uptimeMinutes: number;
};

type JarvisConfig = {
  aiConfigured: boolean;
  model: string;
};

type JarvisResult = {
  ok: boolean;
  error?: string;
};

type JarvisChatResult = JarvisResult & {
  answer?: string;
};

interface Window {
  jarvis: {
    chat(payload: {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      memories?: string[];
    }): Promise<JarvisChatResult>;
    getSystemInfo(): Promise<JarvisSystemInfo>;
    getConfig(): Promise<JarvisConfig>;
    openExternal(url: string): Promise<JarvisResult>;
    openApp(name: string): Promise<JarvisResult>;
  };
}
