import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  CirclePower,
  Copy,
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
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  WandSparkles,
  Wifi,
  Zap
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  streaming?: boolean;
};

type ModelState = "idle" | "loading" | "ready" | "error";
type PerformanceMode = "turbo" | "balanced" | "smart";
type PerformancePreference = "auto" | PerformanceMode;

type WorkerMessage =
  | { type: "progress"; progress: number; status: string; file?: string }
  | { type: "ready"; model: string; backend: string }
  | { type: "token"; id: string; text: string; firstChunkMs?: number }
  | {
      type: "result";
      id: string;
      answer: string;
      totalMs?: number;
      firstChunkMs?: number;
      mode?: PerformanceMode;
      memoriesUsed?: number;
    }
  | { type: "error"; message: string };

const MODEL_NAME = "Qwen2.5 0.5B · Q4";

const starterMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "J.A.R.V.I.S. V2 online. I run locally in your browser with no AI API key. Auto mode can tune response speed to your device.",
  createdAt: Date.now()
};

const MODE_INFO: Record<
  PerformancePreference,
  { label: string; detail: string; icon: typeof Rocket }
> = {
  auto: {
    label: "Auto",
    detail: "Device tuned",
    icon: WandSparkles
  },
  turbo: {
    label: "Turbo",
    detail: "Fastest",
    icon: Rocket
  },
  balanced: {
    label: "Balanced",
    detail: "Everyday",
    icon: Gauge
  },
  smart: {
    label: "Smart",
    detail: "Deeper",
    icon: BrainCircuit
  }
};

const QUICK_PROMPTS = [
  "Explain something hard simply",
  "Help me plan a project",
  "Give me 5 creative ideas",
  "Help me debug code"
];

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readMode(): PerformancePreference {
  const stored = readStored<string>("jarvis.mode.v2", "auto");
  return stored === "turbo" || stored === "balanced" || stored === "smart" || stored === "auto"
    ? stored
    : "auto";
}

