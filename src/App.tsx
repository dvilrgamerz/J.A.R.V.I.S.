import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  BookOpen,
  BrainCircuit,
  Check,
  CirclePower,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Globe2,
  HardDrive,
  Heart,
  Install,
  MemoryStick,
  Mic,
  MicOff,
  MonitorCog,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Upload,
  UserRound,
  Volume2,
  VolumeX,
  WandSparkles,
  Wifi,
  X,
  Zap
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  streaming?: boolean;
  stopped?: boolean;
};

type Session = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

type LocalFile = {
  id: string;
  name: string;
  text: string;
  size: number;
  type: string;
};

type ModelState = "idle" | "loading" | "ready" | "error";
type ModelKey = "lite" | "standard" | "power";
type ModelPreference = "auto" | ModelKey;
type PerformanceMode = "turbo" | "balanced" | "smart";
type PerformancePreference = "auto" | PerformanceMode;
type Personality = "standard" | "buddy" | "programmer" | "study";

type WorkerMessage =
  | {
      type: "progress";
      progress: number;
      status: string;
      file?: string;
      modelKey?: ModelKey;
      modelLabel?: string;
    }
  | {
      type: "ready";
      modelKey: ModelKey;
      model: string;
      label: string;
      size: string;
      backend: string;
    }
  | { type: "token"; id: string; text: string; firstChunkMs?: number }
  | {
      type: "result";
      id: string;
      answer: string;
      totalMs?: number;
      firstChunkMs?: number;
      mode?: PerformanceMode;
      modelKey?: ModelKey;
      memoriesUsed?: number;
      fileChunksUsed?: number;
      stopped?: boolean;
    }
  | { type: "stopping"; id?: string }
  | { type: "error"; message: string };

const MODEL_INFO: Record<
  ModelPreference,
  { label: string; detail: string; estimate: string; icon: typeof Rocket }
> = {
  auto: {
    label: "Auto",
    detail: "Device tuned",
    estimate: "Adaptive",
    icon: WandSparkles
  },
  lite: {
    label: "Lite",
    detail: "SmolLM2 360M",
    estimate: "~386 MB Q4",
    icon: Rocket
  },
  standard: {
    label: "Standard",
    detail: "Qwen2.5 0.5B",
    estimate: "Balanced",
    icon: Gauge
  },
  power: {
    label: "Power",
    detail: "Qwen2.5 1.5B",
    estimate: "~1.79 GB Q4",
    icon: BrainCircuit
  }
};

const MODE_INFO: Record<
  PerformancePreference,
  { label: string; detail: string; icon: typeof Rocket }
> = {
  auto: { label: "Auto", detail: "Adaptive", icon: WandSparkles },
  turbo: { label: "Turbo", detail: "Fastest", icon: Rocket },
  balanced: { label: "Balanced", detail: "Daily", icon: Gauge },
  smart: { label: "Smart", detail: "Deeper", icon: BrainCircuit }
};

const PERSONALITY_INFO: Record<
  Personality,
  { label: string; detail: string; icon: typeof UserRound }
> = {
  standard: {
    label: "Standard",
    detail: "Calm + concise",
    icon: UserRound
  },
  buddy: {
    label: "Buddy",
    detail: "Friendly",
    icon: Heart
  },
  programmer: {
    label: "Programmer",
    detail: "Technical",
    icon: Code2
  },
  study: {
    label: "Study",
    detail: "Teacher mode",
    icon: BookOpen
  }
};

const QUICK_PROMPTS = [
  "Explain something difficult simply",
  "Help me plan a project",
  "Debug this problem with me",
  "Give me five creative ideas"
];

const starterMessage: Message = {
  id: "welcome-v3",
  role: "assistant",
  content:
    "J.A.R.V.I.S. V3 online. Choose Auto and I’ll tune the local model to this device, or select Lite, Standard, or Power yourself.",
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

function newSession(messages: Message[] = [starterMessage]): Session {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New Session",
    createdAt: now,
    updatedAt: now,
    messages
  };
}

