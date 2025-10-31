import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import RepoInput from "./components/RepoInput.jsx";
import RepoSelect from "./components/RepoSelect.jsx";
import Chat from "./components/Chat.jsx";
import Toast from "./components/Toast.jsx";
import { addRepo as apiAddRepo, getRepos as apiGetRepos, chatRepo as apiChatRepo } from "./lib/api.js";

export default function App() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [addingRepo, setAddingRepo] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [toast, setToast] = useState(null);
  const chatAbortRef = useRef(null);

  useEffect(() => {
    apiGetRepos()
      .then(({ data }) => {
        const list = Array.isArray(data?.repos) ? data.repos : [];
        setRepos(list);
        if (list.length && !selectedRepo) setSelectedRepo(list[0]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chat component manages scroll-to-bottom

  // Load messages for selected repo from localStorage
  useEffect(() => {
    if (!selectedRepo) {
      setMessages([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`chat:${selectedRepo}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
    // cancel in-flight chat if repo changes
    if (chatAbortRef.current) chatAbortRef.current.abort();
  }, [selectedRepo]);

  // Persist messages per repo
  useEffect(() => {
    if (!selectedRepo) return;
    try {
      localStorage.setItem(`chat:${selectedRepo}`, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages, selectedRepo]);

  const setTimedToast = (payload) => {
    setToast(payload);
    if (payload) {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const addRepository = async () => {
    const url = repoUrlInput.trim();
    if (!url) return setTimedToast({ type: "error", text: "Please paste a GitHub repo URL." });
    const ghRe = /^https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;
    if (!ghRe.test(url)) return setTimedToast({ type: "error", text: "Invalid GitHub URL. Use https://github.com/owner/repo" });
    setAddingRepo(true);
    try {
      const { data } = await apiAddRepo(url);
      if (!data || data.error) throw new Error(data?.error || "Failed to add repository");

      const { data: listData } = await apiGetRepos();
      const list = Array.isArray(listData?.repos) ? listData.repos : [];
      setRepos(list);
      // Prefer canonical repo from response (data.repo). Fallback to first entry in list or original input.
      const canonical = data?.repo || (list.length ? list[0] : url);
      setSelectedRepo(canonical);
      setRepoUrlInput("");
      setTimedToast({ type: "success", text: data?.message || "Repo added!" });
    } catch (e) {
      setTimedToast({ type: "error", text: `Error: ${e.message}` });
    } finally {
      setAddingRepo(false);
    }
  };

  const canSend = useMemo(() => Boolean(selectedRepo), [selectedRepo]);

  const [input, setInput] = useState("");
  const onSend = async () => {
    const q = input.trim();
    if (!q) return;
    if (!canSend) {
      setTimedToast({ type: "error", text: "Select a repository first." });
      return;
    }
    // optimistic add user message + placeholder
    setMessages((m) => [...m, { role: "user", content: q, createdAt: Date.now() }]);
    setInput("");
    setAnswering(true);
    try {
      // cancel any in-flight chat
      if (chatAbortRef.current) chatAbortRef.current.abort();
      const ac = new AbortController();
      chatAbortRef.current = ac;
      const { data } = await apiChatRepo(selectedRepo, q, { signal: ac.signal });
      if (!data || data.error) throw new Error(data?.error || "Failed to get answer");
      const ans = typeof data?.answer === "string" ? data.answer : JSON.stringify(data);
      setMessages((m) => [...m, { role: "ai", content: ans, createdAt: Date.now() }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", content: `Error: ${e.message}` }]);
    } finally {
      setAnswering(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black font-mono text-white">
      <Toast toast={toast} />

      {addingRepo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 text-white">
          <div className="w-[90%] max-w-xl border border-white/30 p-8 text-center">
            <h2 className="mb-2 font-pixel text-xl">Analyzing Repository...</h2>
            <p className="text-sm">This may take a few minutes.</p>
          </div>
        </div>
      )}

      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-3 px-3 py-4 md:grid-cols-4 md:gap-4 md:px-4 md:py-6">
        <aside className="space-y-3 md:col-span-1 md:space-y-4">
          <RepoInput value={repoUrlInput} onChange={setRepoUrlInput} onAdd={addRepository} disabled={addingRepo} />
          <RepoSelect repos={repos} selected={selectedRepo} onChange={setSelectedRepo} />
        </aside>
        <Chat
          messages={messages}
          answering={answering}
          selectedRepo={selectedRepo}
          input={input}
          setInput={setInput}
          onSend={onSend}
          onKeyDown={onKeyDown}
        />
      </main>
      <footer className="border-t border-white/20 py-3 text-center text-[10px] text-white/60 md:text-xs">
        Built by{" "}
        <a className="text-[#38d352]" href="https://github.com/SoulDev07" target="_blank" rel="noreferrer">
          SoulDev07
        </a>{" "}
        with <span style={{ color: "#38d352" }}>♥</span>
      </footer>
    </div>
  );
}