function formatStorage(bytes?: number) {
  if (!bytes) return "—";
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

function formatLatency(ms?: number) {
  if (!ms) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function resolveDeviceMode(
  preference: PerformancePreference,
  hasWebGPU: boolean,
  cpuThreads: number,
  deviceMemory?: number
): PerformanceMode {
  if (preference !== "auto") return preference;

  if (!hasWebGPU) return "turbo";
  if ((deviceMemory ?? 0) >= 8 && cpuThreads >= 8) return "smart";
  if ((deviceMemory ?? 0) >= 4 && cpuThreads >= 6) return "balanced";
  return "turbo";
}

function deviceTier(hasWebGPU: boolean, cpuThreads: number, deviceMemory?: number) {
  if (hasWebGPU && (deviceMemory ?? 0) >= 8 && cpuThreads >= 8) return "PERFORMANCE";
  if (hasWebGPU && cpuThreads >= 4) return "STANDARD";
  return "LIGHT";
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
  const [performancePreference, setPerformancePreference] =
    useState<PerformancePreference>(readMode);
  const [autoBoot, setAutoBoot] = useState<boolean>(() =>
    readStored<boolean>("jarvis.autoboot", "gpu" in navigator)
  );
  const [firstChunkMs, setFirstChunkMs] = useState<number | undefined>();
  const [totalMs, setTotalMs] = useState<number | undefined>();
  const [memoriesUsed, setMemoriesUsed] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const bootedRef = useRef(false);

  const hasWebGPU = "gpu" in navigator;
  const cpuThreads = navigator.hardwareConcurrency || 0;
  const deviceMemory = navigator.deviceMemory;
  const resolvedMode = useMemo(
    () =>
      resolveDeviceMode(
        performancePreference,
        hasWebGPU,
        cpuThreads,
        deviceMemory
      ),
    [performancePreference, hasWebGPU, cpuThreads, deviceMemory]
  );
  const tier = useMemo(
    () => deviceTier(hasWebGPU, cpuThreads, deviceMemory),
    [hasWebGPU, cpuThreads, deviceMemory]
  );

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
        setNotice(`Local core ready on ${data.backend}. ${resolvedMode.toUpperCase()} mode selected.`);
        return;
      }

      if (data.type === "token") {
        if (data.firstChunkMs) setFirstChunkMs(data.firstChunkMs);
        const responseId = `assistant-${data.id}`;

        setMessages((current) =>
          current.map((message) =>
            message.id === responseId
              ? {
                  ...message,
                  content: message.content + data.text,
                  streaming: true
                }
              : message
          )
        );
        return;
      }

      if (data.type === "result") {
        const responseId = `assistant-${data.id}`;

        setMessages((current) =>
          current.map((message) =>
            message.id === responseId
              ? {
                  ...message,
                  content: data.answer,
                  streaming: false
                }
              : message
          )
        );

        setFirstChunkMs(data.firstChunkMs || undefined);
        setTotalMs(data.totalMs || undefined);
        setMemoriesUsed(data.memoriesUsed || 0);
        setBusy(false);
        speak(data.answer);
        return;
      }

      if (data.type === "error") {
        setBusy(false);
        setModelState((current) => (current === "ready" ? current : "error"));
        setModelStatus("AI core error");
        setNotice(data.message);
        setMessages((current) =>
          current.filter((message) => !message.streaming || message.content.trim())
        );
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
  }, [resolvedMode]);

  useEffect(() => {
    if (!autoBoot || bootedRef.current || !workerRef.current) return;

    bootedRef.current = true;
    const timer = window.setTimeout(() => {
      loadModel();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [autoBoot]);

  useEffect(() => {
    if (modelState !== "ready" || !queuedPrompt || busy) return;

    const prompt = queuedPrompt;
    setQueuedPrompt(null);
    void sendMessage(prompt);
  }, [modelState, queuedPrompt, busy]);

  useEffect(() => {
    localStorage.setItem(
      "jarvis.messages",
      JSON.stringify(messages.filter((message) => !message.streaming).slice(-80))
    );
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("jarvis.memories", JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem("jarvis.mode.v2", JSON.stringify(performancePreference));
  }, [performancePreference]);

  useEffect(() => {
    localStorage.setItem("jarvis.autoboot", JSON.stringify(autoBoot));
  }, [autoBoot]);

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
    if (busy) return "GENERATING";
    if (modelState === "loading") return "BOOTING";
    if (modelState === "ready") return "ONLINE";
    if (modelState === "error") return "ERROR";
    return "STANDBY";
  }, [busy, modelState]);

  function speak(text: string) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.04;
    utterance.pitch = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  function loadModel() {
    if (modelState === "loading" || modelState === "ready") return;

    setModelState("loading");
    setModelProgress(0);
    setModelStatus("Initializing V2 neural core…");
    setNotice(
      hasWebGPU
        ? `WebGPU detected · device tier ${tier}. Loading accelerated local AI.`
        : "WebGPU unavailable. V2 will use its lighter CPU/WASM path."
    );

    workerRef.current?.postMessage({ type: "load" });
  }

  function clearChat() {
    setMessages([starterMessage]);
    setNotice("New session started.");
    setFirstChunkMs(undefined);
    setTotalMs(undefined);
    setMemoriesUsed(0);
  }

  function clearMemories() {
    setMemories([]);
    setNotice("Local memories cleared.");
  }

  async function copyMessage(message: Message) {
    if (!message.content.trim()) return;

    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(null), 1300);
    } catch {
      setNotice("Clipboard access was blocked by the browser.");
    }
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
        setNotice("Opened your browser search.");
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
      setQueuedPrompt(text);
      setNotice("Command queued. J.A.R.V.I.S. will answer as soon as the local core finishes booting.");

      if (modelState === "idle" || modelState === "error") {
        loadModel();
      }

      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now()
    };

    const assistantMessage: Message = {
      id: `assistant-${userMessage.id}`,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true
    };

    const history = [...messages, userMessage]
      .filter((message) => message.id !== "welcome" && !message.streaming)
      .slice(-14)
      .map(({ role, content }) => ({ role, content }));

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setBusy(true);
    setFirstChunkMs(undefined);
    setTotalMs(undefined);

    workerRef.current?.postMessage({
      type: "generate",
      id: userMessage.id,
      messages: history,
      memories,
      mode: resolvedMode
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
      setNotice("Voice recognition stopped. Check browser microphone permission.");
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

    setMemories((current) => [...current, value].slice(-24));
    setMemoryDraft("");
  }

  const ModeIcon = MODE_INFO[performancePreference].icon;

  return (
    <div className={`app-shell v2-shell ${busy ? "is-thinking" : ""}`}>
      <div className="scanlines" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <aside className="side-panel">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div>
            <h1>J.A.R.V.I.S.</h1>
            <p>NEURAL WEB INTERFACE · V2</p>
          </div>
        </div>

        <section className="reactor-card">
          <div className="reactor-shell">
            <div className="reactor" aria-hidden="true">
              <div className="reactor-ring ring-one" />
              <div className="reactor-ring ring-two" />
              <div className="reactor-ring ring-three" />
              <div className="reactor-ticks" />
              <div className="reactor-core"><CirclePower size={31} /></div>
            </div>
            <div className="reactor-orbit orbit-a" />
            <div className="reactor-orbit orbit-b" />
          </div>

          <div className="status-line">
            <span className={`status-dot ${modelState === "ready" ? "online" : "warning"}`} />
            <span>{status}</span>
          </div>

          <p className="model-name">{MODEL_NAME} · {backend}</p>

          <div className="core-meter">
            <span>CORE</span>
            <div>
              <i
                style={{
                  width:
                    modelState === "ready"
                      ? "100%"
                      : `${Math.round(modelProgress * 100)}%`
                }}
              />
            </div>
            <strong>
              {modelState === "ready" ? "100" : Math.round(modelProgress * 100)}%
            </strong>
          </div>
        </section>

        <section className="panel-section">
          <div className="section-title">
            <MonitorCog size={15} />
            <span>DEVICE PROFILE</span>
          </div>

          <div className="device-tier-card">
            <span>{tier}</span>
            <strong>{resolvedMode.toUpperCase()}</strong>
            <small>AUTO TUNING</small>
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
              <strong>{deviceMemory ? `${deviceMemory} GB+` : "Hidden"}</strong>
            </div>
            <div className="telemetry-item">
              <Gauge size={16} />
              <span>ACCELERATOR</span>
              <strong>{hasWebGPU ? "WebGPU" : "WASM"}</strong>
            </div>
            <div className="telemetry-item">
              <HardDrive size={16} />
              <span>CACHE</span>
              <strong>{formatStorage(storageUsage)}</strong>
            </div>
          </div>

          <div className="latency-row">
            <div>
              <span>FIRST TEXT</span>
              <strong>{formatLatency(firstChunkMs)}</strong>
            </div>
            <div>
              <span>TOTAL</span>
              <strong>{formatLatency(totalMs)}</strong>
            </div>
          </div>
        </section>

        <section className="panel-section memory-section">
          <div className="section-title memory-title-row">
            <div>
              <BrainCircuit size={15} />
              <span>SMART MEMORY</span>
            </div>
            {memories.length > 0 && (
              <button onClick={clearMemories}>CLEAR</button>
            )}
          </div>

          <div className="memory-stat">
            <strong>{memories.length}</strong>
            <span>SAVED</span>
            <strong>{memoriesUsed}</strong>
            <span>USED LAST REPLY</span>
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
                    onClick={() =>
                      setMemories((items) => items.filter((_, i) => i !== index))
                    }
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
              maxLength={320}
            />
            <button onClick={saveMemory} aria-label="Save memory">
              <Plus size={16} />
            </button>
          </div>
        </section>

        <div className="security-badge">
          <ShieldCheck size={16} />
          <span>Private local inference · zero AI keys</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="hero-copy">
            <span className="eyebrow">ADAPTIVE LOCAL INTELLIGENCE</span>
            <h2>
              J.A.R.V.I.S. <em>V2</em>
            </h2>
            <p>Device-aware. Streaming. Private.</p>
          </div>

          <div className="top-actions">
            <div className="live-pill">
              <span className={online ? "live-dot" : "live-dot offline"} />
              {online ? "NETWORK" : "OFFLINE"}
            </div>

            <button
              className={`icon-button ${voiceEnabled ? "active" : ""}`}
              onClick={() => setVoiceEnabled((value) => !value)}
              title={voiceEnabled ? "Disable spoken replies" : "Enable spoken replies"}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              className="github-button"
              onClick={() =>
                openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.")
              }
            >
              Repository <ExternalLink size={15} />
            </button>
          </div>
        </header>

        <section className="command-deck">
          <div className="mode-cluster">
            <div className="mode-heading">
              <ModeIcon size={15} />
              <span>INTELLIGENCE MODE</span>
            </div>

            <div className="mode-selector v2-mode-selector">
              {(Object.keys(MODE_INFO) as PerformancePreference[]).map((mode) => {
                const item = MODE_INFO[mode];
                const Icon = item.icon;

                return (
                  <button
                    key={mode}
                    className={performancePreference === mode ? "selected" : ""}
                    onClick={() => setPerformancePreference(mode)}
                    disabled={busy}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                    <small>{item.detail}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="autoboot-toggle">
            <input
              type="checkbox"
              checked={autoBoot}
              onChange={(event) => setAutoBoot(event.target.checked)}
            />
            <span className="toggle-track"><i /></span>
            <span>
              Auto Boot
              <small>load core on launch</small>
            </span>
          </label>
        </section>

        {modelState !== "ready" && (
          <div className="setup-banner model-loader">
            <div className="model-loader-copy">
              <strong>
                {modelState === "loading"
                  ? "V2 neural core boot sequence"
                  : modelState === "error"
                    ? "Core restart required"
                    : "J.A.R.V.I.S. V2 is in standby"}
              </strong>
              <span>{modelStatus}</span>

              {queuedPrompt && (
                <span className="queued-command">
                  QUEUED · {queuedPrompt.slice(0, 72)}
                </span>
              )}

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
                  ? "Restart Core"
                  : "Initialize"}
            </button>
          </div>
        )}

        <section className="quick-prompt-deck" aria-label="Quick prompts">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              disabled={busy}
            >
              <Sparkles size={14} />
              {prompt}
            </button>
          ))}
        </section>

        <section className="quick-actions" aria-label="Quick actions">
          <button
            onClick={loadModel}
            disabled={modelState === "loading" || modelState === "ready"}
          >
            <RefreshCw size={16} /> Core
          </button>
          <button onClick={clearChat}>
            <Trash2 size={16} /> New Session
          </button>
          <button onClick={() => openExternal("https://www.google.com")}>
            <Search size={16} /> Search
          </button>
          <button onClick={() => openExternal("https://www.youtube.com")}>
            <Globe2 size={16} /> YouTube
          </button>
          <button
            onClick={() =>
              openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.")
            }
          >
            <ExternalLink size={16} /> GitHub
          </button>
        </section>

        <section className="chat-card">
          <div className="chat-glow" />

          <div className="chat-stream">
            {messages.map((message) => (
              <article
                className={`message-row ${message.role} ${message.streaming ? "streaming" : ""}`}
                key={message.id}
              >
                <div className="message-avatar">
                  {message.role === "assistant" ? <Sparkles size={17} /> : "YOU"}
                </div>

                <div className="message-content">
                  <div className="message-meta">
                    <strong>
                      {message.role === "assistant" ? "J.A.R.V.I.S." : "YOU"}
                    </strong>

                    {message.streaming ? (
                      <span className="stream-badge">LIVE</span>
                    ) : (
                      <span>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    )}

                    {message.role === "assistant" &&
                      message.id !== "welcome" &&
                      !message.streaming && (
                        <button
                          className="message-copy"
                          onClick={() => void copyMessage(message)}
                          title="Copy response"
                        >
                          {copiedMessageId === message.id ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                  </div>

                  <p>
                    {message.content}
                    {message.streaming && <span className="cursor-block" />}
                  </p>
                </div>
              </article>
            ))}

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
                      ? `Command J.A.R.V.I.S. · ${resolvedMode.toUpperCase()} core`
                      : "Type now — V2 can queue your command while the core boots…"
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

            <div className="composer-footer">
              <span>LOCAL AI</span>
              <i />
              <span>{backend}</span>
              <i />
              <span>{resolvedMode.toUpperCase()}</span>
              <i />
              <span>{tier}</span>
              <i />
              <span>NO API KEY</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
