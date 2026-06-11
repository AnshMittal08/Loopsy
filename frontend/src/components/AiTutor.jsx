import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Send } from 'lucide-react';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

const SUGGESTIONS = [
  "Explain this step in simpler terms",
  "What should my work look like here?",
  "I made a mistake — how do I fix it?",
];

export default function AiTutor({ patternId, currentStepIndex, patternTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const stepLabel = typeof currentStepIndex === 'number' ? `Step ${currentStepIndex + 1}` : null;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const send = useCallback(async (msg) => {
    const text = (msg ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setError(null);
    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const data = await fetchJson('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patternId,
          currentStepIndex,
          userMessage: text,
          history: messages.slice(-6),
        }),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, patternId, currentStepIndex]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleTextareaInput(e) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
  }

  const greeting = patternTitle
    ? `Hi! I'm your crochet coach for "${patternTitle}". What can I help you with${stepLabel ? ` on ${stepLabel}` : ''}?`
    : "Hi! I'm your crochet coach. Ask me anything about your pattern.";

  const content = (
    <>
      {/* FAB */}
      <button
        onClick={() => { setIsOpen(o => !o); if (!hasOpened) setHasOpened(true); }}
        className="fixed bottom-6 right-6 z-[9000] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-on-primary shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open AI crochet tutor"
        style={{ bottom: 24, right: 24 }}
      >
        <Sparkles size={20} />
        <span className="hidden sm:inline text-sm font-bold">Ask tutor</span>
        {!hasOpened && (
          <span
            className="absolute inset-0 rounded-full bg-primary opacity-30 animate-ping pointer-events-none"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed z-[9000] flex flex-col rounded-2xl bg-surface-container shadow-2xl ring-1 ring-outline-variant/20 overflow-hidden"
          style={{
            bottom: 96,
            right: 24,
            width: 'min(400px, calc(100vw - 48px))',
            height: 480,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-primary" />
              <span className="font-bold text-sm text-on-surface">AI Crochet Tutor</span>
              {stepLabel && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {stepLabel}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Close tutor"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Greeting */}
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-container-highest px-3 py-2 text-sm text-on-surface leading-relaxed">
                {greeting}
              </div>
            </div>

            {/* Suggestions */}
            {messages.length === 0 && (
              <div className="flex flex-col gap-2 mt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-xs rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation */}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-on-primary rounded-tr-sm'
                      : 'bg-surface-container-highest text-on-surface rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-highest rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 px-1">{error}</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 flex items-end gap-2 px-3 py-3 border-t border-outline-variant/20 bg-surface-container">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this step…"
              rows={1}
              className="flex-1 resize-none rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-1 focus:ring-primary/50 leading-snug"
              style={{ maxHeight: 80 }}
              aria-label="Message to AI tutor"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="rounded-xl bg-primary p-2.5 text-on-primary disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform shrink-0"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
}
