import { useEffect, useRef, useState } from "react";
import {
  deleteNotification,
  getState,
  receiveNotification,
  sendMessage,
  toChatId,
} from "./api.js";

const loadJSON = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const time = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Login({ onLogin }) {
  const [idInstance, setId] = useState("");
  const [apiTokenInstance, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const creds = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    };
    try {
      const state = await getState(creds);
      if (state !== "authorized")
        throw new Error(
          `Instance state: ${state}. Scan the QR code in the GREEN-API console first.`,
        );
      onLogin(creds);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect. Check idInstance and apiTokenInstance.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>WhatsApp chat</h1>
        <p>Введите ваши данные с GREEN-API.</p>
        <input
          placeholder="idInstance"
          value={idInstance}
          onChange={(e) => setId(e.target.value)}
          required
        />
        <input
          placeholder="apiTokenInstance"
          type="password"
          value={apiTokenInstance}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button disabled={busy}>{busy ? "Соединяем..." : "Войти"}</button>
      </form>
    </div>
  );
}

function Chat({ creds, onLogout }) {
  const [chats, setChats] = useState(() =>
    loadJSON(`chats:${creds.idInstance}`, {}),
  );
  const [active, setActive] = useState(null);
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(`chats:${creds.idInstance}`, JSON.stringify(chats));
  }, [chats, creds.idInstance]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, active]);

  const addMessage = (chatId, msg) =>
    setChats((prev) => {
      const chat = prev[chatId] ?? {
        phone: chatId.split("@")[0],
        messages: [],
      };
      if (chat.messages.some((m) => m.id === msg.id)) return prev;
      return {
        ...prev,
        [chatId]: { ...chat, messages: [...chat.messages, msg] },
      };
    });

  useEffect(() => {
    let stop = false;
    (async () => {
      while (!stop) {
        try {
          const n = await receiveNotification(creds);
          if (!n) continue;
          const { typeWebhook, senderData, messageData, idMessage, timestamp } =
            n.body ?? {};
          const body =
            messageData?.textMessageData?.textMessage ??
            messageData?.extendedTextMessageData?.text;
          if (body && senderData?.chatId?.endsWith("@c.us")) {
            if (typeWebhook === "incomingMessageReceived")
              addMessage(senderData.chatId, {
                id: idMessage,
                text: body,
                fromMe: false,
                ts: timestamp * 1000,
              });
            else if (typeWebhook === "outgoingMessageReceived")
              addMessage(senderData.chatId, {
                id: idMessage,
                text: body,
                fromMe: true,
                ts: timestamp * 1000,
              });
          }
          await deleteNotification(creds, n.receiptId);
        } catch {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    })();
    return () => {
      stop = true;
    };
  }, [creds]);

  const createChat = (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8)
      return setError("Enter the number with country code, e.g. 79001234567");
    const id = toChatId(digits);
    setChats((p) =>
      p[id] ? p : { ...p, [id]: { phone: digits, messages: [] } },
    );
    setActive(id);
    setPhone("");
    setError("");
  };

  const send = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg || !active) return;
    setText("");
    try {
      const { idMessage } = await sendMessage(creds, active, msg);
      addMessage(active, {
        id: idMessage,
        text: msg,
        fromMe: true,
        ts: Date.now(),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const ids = Object.keys(chats).sort(
    (a, b) =>
      (chats[b].messages.at(-1)?.ts ?? 0) - (chats[a].messages.at(-1)?.ts ?? 0),
  );
  const current = active && chats[active];

  return (
    <div className="app">
      <aside className="sidebar">
        <header>
          <strong>Чаты</strong>
          <button className="link" onClick={onLogout}>
            Выйти
          </button>
        </header>
        <form className="new-chat" onSubmit={createChat}>
          <input
            placeholder="Ваш номер, напр. 79001234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button>Новый чат</button>
        </form>
        {error && <div className="error">{error}</div>}
        <ul>
          {ids.map((id) => (
            <li
              key={id}
              className={id === active ? "active" : ""}
              onClick={() => setActive(id)}
            >
              <div className="avatar">{chats[id].phone.slice(-2)}</div>
              <div className="meta">
                <b>+{chats[id].phone}</b>
                <span>
                  {chats[id].messages.at(-1)?.text ?? "Нет новых сообщений"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="chat">
        {current ? (
          <>
            <header>
              <div className="avatar">{current.phone.slice(-2)}</div>
              <strong>+{current.phone}</strong>
            </header>
            <div className="messages">
              {current.messages.map((m) => (
                <div key={m.id} className={`bubble ${m.fromMe ? "out" : "in"}`}>
                  <span>{m.text}</span>
                  <time>{time(m.ts)}</time>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="composer" onSubmit={send}>
              <input
                placeholder="Введите сообщение"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button disabled={!text.trim()}>Send</button>
            </form>
          </>
        ) : (
          <div className="empty">
            Введите номер телефона чтобы начать общение
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [creds, setCreds] = useState(() => loadJSON("creds", null));
  const login = (c) => {
    localStorage.setItem("creds", JSON.stringify(c));
    setCreds(c);
  };
  const logout = () => {
    localStorage.removeItem("creds");
    setCreds(null);
  };
  return creds ? (
    <Chat creds={creds} onLogout={logout} />
  ) : (
    <Login onLogin={login} />
  );
}
