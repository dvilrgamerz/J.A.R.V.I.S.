import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  CirclePower,
  Cpu,
  ExternalLink,
  Gauge,
  Globe2,
  HardDrive,
  MemoryStick,
  Mic,
  MicOff,
  MonitorCog,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  Zap
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

type ModelState = "idle" | "loading" | "ready" | "error";

type WorkerMessage =
  | { type: "progress"; progress: number; status: string; file?: string }
  | { type: "ready"; model: string; backend: string }
  | { type: "result"; id: string; answer: string }
  | { type: "error"; message: string };

const MODEL_NAME = "Qwen2.5 0.5B · 4-bit";

const starterMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "J.A.R.V.I.S. web core online. I use a local browser model with no API key. Activate the AI core once, then chat normally.",
  createdAt: Date.now()
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatStorage(bytes?: number) {
  if (!bytes) return "—";
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function App() {
  const [messages, setMessages] = useState<Message[]>(() =>
    readStored<Message[]>("jarvis.messages", [starterMessage])
  );
  const [memories, setMemories] = useState<string[]>(() =>
    readStored<string[]>("jarvis.memories", [])
  );
  const [input, setInput] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [modelProgress, setModelProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState("AI core not loaded");
  const [backend, setBackend] = useState("—");
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [storageUsage, setStorageUsage] = useState<number | undefined>();
  const workerRef = useRef<Worker | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const hasWebGPU = "gpu" in navigator;
  const cpuThreads = navigator.hardwareConcurrency || 0;
  const deviceMemory = navigator.deviceMemory;

  useEffect(() => {
    const worker = new Worker(new URL("./ai.worker.ts", import.meta.url), {
      type: "module"
    });

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;

      if (data.type === "progress") {
        setModelState("loading");
        setModelProgress(data.progress || 0);
        setModelStatus(data.status || "Loading local AI");
        return;
      }

      if (data.type === "ready") {
        setModelState("ready");
        setModelProgress(1);
        setModelStatus("AI core ready");
        setBackend(data.backend);
        setNotice(`${data.model} loaded with ${data.backend}.`);
        return;
      }

      if (data.type === "result") {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          createdAt: Date.now()
        };
        setMessages((current) => [...current, assistantMessage]);
        setBusy(false);
        speak(data.answer);
        return;
      }

      if (data.type === "error") {
        setBusy(false);
        setModelState((current) => (current === "ready" ? current : "error"));
        setModelStatus("AI core error");
        setNotice(data.message);
      }
    };

    worker.onerror = () => {
      setBusy(false);
      setModelState("error");
      setModelStatus("Worker error");
      setNotice("The local AI worker crashed. Reload the page and try again.");
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("jarvis.messages", JSON.stringify(messages.slice(-80)));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("jarvis.memories", JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((estimate) => {
        setStorageUsage(estimate.usage);
      });
    }

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [modelState]);

  const status = useMemo(() => {
    if (busy) return "THINKING";
    if (modelState === "loading") return "LOADING";
    if (modelState === "ready") return "ONLINE";
    if (modelState === "error") return "ERROR";
    return "STANDBY";
  }, [busy, modelState]);

  function speak(text: string) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function loadModel() {
    if (modelState === "loading") return;
    setModelState("loading");
    setModelProgress(0);
    setModelStatus("Starting local AI download/load…");
    setNotice(
      hasWebGPU
        ? "Loading the 4-bit model with WebGPU. The first load downloads model files; later loads can reuse browser cache."
        : "WebGPU is not available, so J.A.R.V.I.S. will use the slower CPU/WASM fallback."
    );
    workerRef.current?.postMessage({ type: "load" });
  }

  function clearChat() {
    setMessages([starterMessage]);
    setNotice("Conversation cleared.");
  }

  async function handleLocalCommand(text: string): Promise<boolean> {
    const normalized = text.trim().toLowerCase();

    if (normalized === "/clear" || normalized === "/new") {
      clearChat();
      return true;
    }

    if (normalized === "/load" || normalized === "load ai" || normalized === "activate ai") {
      loadModel();
      return true;
    }

    if (normalized === "/youtube" || normalized === "open youtube") {
      openExternal("https://www.youtube.com");
      setNotice("Opened YouTube in a new tab.");
      return true;
    }

    if (normalized === "/github" || normalized === "open github") {
      openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.");
      setNotice("Opened the J.A.R.V.I.S. repository.");
      return true;
    }

    if (normalized.startsWith("/search ")) {
      const query = text.slice(8).trim();
      if (query) {
        openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        setNotice("Opened your web search in a new tab.");
      }
      return true;
    }

    return false;
  }

  async function sendMessage(raw = input) {
    const text = raw.trim();
    if (!text || busy) return;

    setInput("");
    setNotice("");

    if (await handleLocalCommand(text)) return;

    if (modelState !== "ready") {
      setNotice("Activate the local AI core first. No API key is needed.");
      if (modelState === "idle" || modelState === "error") loadModel();
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now()
    };

    const history = [...messages, userMessage]
      .filter((message) => message.id !== "welcome")
      .slice(-14)
      .map(({ role, content }) => ({ role, content }));

    setMessages((current) => [...current, userMessage]);
    setBusy(true);

    workerRef.current?.postMessage({
      type: "generate",
      id: userMessage.id,
      messages: history,
      memories
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function startListening() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setNotice("Speech recognition is not supported in this browser. You can still type.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("Voice recognition stopped. Check your browser microphone permission.");
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput(transcript);
        void sendMessage(transcript);
      }
    };

    recognition.start();
  }

  function saveMemory() {
    const value = memoryDraft.trim();
    if (!value || memories.includes(value)) return;
    setMemories((current) => [...current, value].slice(-20));
    setMemoryDraft("");
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className="side-panel">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div>
            <h1>J.A.R.V.I.S.</h1>
            <p>BROWSER INTELLIGENCE</p>
          </div>
        </div>

        <section className="reactor-card">
          <div className="reactor" aria-hidden="true">
            <div className="reactor-ring ring-one" />
            <div className="reactor-ring ring-two" />
            <div className="reactor-ring ring-three" />
            <div className="reactor-core"><CirclePower size={31} /></div>
          </div>

          <div className="status-line">
            <span className={`status-dot ${modelState === "ready" ? "online" : "warning"}`} />
            <span>{status}</span>
          </div>
          <p className="model-name">{MODEL_NAME} · {backend}</p>
        </section>

        <section className="panel-section">
          <div className="section-title">
            <MonitorCog size={15} />
            <span>BROWSER TELEMETRY</span>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-item">
              <Cpu size={16} />
              <span>THREADS</span>
              <strong>{cpuThreads || "—"}</strong>
            </div>
            <div className="telemetry-item">
              <MemoryStick size={16} />
              <span>MEMORY</span>
              <strong>{deviceMemory ? `${deviceMemory} GB+` : "Browser hidden"}</strong>
            </div>
            <div className="telemetry-item">
              <Gauge size={16} />
              <span>WEBGPU</span>
              <strong>{hasWebGPU ? "Available" : "Fallback"}</strong>
            </div>
            <div className="telemetry-item">
              <HardDrive size={16} />
              <span>CACHE USED</span>
              <strong>{formatStorage(storageUsage)}</strong>
            </div>
          </div>
        </section>

        <section className="panel-section memory-section">
          <div className="section-title">
            <BrainCircuit size={15} />
            <span>LOCAL MEMORY</span>
          </div>

          <div className="memory-list">
            {memories.length === 0 ? (
              <p className="empty-note">No saved memories yet.</p>
            ) : (
              memories.map((memory, index) => (
                <div className="memory-chip" key={`${memory}-${index}`}>
                  <span>{memory}</span>
                  <button
                    aria-label="Remove memory"
                    onClick={() => setMemories((items) => items.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="memory-add">
            <input
              value={memoryDraft}
              onChange={(event) => setMemoryDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveMemory();
              }}
              placeholder="Remember something…"
              maxLength={400}
            />
            <button onClick={saveMemory} aria-label="Save memory">
              <Plus size={16} />
            </button>
          </div>
        </section>

        <div className="security-badge">
          <ShieldCheck size={16} />
          <span>AI runs in your browser · no API key</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="eyebrow">WEB COMMAND INTERFACE</span>
            <h2>J.A.R.V.I.S. is standing by.</h2>
          </div>

          <div className="top-actions">
            <button
              className={`icon-button ${voiceEnabled ? "active" : ""}`}
              onClick={() => setVoiceEnabled((value) => !value)}
              title={voiceEnabled ? "Disable spoken replies" : "Enable spoken replies"}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              className="github-button"
              onClick={() => openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.")}
            >
              Repository <ExternalLink size={15} />
            </button>
          </div>
        </header>

        {modelState !== "ready" && (
          <div className="setup-banner model-loader">
            <div className="model-loader-copy">
              <strong>
                {modelState === "loading"
                  ? "Loading local AI core"
                  : modelState === "error"
                    ? "AI core needs another try"
                    : "No API key required"}
              </strong>
              <span>{modelStatus}</span>

              {modelState === "loading" && (
                <div className="progress-track" aria-label="Model load progress">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.round(modelProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>

            <button
              className="activate-button"
              onClick={loadModel}
              disabled={modelState === "loading"}
            >
              <Zap size={15} />
              {modelState === "loading"
                ? `${Math.round(modelProgress * 100)}%`
                : modelState === "error"
                  ? "Retry"
                  : "Activate AI"}
            </button>
          </div>
        )}

        <section className="quick-actions" aria-label="Quick actions">
          <button onClick={loadModel} disabled={modelState === "loading"}>
            <RefreshCw size={16} /> AI Core
          </button>
          <button onClick={clearChat}>
            <Trash2 size={16} /> Clear Chat
          </button>
          <button onClick={() => openExternal("https://www.youtube.com")}>
            <Globe2 size={16} /> YouTube
          </button>
          <button onClick={() => openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.")}>
            <ExternalLink size={16} /> GitHub
          </button>
          <button disabled>
            <Wifi size={16} /> {online ? "Online" : "Offline"}
          </button>
        </section>

        <section className="chat-card">
          <div className="chat-stream">
            {messages.map((message) => (
              <article className={`message-row ${message.role}`} key={message.id}>
                <div className="message-avatar">
                  {message.role === "assistant" ? <Sparkles size={17} /> : "YOU"}
                </div>

                <div className="message-content">
                  <div className="message-meta">
                    <strong>{message.role === "assistant" ? "J.A.R.V.I.S." : "YOU"}</strong>
                    <span>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p>{message.content}</p>
                </div>
              </article>
            ))}

            {busy && (
              <article className="message-row assistant">
                <div className="message-avatar"><Sparkles size={17} /></div>
                <div className="message-content">
                  <div className="message-meta">
                    <strong>J.A.R.V.I.S.</strong>
                    <span>local inference</span>
                  </div>
                  <div className="thinking"><i /><i /><i /></div>
                </div>
              </article>
            )}

            <div ref={endRef} />
          </div>

          <div className="composer-zone">
            {notice && <div className="notice">{notice}</div>}

            <form className="composer" onSubmit={submit}>
              <button
                type="button"
                className={`mic-button ${listening ? "listening" : ""}`}
                onClick={listening ? undefined : startListening}
                aria-label="Use microphone"
              >
                {listening ? <MicOff size={19} /> : <Mic size={19} />}
              </button>

              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={
                  listening
                    ? "Listening…"
                    : modelState === "ready"
                      ? "Ask J.A.R.V.I.S. anything…"
                      : "Activate the AI core, then start chatting…"
                }
                rows={1}
                maxLength={5000}
              />

              <button
                className="send-button"
                type="submit"
                disabled={busy || !input.trim()}
              >
                <Send size={18} />
              </button>
            </form>

            <p className="composer-hint">
              No AI API key. Model inference runs locally in the browser. /clear · /load · /youtube · /github · /search query
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
