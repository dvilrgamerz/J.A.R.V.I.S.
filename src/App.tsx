import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  BrainCircuit,
  ChevronRight,
  CirclePower,
  Cpu,
  ExternalLink,
  HardDrive,
  MemoryStick,
  Mic,
  MicOff,
  MonitorCog,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Zap
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

const starterMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "J.A.R.V.I.S. online. Systems are standing by. Configure your Gemini key, then ask me anything or use a quick action.",
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

function formatUptime(minutes?: number) {
  if (typeof minutes !== "number") return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
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
  const [systemInfo, setSystemInfo] = useState<JarvisSystemInfo | null>(null);
  const [config, setConfig] = useState<JarvisConfig | null>(null);
  const [notice, setNotice] = useState<string>("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("jarvis.messages", JSON.stringify(messages.slice(-100)));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("jarvis.memories", JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    void Promise.all([window.jarvis.getSystemInfo(), window.jarvis.getConfig()]).then(
      ([info, cfg]) => {
        setSystemInfo(info);
        setConfig(cfg);
      }
    );
  }, []);

  const status = useMemo(() => {
    if (busy) return "PROCESSING";
    if (!config?.aiConfigured) return "SETUP REQUIRED";
    return "ONLINE";
  }, [busy, config]);

  function addMessage(role: Message["role"], content: string) {
    const message: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      createdAt: Date.now()
    };
    setMessages((current) => [...current, message]);
    return message;
  }

  function speak(text: string) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  async function runQuickAction(action: "calculator" | "notepad" | "paint" | "files") {
    const result = await window.jarvis.openApp(action);
    setNotice(result.ok ? `Opening ${action}.` : result.error || "Action failed.");
  }

  async function handleLocalCommand(text: string): Promise<boolean> {
    const normalized = text.trim().toLowerCase();

    const appCommands: Record<string, "calculator" | "notepad" | "paint" | "files"> = {
      "/calc": "calculator",
      "open calculator": "calculator",
      "/notepad": "notepad",
      "open notepad": "notepad",
      "/paint": "paint",
      "open paint": "paint",
      "/files": "files",
      "open files": "files",
      "open file explorer": "files"
    };

    if (appCommands[normalized]) {
      addMessage("user", text);
      const result = await window.jarvis.openApp(appCommands[normalized]);
      const reply = result.ok
        ? `Opening ${appCommands[normalized]}.`
        : result.error || "I couldn't open that app.";
      addMessage("assistant", reply);
      speak(reply);
      return true;
    }

    if (normalized === "/youtube" || normalized === "open youtube") {
      addMessage("user", text);
      const result = await window.jarvis.openExternal("https://www.youtube.com");
      const reply = result.ok ? "Opening YouTube." : result.error || "I couldn't open YouTube.";
      addMessage("assistant", reply);
      speak(reply);
      return true;
    }

    if (normalized === "/clear") {
      setMessages([starterMessage]);
      setNotice("Conversation cleared.");
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

    const userMessage = addMessage("user", text);
    setBusy(true);

    try {
      const history = [...messages, userMessage]
        .filter((message) => message.id !== "welcome")
        .slice(-24)
        .map(({ role, content }) => ({ role, content }));

      const result = await window.jarvis.chat({
        messages: history,
        memories
      });

      const answer = result.ok
        ? result.answer || "I received no response."
        : result.error || "I couldn't reach the AI service.";

      addMessage("assistant", answer);
      speak(answer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      addMessage("assistant", message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function startListening() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setNotice("Speech recognition is not available in this Electron build. You can still type.");
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
      setNotice("Voice recognition stopped. Check microphone permissions.");
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
            <p>DESKTOP INTELLIGENCE</p>
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
            <span className={`status-dot ${config?.aiConfigured ? "online" : "warning"}`} />
            <span>{status}</span>
          </div>
          <p className="model-name">{config?.model || "Loading AI core…"}</p>
        </section>

        <section className="panel-section">
          <div className="section-title">
            <MonitorCog size={15} />
            <span>SYSTEM TELEMETRY</span>
          </div>
          <div className="telemetry-grid">
            <div className="telemetry-item">
              <Cpu size={16} />
              <span>CPU</span>
              <strong>{systemInfo?.cores ?? "—"} cores</strong>
            </div>
            <div className="telemetry-item">
              <MemoryStick size={16} />
              <span>MEMORY</span>
              <strong>{systemInfo ? `${systemInfo.memoryGb} GB` : "—"}</strong>
            </div>
            <div className="telemetry-item">
              <HardDrive size={16} />
              <span>HOST</span>
              <strong>{systemInfo?.hostname || "—"}</strong>
            </div>
            <div className="telemetry-item">
              <Zap size={16} />
              <span>UPTIME</span>
              <strong>{formatUptime(systemInfo?.uptimeMinutes)}</strong>
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
              maxLength={500}
            />
            <button onClick={saveMemory} aria-label="Save memory"><Plus size={16} /></button>
          </div>
        </section>

        <div className="security-badge">
          <ShieldCheck size={16} />
          <span>Permission-gated desktop tools</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="eyebrow">COMMAND INTERFACE</span>
            <h2>Good to see you.</h2>
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
              onClick={() => void window.jarvis.openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.")}
            >
              Repository <ExternalLink size={15} />
            </button>
          </div>
        </header>

        {!config?.aiConfigured && config && (
          <div className="setup-banner">
            <div>
              <strong>AI core needs a key</strong>
              <span>Copy .env.example to .env and set GEMINI_API_KEY, then restart J.A.R.V.I.S.</span>
            </div>
            <ChevronRight size={18} />
          </div>
        )}

        <section className="quick-actions" aria-label="Quick actions">
          <button onClick={() => void runQuickAction("calculator")}><Cpu size={16} /> Calculator</button>
          <button onClick={() => void runQuickAction("notepad")}><Bot size={16} /> Notepad</button>
          <button onClick={() => void runQuickAction("files")}><HardDrive size={16} /> Files</button>
          <button onClick={() => void window.jarvis.openExternal("https://www.youtube.com")}><ExternalLink size={16} /> YouTube</button>
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
                  <div className="message-meta"><strong>J.A.R.V.I.S.</strong><span>processing</span></div>
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
                placeholder={listening ? "Listening…" : "Ask J.A.R.V.I.S. or type /calc, /files, /youtube…"}
                rows={1}
                maxLength={8000}
              />
              <button className="send-button" type="submit" disabled={busy || !input.trim()}>
                <Send size={18} />
              </button>
            </form>
            <p className="composer-hint">
              Local memories stay on this PC. Desktop tools are allowlisted and do not run arbitrary shell commands.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