function initialSessions(): Session[] {
  const stored = readStored<Session[]>("jarvis.sessions.v3", []);
  if (stored.length) return stored;

  const legacyMessages = readStored<Message[]>("jarvis.messages", [starterMessage]);
  return [newSession(legacyMessages.length ? legacyMessages : [starterMessage])];
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

function resolveModel(
  preference: ModelPreference,
  hasWebGPU: boolean,
  cpuThreads: number,
  deviceMemory?: number
): ModelKey {
  if (preference !== "auto") return preference;
  if (!hasWebGPU) return "lite";
  if ((deviceMemory ?? 0) >= 8 && cpuThreads >= 8) return "power";
  return "standard";
}

function resolveMode(
  preference: PerformancePreference,
  modelKey: ModelKey,
  hasWebGPU: boolean
): PerformanceMode {
  if (preference !== "auto") return preference;
  if (!hasWebGPU || modelKey === "lite") return "turbo";
  if (modelKey === "power") return "smart";
  return "balanced";
}

function deviceTier(hasWebGPU: boolean, cpuThreads: number, deviceMemory?: number) {
  if (hasWebGPU && (deviceMemory ?? 0) >= 8 && cpuThreads >= 8) {
    return "PERFORMANCE";
  }
  if (hasWebGPU && cpuThreads >= 4) return "STANDARD";
  return "LIGHT";
}

function safeCalculate(expression: string) {
  const clean = expression.trim();

  if (!clean || clean.length > 90 || !/^[0-9+\-*/%().\s]+$/.test(clean)) {
    throw new Error("Use only numbers, parentheses, +, -, *, /, and %.");
  }

  const value = Function(`"use strict"; return (${clean});`)();

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("That calculation did not produce a finite number.");
  }

  return value;
}

function convertUnit(value: number, from: string, to: string) {
  const source = from.toLowerCase();
  const target = to.toLowerCase();

  if (source === target) return value;

  const pairs: Record<string, (numberValue: number) => number> = {
    "km:mi": (numberValue) => numberValue * 0.621371,
    "mi:km": (numberValue) => numberValue / 0.621371,
    "kg:lb": (numberValue) => numberValue * 2.2046226218,
    "lb:kg": (numberValue) => numberValue / 2.2046226218,
    "c:f": (numberValue) => (numberValue * 9) / 5 + 32,
    "f:c": (numberValue) => ((numberValue - 32) * 5) / 9
  };

  const converter = pairs[`${source}:${target}`];

  if (!converter) {
    throw new Error("Supported conversions: km↔mi, kg↔lb, C↔F.");
  }

  return converter(value);
}

