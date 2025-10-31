import { useEffect, useMemo, useRef } from "react";
import userIcon from "@/assets/icons/user.svg";
import robotIcon from "@/assets/icons/robot.svg";
import sendIcon from "@/assets/icons/send.svg";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

export default function Chat({ messages, answering, selectedRepo, input, setInput, onSend, onKeyDown }) {
  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, answering]);

  const sendDisabled = useMemo(() => !selectedRepo || answering || !input.trim(), [selectedRepo, answering, input]);

  const CodeBlock = ({ inline, className, children, ...props }) => {
    const codeText = String(children || "");
    if (inline)
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(codeText);
      } catch {
        /* noop */
      }
    };
    return (
      <div className="group relative">
        <button
          type="button"
          className="absolute right-2 top-2 border border-white/30 bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          Copy
        </button>
        <pre className="overflow-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  };

  return (
    <section className="flex flex-col md:col-span-3">
      <div className="flex items-center justify-between border-b-2 border-white px-4 py-3 text-white">
        <div className="font-pixel text-xs">Chat</div>
        <div className="max-w-[70%] truncate text-[10px] opacity-60">{selectedRepo || "No repo selected"}</div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto bg-black px-3 py-4 md:px-4" role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && (
          <div className="text-xs text-white/60">
            Ask a question about the selected repository. Example: What does the main function do?
          </div>
        )}
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : "";
          return (
            <div
              key={idx}
              className={
                isUser
                  ? "ml-auto max-w-[95%] self-end neo-invert p-3 md:max-w-[80%]"
                  : "mr-auto max-w-[95%] self-start neo p-3 md:max-w-[80%]"
              }
            >
              <div className="mb-2 flex items-center gap-2 text-[10px] opacity-60">
                <img src={isUser ? userIcon : robotIcon} alt="" className={(isUser ? "invert " : "") + "w-4 h-4"} aria-hidden="true" />
                <span>{isUser ? "You" : "AI"}</span>
                {time && <span aria-hidden="true">•</span>}
                {time && <time dateTime={new Date(m.createdAt).toISOString()}>{time}</time>}
              </div>
              {isUser ? (
                <pre className="whitespace-pre-wrap font-mono text-sm">{m.content}</pre>
              ) : (
                <div className="prose max-w-none text-sm text-black">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize, rehypeHighlight]} components={{ code: CodeBlock }}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
        {answering && (
          <div className="mr-auto max-w-[70%] self-start neo p-3">
            <div className="mb-1 text-[10px] opacity-60">AI</div>
            <div className="text-sm">thinking…</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2 border-t-2 border-white bg-black p-3">
        <textarea
          className="input-invert h-20 flex-1 resize-none placeholder-white/60"
          placeholder={selectedRepo ? "Type your question… (Enter to send, Shift+Enter for newline)" : "Select a repo to start chatting"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!selectedRepo || answering}
          aria-label="Message input"
        />
        <button
          className="btn-invert flex items-center gap-2"
          onClick={onSend}
          disabled={sendDisabled}
          aria-label="Send message"
        >
          <img src={sendIcon} alt="" className="h-5 w-5 invert" aria-hidden="true" />
          <span className="hidden text-sm sm:inline">Send</span>
        </button>
      </div>
    </section>
  );
}
