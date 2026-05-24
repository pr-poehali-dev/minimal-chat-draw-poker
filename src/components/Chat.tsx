import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { chatApi } from '@/lib/api';
import type { RoomPlayer } from '@/hooks/useRoom';

interface Message {
  id: number;
  author: string;
  text: string;
  time: string;
  type: 'user' | 'system' | 'me';
}

interface ChatProps {
  myName: string;
  players: RoomPlayer[];
}

const AVATARS = ['🎩', '♠', '♥', '♦', '♣', '🃏', '👑', '🎲'];

export default function Chat({ myName, players }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showOnline, setShowOnline] = useState(false);
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await chatApi.getMessages(lastIdRef.current);
      if (data.messages && data.messages.length > 0) {
        const newMsgs: Message[] = data.messages.map((m: { id: number; author: string; text: string; time: string; type: string }) => ({
          id: m.id,
          author: m.author,
          text: m.text,
          time: m.time,
          type: m.type === 'system' ? 'system' : m.author === myName ? 'me' : 'user',
        }));
        setMessages(prev => [...prev, ...newMsgs]);
        lastIdRef.current = data.messages[data.messages.length - 1].id;
      }
    } catch (_e) { /* ignore */ }
  }, [myName]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await chatApi.send(text);
      await fetchMessages();
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
        <div>
          <h3 className="font-cormorant font-semibold text-base text-[hsl(var(--foreground))]">Чат комнаты</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{players.length} онлайн</span>
          </div>
        </div>
        <button
          onClick={() => setShowOnline(!showOnline)}
          className={`p-1.5 rounded-lg transition-colors ${showOnline ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}
        >
          <Icon name="Users" size={15} />
        </button>
      </div>

      {showOnline ? (
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold mb-3">Участники</div>
          {players.length === 0 && (
            <div className="text-xs text-[hsl(var(--muted-foreground))] text-center py-4">Никого нет...</div>
          )}
          <div className="space-y-2">
            {players.map((user, i) => (
              <div key={user.id} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-7 h-7 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-sm">
                  {AVATARS[i % AVATARS.length]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm truncate block ${user.name === myName ? 'text-[hsl(var(--primary))] font-medium' : 'text-[hsl(var(--foreground))]'}`}>
                    {user.name} {user.name === myName && '(вы)'}
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{user.chips.toLocaleString()} ₽</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {messages.length === 0 && (
            <div className="text-center text-xs text-[hsl(var(--muted-foreground))] py-8">Сообщений пока нет</div>
          )}
          {messages.map((msg, i) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isMe = msg.type === 'me';
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} animate-fade-in`}
                style={{ animationDelay: `${i * 20}ms` }}>
                <div className="w-6 h-6 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {AVATARS[Math.abs((msg.author.charCodeAt(0) || 0)) % AVATARS.length]}
                </div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isMe && (
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] px-1">{msg.author}</span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-tr-sm'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`text-[9px] text-[hsl(var(--muted-foreground))] px-1 ${isMe ? 'text-right' : ''}`}>{msg.time}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="p-3 border-t border-[hsl(var(--border))]">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={myName ? 'Написать...' : 'Войдите чтобы писать'}
            disabled={!myName}
            rows={1}
            className="flex-1 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--primary))] resize-none leading-snug transition-colors disabled:opacity-50"
            style={{ maxHeight: 80 }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || !myName}
            className="p-2 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
          >
            <Icon name={sending ? 'Loader' : 'Send'} size={15} className={sending ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