function App() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const storedId = readStored<string>("jarvis.activeSession.v3", "");
    const first = initialSessions()[0];
    return storedId || first.id;
  });
  const [memories, setMemories] = useState<string[]>(() =>
    readStored<string[]>("jarvis.memories", [])
  );
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [input, setInput] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceConversation, setVoiceConversation] = useState(false);
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [modelProgress, setModelProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState("AI core not loaded");
  const [backend, setBackend] = useState("—");
  const [loadedModelKey, setLoadedModelKey] = useState<ModelKey | null>(null);
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [storageUsage, setStorageUsage] = useState<number | undefined>();
  const [modelPreference, setModelPreference] = useState<ModelPreference>(() =>
    readStored<ModelPreference>("jarvis.model.v3", "auto")
  );
  const [performancePreference, setPerformancePreference] =
    useState<PerformancePreference>(() =>
      readStored<PerformancePreference>("jarvis.mode.v3", "auto")
    );
  const [personality, setPersonality] = useState<Personality>(() =>
    readStored<Personality>("jarvis.personality.v3", "standard")
  );
  const [autoBoot, setAutoBoot] = useState<boolean>(() =>
    readStored<boolean>("jarvis.autoboot", "gpu" in navigator)
  );
  const [firstChunkMs, setFirstChunkMs] = useState<number | undefined>();
  const [totalMs, setTotalMs] = useState<number | undefined>();
  const [memoriesUsed, setMemoriesUsed] = useState(0);
  const [fileChunksUsed, setFileChunksUsed] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [queuedPrompt, setQueuedPrompt] = useState<{
    text: string;
    sessionId: string;
  } | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const workerRef = useRef<Worker | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const bootedRef = useRef(false);
  const pendingSessionsRef = useRef<Record<string, string>>({});

  const hasWebGPU = "gpu" in navigator;
  const cpuThreads = navigator.hardwareConcurrency || 0;
  const deviceMemory = navigator.deviceMemory;

  const resolvedModel = useMemo(
    () => resolveModel(modelPreference, hasWebGPU, cpuThreads, deviceMemory),
    [modelPreference, hasWebGPU, cpuThreads, deviceMemory]
  );

  const resolvedMode = useMemo(
    () => resolveMode(performancePreference, resolvedModel, hasWebGPU),
    [performancePreference, resolvedModel, hasWebGPU]
  );

  const tier = useMemo(
    () => deviceTier(hasWebGPU, cpuThreads, deviceMemory),
    [hasWebGPU, cpuThreads, deviceMemory]
  );

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  function updateSessionMessages(
    sessionId: string,
    updater: (current: Message[]) => Message[]
  ) {
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) return session;

        const nextMessages = updater(session.messages);
        const firstUser = nextMessages.find((message) => message.role === "user");

        return {
          ...session,
          title:
            session.title === "New Session" && firstUser
              ? firstUser.content.slice(0, 34)
              : session.title,
          updatedAt: Date.now(),
          messages: nextMessages
        };
      })
    );
  }

  function addLocalAssistant(sessionId: string, content: string) {
    const message: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      createdAt: Date.now()
    };
    updateSessionMessages(sessionId, (current) => [...current, message]);
  }

  useEffect(() => {
    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0]?.id || "");
    }
  }, [sessions, activeSessionId]);

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
        setModelStatus(`${data.label} ready`);
        setBackend(data.backend);
        setLoadedModelKey(data.modelKey);
        setNotice(`${data.label} loaded on ${data.backend} · ${data.size}.`);
        return;
      }

      if (data.type === "token") {
        if (data.firstChunkMs) setFirstChunkMs(data.firstChunkMs);
        const sessionId = pendingSessionsRef.current[data.id];

        if (!sessionId) return;

        const responseId = `assistant-${data.id}`;
        updateSessionMessages(sessionId, (current) =>
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

      if (data.type === "stopping") {
        setStopping(true);
        setNotice("Stopping generation…");
        return;
      }

      if (data.type === "result") {
        const sessionId = pendingSessionsRef.current[data.id];
        delete pendingSessionsRef.current[data.id];

        if (sessionId) {
          const responseId = `assistant-${data.id}`;

          updateSessionMessages(sessionId, (current) =>
            current.map((message) =>
              message.id === responseId
                ? {
                    ...message,
                    content: data.answer,
                    streaming: false,
                    stopped: Boolean(data.stopped)
                  }
                : message
            )
          );
        }

        setFirstChunkMs(data.firstChunkMs || undefined);
        setTotalMs(data.totalMs || undefined);
        setMemoriesUsed(data.memoriesUsed || 0);
        setFileChunksUsed(data.fileChunksUsed || 0);
        setBusy(false);
        setStopping(false);

        if (!data.stopped) {
          speak(data.answer);
        } else {
          setNotice("Generation stopped.");
        }

        return;
      }

      if (data.type === "error") {
        setBusy(false);
        setStopping(false);
        setModelState((current) => (current === "ready" ? current : "error"));
        setModelStatus("AI core error");
        setNotice(data.message);
      }
    };

    worker.onerror = () => {
      setBusy(false);
      setStopping(false);
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
    localStorage.setItem("jarvis.sessions.v3", JSON.stringify(sessions.slice(0, 30)));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("jarvis.activeSession.v3", JSON.stringify(activeSessionId));
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem("jarvis.memories", JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem("jarvis.model.v3", JSON.stringify(modelPreference));
  }, [modelPreference]);

  useEffect(() => {
    localStorage.setItem("jarvis.mode.v3", JSON.stringify(performancePreference));
  }, [performancePreference]);

  useEffect(() => {
    localStorage.setItem("jarvis.personality.v3", JSON.stringify(personality));
  }, [personality]);

  useEffect(() => {
    localStorage.setItem("jarvis.autoboot", JSON.stringify(autoBoot));
  }, [autoBoot]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!autoBoot || bootedRef.current || !workerRef.current) return;

    bootedRef.current = true;
    const timerId = window.setTimeout(() => loadModel(resolvedModel), 450);
    return () => window.clearTimeout(timerId);
  }, [autoBoot, resolvedModel]);

  useEffect(() => {
    if (!queuedPrompt || modelState !== "ready" || loadedModelKey !== resolvedModel || busy) {
      return;
    }

    const queued = queuedPrompt;
    setQueuedPrompt(null);

    const session = sessions.find((item) => item.id === queued.sessionId);
    if (session) {
      void runModelPrompt(queued.text, queued.sessionId, session.messages);
    }
  }, [queuedPrompt, modelState, loadedModelKey, resolvedModel, busy, sessions]);

  useEffect(() => {
    if (!loadedModelKey || loadedModelKey === resolvedModel || busy) return;
    loadModel(resolvedModel, true);
  }, [resolvedModel, loadedModelKey, busy]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("beforeinstallprompt", beforeInstall as EventListener);

    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((estimate) => {
        setStorageUsage(estimate.usage);
      });
    }

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstall as EventListener);
    };
  }, [modelState]);

  const status = useMemo(() => {
    if (stopping) return "STOPPING";
    if (busy) return "GENERATING";
    if (modelState === "loading") return "BOOTING";
    if (modelState === "ready") return "ONLINE";
    if (modelState === "error") return "ERROR";
    return "STANDBY";
  }, [busy, stopping, modelState]);

  function speak(text: string) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.04;
    utterance.pitch = 0.88;

    if (voiceConversation) {
      utterance.onend = () => {
        window.setTimeout(() => startListening(), 350);
      };
    }

    window.speechSynthesis.speak(utterance);
  }

  function loadModel(target: ModelKey = resolvedModel, force = false) {
    if (!workerRef.current) return;
    if (!force && modelState === "loading") return;
    if (!force && modelState === "ready" && loadedModelKey === target) return;

    setModelState("loading");
    setModelProgress(0);
    setModelStatus(`Loading ${MODEL_INFO[target].label} neural core…`);
    setNotice(
      target === "power"
        ? "Power model selected. This is a much larger local download and uses substantially more memory."
        : `Loading ${MODEL_INFO[target].label} locally. No AI API key is required.`
    );

    workerRef.current.postMessage({ type: "load", modelKey: target });
  }

  function switchModel(preference: ModelPreference) {
    if (busy) return;

    setModelPreference(preference);
    const target = resolveModel(preference, hasWebGPU, cpuThreads, deviceMemory);

    if (loadedModelKey !== target) {
      loadModel(target, true);
    }
  }

  function createSession() {
    const session = newSession();
    setSessions((current) => [session, ...current].slice(0, 30));
    setActiveSessionId(session.id);
    setInput("");
    setEditingMessageId(null);
  }

  function deleteActiveSession() {
    setSessions((current) => {
      const remaining = current.filter((session) => session.id !== activeSessionId);

      if (remaining.length) {
        setActiveSessionId(remaining[0].id);
        return remaining;
      }

      const replacement = newSession();
      setActiveSessionId(replacement.id);
      return [replacement];
    });
  }

  function clearActiveChat() {
    updateSessionMessages(activeSessionId, () => [starterMessage]);
    setNotice("Session cleared.");
    setFirstChunkMs(undefined);
    setTotalMs(undefined);
    setMemoriesUsed(0);
    setFileChunksUsed(0);
  }

  async function copyMessage(message: Message) {
    if (!message.content.trim()) return;

    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(null), 1200);
    } catch {
      setNotice("Clipboard access was blocked by the browser.");
    }
  }

  function editMessage(message: Message) {
    if (message.role !== "user") return;
    setInput(message.content);
    setEditingMessageId(message.id);
    setNotice("Editing message. Send to replace this point in the conversation.");
  }

  function regenerate(messageId: string) {
    if (busy) return;

    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;

    let userIndex = index - 1;
    while (userIndex >= 0 && messages[userIndex].role !== "user") {
      userIndex -= 1;
    }

    if (userIndex < 0) return;

    const prompt = messages[userIndex].content;
    const baseMessages = messages.slice(0, userIndex);
    void runModelPrompt(prompt, activeSessionId, baseMessages);
  }

  function stopGeneration() {
    if (!busy || !workerRef.current) return;
    setStopping(true);
    workerRef.current.postMessage({ type: "stop" });
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);

    if (!selected.length) return;

    const acceptedExtensions = [
      ".txt",
      ".md",
      ".json",
      ".csv",
      ".js",
      ".ts",
      ".tsx",
      ".jsx",
      ".py",
      ".html",
      ".css",
      ".xml",
      ".yaml",
      ".yml"
    ];

    const room = Math.max(0, 5 - files.length);
    const nextFiles: LocalFile[] = [];

    for (const file of selected.slice(0, room)) {
      const lower = file.name.toLowerCase();
      const accepted = acceptedExtensions.some((extension) => lower.endsWith(extension));

      if (!accepted) {
        setNotice(`${file.name} is not a supported text/code file.`);
        continue;
      }

      if (file.size > 300_000) {
        setNotice(`${file.name} is over the 300 KB V3 file limit.`);
        continue;
      }

      const text = await file.text();

      nextFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        text,
        size: file.size,
        type: file.type || "text/plain"
      });
    }

    setFiles((current) => [...current, ...nextFiles].slice(0, 5));
    if (nextFiles.length) {
      setNotice(`${nextFiles.length} local file${nextFiles.length === 1 ? "" : "s"} attached. V3 will retrieve relevant excerpts only.`);
    }

    event.target.value = "";
  }

  async function handleLocalCommand(text: string, sessionId: string) {
    const normalized = text.trim().toLowerCase();

    if (normalized === "/clear" || normalized === "/new") {
      clearActiveChat();
      return true;
    }

    if (normalized === "/load" || normalized === "load ai") {
      loadModel();
      return true;
    }

    if (normalized.startsWith("/calc ")) {
      try {
        const expression = text.slice(6);
        const value = safeCalculate(expression);
        addLocalAssistant(sessionId, `${expression.trim()} = ${value}`);
      } catch (error) {
        addLocalAssistant(
          sessionId,
          error instanceof Error ? error.message : "Calculation failed."
        );
      }
      return true;
    }

    if (normalized.startsWith("/convert ")) {
      const match = text
        .slice(9)
        .trim()
        .match(/^(-?\d+(?:\.\d+)?)\s*(km|mi|kg|lb|c|f)\s+(?:to\s+)?(km|mi|kg|lb|c|f)$/i);

      if (!match) {
        addLocalAssistant(
          sessionId,
          "Use /convert like: /convert 5 km to mi, /convert 10 kg to lb, or /convert 30 c to f."
        );
        return true;
      }

      try {
        const value = Number(match[1]);
        const result = convertUnit(value, match[2], match[3]);
        addLocalAssistant(
          sessionId,
          `${value} ${match[2]} = ${Number(result.toFixed(4))} ${match[3]}`
        );
      } catch (error) {
        addLocalAssistant(
          sessionId,
          error instanceof Error ? error.message : "Conversion failed."
        );
      }

      return true;
    }

    if (normalized.startsWith("/timer ")) {
      const match = text
        .slice(7)
        .trim()
        .match(/^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h)$/i);

      if (!match) {
        addLocalAssistant(sessionId, "Use /timer like: /timer 30s, /timer 5m, or /timer 1h.");
        return true;
      }

      const amount = Number(match[1]);
      const unit = match[2].toLowerCase();
      const seconds =
        unit.startsWith("h") ? amount * 3600 : unit.startsWith("m") ? amount * 60 : amount;

      if (seconds <= 0 || seconds > 86_400) {
        addLocalAssistant(sessionId, "V3 timers must be between 1 second and 24 hours.");
        return true;
      }

      addLocalAssistant(sessionId, `Timer started for ${amount}${match[2]}.`);

      window.setTimeout(() => {
        addLocalAssistant(sessionId, `Timer finished: ${amount}${match[2]}.`);
      }, seconds * 1000);

      return true;
    }

    if (normalized.startsWith("/note ")) {
      const note = text.slice(6).trim();

      if (note) {
        setMemories((current) => [...current, note].slice(-40));
        addLocalAssistant(sessionId, "Saved to local memory.");
      }

      return true;
    }

    if (normalized === "/youtube" || normalized === "open youtube") {
      openExternal("https://www.youtube.com");
      setNotice("Opened YouTube.");
      return true;
    }

    if (normalized === "/github" || normalized === "open github") {
      openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.");
      setNotice("Opened the repository.");
      return true;
    }

    if (normalized.startsWith("/search ")) {
      const query = text.slice(8).trim();

      if (query) {
        openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        setNotice("Opened browser search.");
      }

      return true;
    }

    return false;
  }

  async function runModelPrompt(
    text: string,
    sessionId: string,
    baseMessages: Message[]
  ) {
    if (!text.trim() || busy) return;

    if (modelState !== "ready" || loadedModelKey !== resolvedModel) {
      setQueuedPrompt({ text, sessionId });
      setNotice("Command queued. V3 will answer when the selected local model is ready.");
      loadModel(resolvedModel);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      createdAt: Date.now()
    };

    const assistantMessage: Message = {
      id: `assistant-${userMessage.id}`,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true
    };

    const history = [...baseMessages, userMessage]
      .filter((message) => message.id !== "welcome-v3" && !message.streaming)
      .slice(-18)
      .map(({ role, content }) => ({ role, content }));

    pendingSessionsRef.current[userMessage.id] = sessionId;
    updateSessionMessages(sessionId, () => [...baseMessages, userMessage, assistantMessage]);

    setBusy(true);
    setStopping(false);
    setFirstChunkMs(undefined);
    setTotalMs(undefined);

    workerRef.current?.postMessage({
      type: "generate",
      id: userMessage.id,
      modelKey: resolvedModel,
      messages: history,
      memories,
      files: files.map(({ name, text }) => ({ name, text })),
      mode: resolvedMode,
      personality
    });
  }

  async function sendMessage(raw = input) {
    const text = raw.trim();
    if (!text || busy || !activeSession) return;

    setInput("");
    setNotice("");

    if (await handleLocalCommand(text, activeSession.id)) {
      setEditingMessageId(null);
      return;
    }

    let baseMessages = activeSession.messages;

    if (editingMessageId) {
      const index = baseMessages.findIndex((message) => message.id === editingMessageId);
      if (index >= 0) {
        baseMessages = baseMessages.slice(0, index);
      }
      setEditingMessageId(null);
    }

    await runModelPrompt(text, activeSession.id, baseMessages);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function startListening() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setNotice("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("Voice recognition stopped. Check microphone permission.");
    };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || "")
        .join("")
        .trim();

      if (transcript) setInput(transcript);

      const last = event.results?.[event.results.length - 1];
      if (last?.isFinal && transcript) {
        void sendMessage(transcript);
      }
    };

    recognition.start();
  }

  function saveMemory() {
    const value = memoryDraft.trim();
    if (!value || memories.includes(value)) return;

    setMemories((current) => [...current, value].slice(-40));
    setMemoryDraft("");
  }

  function exportData() {
    const payload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      sessions,
      memories,
      settings: {
        modelPreference,
        performancePreference,
        personality,
        autoBoot,
        voiceEnabled,
        voiceConversation
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jarvis-v3-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());

      if (Array.isArray(parsed.sessions) && parsed.sessions.length) {
        setSessions(parsed.sessions.slice(0, 30));
        setActiveSessionId(parsed.sessions[0].id);
      }

      if (Array.isArray(parsed.memories)) {
        setMemories(parsed.memories.slice(-40));
      }

      setNotice("J.A.R.V.I.S. data imported.");
      setPrivacyOpen(false);
    } catch {
      setNotice("That backup file could not be imported.");
    }

    event.target.value = "";
  }

  async function clearCaches() {
    if (!("caches" in window)) {
      setNotice("Cache controls are unavailable in this browser.");
      return;
    }

    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    setNotice("Accessible J.A.R.V.I.S. caches cleared. Browser-managed model storage may also require site-data controls.");
  }

  function clearLocalData() {
    const session = newSession();
    setSessions([session]);
    setActiveSessionId(session.id);
    setMemories([]);
    setFiles([]);
    setInput("");

    [
      "jarvis.sessions.v3",
      "jarvis.activeSession.v3",
      "jarvis.memories",
      "jarvis.model.v3",
      "jarvis.mode.v3",
      "jarvis.personality.v3",
      "jarvis.autoboot",
      "jarvis.messages"
    ].forEach((key) => localStorage.removeItem(key));

    setPrivacyOpen(false);
    setNotice("Local J.A.R.V.I.S. chat, memory, and settings data cleared.");
  }

  async function installApp() {
    if (!installPrompt) {
      setNotice("Install is not currently offered by this browser. You can still use Add to Home screen / Install app from the browser menu.");
      return;
    }

    await installPrompt.prompt?.();
    setInstallPrompt(null);
  }

  return (
    <div className={`app-shell v3-shell ${busy ? "is-thinking" : ""}`}>
      <div className="scanlines" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <aside className="side-panel">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div>
            <h1>J.A.R.V.I.S.</h1>
            <p>LOCAL INTELLIGENCE · V3</p>
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

          <p className="model-name">
            {loadedModelKey
              ? MODEL_INFO[loadedModelKey].detail
              : MODEL_INFO[resolvedModel].detail} · {backend}
          </p>

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
            <span>V3 TELEMETRY</span>
          </div>

          <div className="device-tier-card">
            <span>{tier}</span>
            <strong>{resolvedModel.toUpperCase()}</strong>
            <small>{resolvedMode.toUpperCase()} INFERENCE</small>
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
          <div className="section-title v3-section-head">
            <div>
              <BrainCircuit size={15} />
              <span>VECTOR MEMORY</span>
            </div>
            <span>{memoriesUsed}/{memories.length}</span>
          </div>

          <div className="memory-list">
            {memories.length === 0 ? (
              <p className="empty-note">No saved memories yet.</p>
            ) : (
              memories.slice(-12).map((memory, index) => (
                <div className="memory-chip" key={`${memory}-${index}`}>
                  <span>{memory}</span>
                  <button
                    aria-label="Remove memory"
                    onClick={() =>
                      setMemories((items) =>
                        items.filter((item) => item !== memory)
                      )
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
              maxLength={360}
            />
            <button onClick={saveMemory} aria-label="Save memory">
              <Plus size={16} />
            </button>
          </div>
        </section>

        <div className="security-badge">
          <ShieldCheck size={16} />
          <span>Local inference · explicit file access</span>
        </div>
      </aside>

      <main className="main-panel v3-main">
        <header className="topbar">
          <div className="hero-copy">
            <span className="eyebrow">MULTI-MODEL LOCAL ASSISTANT</span>
            <h2>
              J.A.R.V.I.S. <em>V3</em>
            </h2>
            <p>Models · memory · files · tools · voice · sessions</p>
          </div>

          <div className="top-actions">
            <div className="live-pill">
              <span className={online ? "live-dot" : "live-dot offline"} />
              {online ? "NETWORK" : "OFFLINE"}
            </div>

            <button
              className={`icon-button ${voiceConversation ? "active" : ""}`}
              onClick={() => setVoiceConversation((value) => !value)}
              title="Toggle hands-free conversation mode"
            >
              <Mic size={18} />
            </button>

            <button
              className={`icon-button ${voiceEnabled ? "active" : ""}`}
              onClick={() => setVoiceEnabled((value) => !value)}
              title={voiceEnabled ? "Disable spoken replies" : "Enable spoken replies"}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button className="icon-button" onClick={installApp} title="Install web app">
              <Install size={18} />
            </button>

            <button
              className="icon-button"
              onClick={() => setPrivacyOpen(true)}
              title="Privacy center"
            >
              <ShieldCheck size={18} />
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

        <section className="v3-session-bar">
          <div className="session-switcher">
            <select
              value={activeSessionId}
              onChange={(event) => setActiveSessionId(event.target.value)}
              disabled={busy}
            >
              {sessions
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
            </select>

            <button onClick={createSession} disabled={busy}>
              <Plus size={14} /> New
            </button>

            <button onClick={deleteActiveSession} disabled={busy}>
              <Trash2 size={14} />
            </button>
          </div>

          <div className="v3-context-badges">
            <span><BrainCircuit size={12} /> {memories.length} memories</span>
            <span><FileText size={12} /> {files.length} files</span>
            <span><SlidersHorizontal size={12} /> {PERSONALITY_INFO[personality].label}</span>
          </div>
        </section>

        <section className="v3-control-grid">
          <div className="v3-control-card">
            <div className="v3-control-title">
              <Cpu size={15} />
              <span>LOCAL MODEL</span>
            </div>

            <div className="v3-selector">
              {(Object.keys(MODEL_INFO) as ModelPreference[]).map((key) => {
                const item = MODEL_INFO[key];
                const Icon = item.icon;

                return (
                  <button
                    key={key}
                    className={modelPreference === key ? "selected" : ""}
                    onClick={() => switchModel(key)}
                    disabled={busy}
                  >
                    <Icon size={14} />
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                    <em>{item.estimate}</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="v3-control-card">
            <div className="v3-control-title">
              <Gauge size={15} />
              <span>INFERENCE MODE</span>
            </div>

            <div className="v3-selector compact">
              {(Object.keys(MODE_INFO) as PerformancePreference[]).map((key) => {
                const item = MODE_INFO[key];
                const Icon = item.icon;

                return (
                  <button
                    key={key}
                    className={performancePreference === key ? "selected" : ""}
                    onClick={() => setPerformancePreference(key)}
                    disabled={busy}
                  >
                    <Icon size={14} />
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="v3-control-card">
            <div className="v3-control-title">
              <UserRound size={15} />
              <span>PERSONALITY</span>
            </div>

            <div className="v3-selector compact">
              {(Object.keys(PERSONALITY_INFO) as Personality[]).map((key) => {
                const item = PERSONALITY_INFO[key];
                const Icon = item.icon;

                return (
                  <button
                    key={key}
                    className={personality === key ? "selected" : ""}
                    onClick={() => setPersonality(key)}
                    disabled={busy}
                  >
                    <Icon size={14} />
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {modelState !== "ready" || loadedModelKey !== resolvedModel ? (
          <div className="setup-banner model-loader">
            <div className="model-loader-copy">
              <strong>
                {modelState === "loading"
                  ? `Loading ${MODEL_INFO[resolvedModel].label} model`
                  : "V3 neural core is in standby"}
              </strong>
              <span>{modelStatus}</span>

              {queuedPrompt && (
                <span className="queued-command">
                  QUEUED · {queuedPrompt.text.slice(0, 72)}
                </span>
              )}

              {modelState === "loading" && (
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.round(modelProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>

            <button
              className="activate-button"
              onClick={() => loadModel(resolvedModel)}
              disabled={modelState === "loading"}
            >
              <Zap size={15} />
              {modelState === "loading"
                ? `${Math.round(modelProgress * 100)}%`
                : "Initialize"}
            </button>
          </div>
        ) : null}

        <section className="v3-attachments">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.html,.css,.xml,.yaml,.yml"
            onChange={(event) => void handleFileUpload(event)}
          />

          <button className="attach-button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Add local files
          </button>

          {files.map((file) => (
            <div className="file-chip" key={file.id}>
              <FileText size={13} />
              <span>{file.name}</span>
              <small>{Math.ceil(file.size / 1024)} KB</small>
              <button onClick={() => setFiles((items) => items.filter((item) => item.id !== file.id))}>
                <X size={12} />
              </button>
            </div>
          ))}

          {files.length > 0 && (
            <span className="retrieval-stat">
              {fileChunksUsed} excerpt{fileChunksUsed === 1 ? "" : "s"} used last reply
            </span>
          )}
        </section>

        <section className="quick-prompt-deck">
          {QUICK_PROMPTS.map((prompt) => (
            <button key={prompt} onClick={() => void sendMessage(prompt)} disabled={busy}>
              <Sparkles size={14} />
              {prompt}
            </button>
          ))}
        </section>

        <section className="quick-actions">
          <button onClick={() => void sendMessage("/calc 12 * (3 + 4)")} disabled={busy}>
            <Cpu size={15} /> Calculator
          </button>
          <button onClick={() => void sendMessage("/convert 5 km to mi")} disabled={busy}>
            <Repeat2 size={15} /> Convert
          </button>
          <button onClick={() => void sendMessage("/timer 30s")} disabled={busy}>
            <Timer size={15} /> Timer
          </button>
          <button onClick={clearActiveChat} disabled={busy}>
            <Trash2 size={15} /> Clear Session
          </button>
          <button onClick={() => openExternal("https://www.google.com")}>
            <Search size={15} /> Search
          </button>
        </section>

        <section className="chat-card v3-chat">
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
                    <strong>{message.role === "assistant" ? "J.A.R.V.I.S." : "YOU"}</strong>

                    {message.streaming ? (
                      <span className="stream-badge">LIVE</span>
                    ) : message.stopped ? (
                      <span className="stopped-badge">STOPPED</span>
                    ) : (
                      <span>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    )}

                    <div className="message-actions">
                      {message.role === "user" && (
                        <button onClick={() => editMessage(message)} title="Edit and resend">
                          <Pencil size={12} />
                        </button>
                      )}

                      {message.role === "assistant" &&
                        message.id !== "welcome-v3" &&
                        !message.streaming && (
                          <>
                            <button onClick={() => regenerate(message.id)} title="Regenerate">
                              <Repeat2 size={12} />
                            </button>
                            <button onClick={() => void copyMessage(message)} title="Copy">
                              {copiedMessageId === message.id ? (
                                <Check size={12} />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </>
                        )}
                    </div>
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

            {listening && (
              <div className="voice-wave">
                <span /><span /><span /><span /><span /><span />
                <strong>LISTENING</strong>
              </div>
            )}

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
                  editingMessageId
                    ? "Edit the message, then send…"
                    : listening
                      ? "Listening…"
                      : `Command J.A.R.V.I.S. · ${MODEL_INFO[resolvedModel].label} · ${resolvedMode}`
                }
                rows={1}
                maxLength={6000}
              />

              {busy ? (
                <button
                  className="stop-button"
                  type="button"
                  onClick={stopGeneration}
                  disabled={stopping}
                  title="Stop generation"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button className="send-button" type="submit" disabled={!input.trim()}>
                  <Send size={18} />
                </button>
              )}
            </form>

            <div className="composer-footer">
              <span>{MODEL_INFO[resolvedModel].label.toUpperCase()}</span>
              <i />
              <span>{resolvedMode.toUpperCase()}</span>
              <i />
              <span>{PERSONALITY_INFO[personality].label.toUpperCase()}</span>
              <i />
              <span>{backend}</span>
              <i />
              <span>NO API KEY</span>
            </div>
          </div>
        </section>
      </main>

      {privacyOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPrivacyOpen(false)}>
          <section className="privacy-modal" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>LOCAL DATA CONTROLS</span>
                <h3>Privacy Center</h3>
              </div>
              <button onClick={() => setPrivacyOpen(false)}><X size={18} /></button>
            </header>

            <p>
              V3 keeps chat sessions and memories in this browser. Attached files stay in the current page session and are only passed to the local model worker.
            </p>

            <div className="privacy-stats">
              <div><strong>{sessions.length}</strong><span>SESSIONS</span></div>
              <div><strong>{memories.length}</strong><span>MEMORIES</span></div>
              <div><strong>{files.length}</strong><span>FILES ATTACHED</span></div>
            </div>

            <div className="privacy-actions">
              <button onClick={exportData}><Download size={15} /> Export data</button>
              <button onClick={() => importInputRef.current?.click()}><Upload size={15} /> Import data</button>
              <button onClick={() => void clearCaches()}><RefreshCw size={15} /> Clear app caches</button>
              <button className="danger" onClick={clearLocalData}><Trash2 size={15} /> Clear local data</button>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => void importData(event)}
            />

            <small>
              Browser-managed HTTP/model storage can also be cleared from your browser’s site-data settings.
            </small>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
