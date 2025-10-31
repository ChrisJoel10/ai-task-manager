'use client';

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

type Task = {
  id: string;
  name: string;
  desc?: string;
  dueAt?: string;          // ISO string for fixed due
  range?: { start: string; end: string }; // optional range
  status: 'pending' | 'done';
  createdAt: string;
};

function isoOrUndefined(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function Page() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [input, setInput] = React.useState('');
  const [chat, setChat] = React.useState<{ role: 'user' | 'model'; parts: {text: string}[] }[]>([]);
  const [editing, setEditing] = React.useState<{ id: string; field: keyof Task } | null>(null);
  const [loading, setLoading] = React.useState(false);
  function addTaskLocal(args: any) {
    const id = crypto.randomUUID();
    const name = args.name?.toString().trim();
    const datetime = args.datetime ? isoOrUndefined(args.datetime) : undefined;
    const range = args.date_range?.start && args.date_range?.end
      ? { start: isoOrUndefined(args.date_range.start)!, end: isoOrUndefined(args.date_range.end)! }
      : undefined;

    const t: Task = {
      id,
      name: name || 'New task',
      desc: args.desc ? String(args.desc) : undefined,
      dueAt: datetime,
      range,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [t, ...prev]);
  }

  function editTaskLocal(args: any) {
    const byId = args.id ? String(args.id) : undefined;
    const byName = args.name ? String(args.name).toLowerCase() : undefined;

    setTasks(prev =>
      prev.map(t => {
        const match =
          (byId && t.id === byId) ||
          (byName && t.name.toLowerCase() === byName);
        if (!match) return t;

        const patch = args.patch || {};
        const next: Task = { ...t };
        if (patch.name) next.name = String(patch.name);
        if (patch.desc !== undefined) next.desc = patch.desc ? String(patch.desc) : undefined;
        if (patch.status) next.status = patch.status === 'done' ? 'done' : 'pending';

        if (patch.datetime) {
          next.dueAt = isoOrUndefined(patch.datetime);
          next.range = undefined;
        } else if (patch.date_range?.start && patch.date_range?.end) {
          next.range = {
            start: isoOrUndefined(patch.date_range.start)!,
            end: isoOrUndefined(patch.date_range.end)!,
          };
          next.dueAt = undefined;
        }
        return next;
      }),
    );
  }

  function removeTaskLocal(args: any) {
    const byId = args.id ? String(args.id) : undefined;
    const byName = args.name ? String(args.name).toLowerCase() : undefined;
    setTasks(prev =>
      prev.filter(t => {
        if (byId) return t.id !== byId;
        if (byName) return t.name.toLowerCase() !== byName;
        return true;
      }),
    );
  }

  function findTasksLocal(args: any) {
    const name = args.name ? String(args.name).toLowerCase() : undefined;
    const status = args.status ? String(args.status) as Task['status'] : undefined;
    const before = args.before ? new Date(args.before) : undefined;
    const after = args.after ? new Date(args.after) : undefined;

    const filtered = tasks.filter(t => {
      if (name && !t.name.toLowerCase().includes(name)) return false;
      if (status && t.status !== status) return false;
      const anchor = t.dueAt ? new Date(t.dueAt) : t.range ? new Date(t.range.start) : undefined;
      if (before && anchor && anchor > before) return false;
      if (after && anchor && anchor < after) return false;
      return true;
    });

    setChat(prev => [
      ...prev,
      { role: 'model', parts:[ {text: `Found ${filtered.length} task(s).`} ]},
    ]);
  }

  function clearChat() {
    setChat([]);
  }

  async function sendToGemini(msg: string) {
    setLoading(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ chatHistory: chat, message: msg}),
      headers: { 'Content-Type': 'application/json' },
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const l of lines) {
        const payload = JSON.parse(l.replace('data: ', '')) as
          | { type: 'text'; text: string }
          | { type: 'toolCall'; name: string; args: any }
          | { type: 'done' };

        if (payload.type === 'text') {
          console.log("Received text payload: ", payload.text);
          setChat(prev => [...prev, { role: 'model', parts: [{text: payload.text }] }]);
        } else if (payload.type === 'toolCall') {
          console.log("Received ToolCall payload: ", payload.name, payload.args);
          // Dispatch tool call locally (MCP-like behavior)
          if (payload.name === 'add_task') {addTaskLocal(payload.args); clearChat();}
          if (payload.name === 'edit_task') editTaskLocal(payload.args);
          if (payload.name === 'remove_task') removeTaskLocal(payload.args);
          if (payload.name === 'find_tasks') findTasksLocal(payload.args);
        } else if (payload.type === 'done') {
          // no-op
        }
      }
    }
    setLoading(false);
  }

  function onSend() {
    const msg = input.trim();
    if (!msg) return;
    setChat(prev => [...prev, { role: 'user', parts: [{text: msg}] }]);
    setInput('');
    sendToGemini(msg);
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function toggleStatus(id: string) {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t)),
    );
  }

  const rowVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.03, type: "spring" as const, stiffness: 300, damping: 25 },
    }),
    exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', background: '#0b0c0f' }}>
      {/* Table pane (3/4) */}
      <div style={{ flex: 3, padding: '16px 20px', overflow: 'auto' }}>
        <h1 style={{ color: '#eaecef', marginBottom: 12 }}>Tasks</h1>

        <div style={{ border: '1px solid #22262c', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ background: '#12151a' }}>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Due</th>
                <th style={th}>Status</th>
                <th style={thRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {tasks.map((t, idx) => (
                  <motion.tr
                    key={t.id}
                    layout
                    custom={idx}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{
                      background: idx % 2 === 0 ? '#0e1116' : '#0b0e13',
                      borderBottom: '1px solid #1a1f27',
                    }}
                  >
                    <td style={td}>
                      {editing?.id === t.id && editing.field === 'name' ? (
                        <input
                          autoFocus
                          defaultValue={t.name}
                          onBlur={e => {
                            updateTask(t.id, { name: e.target.value.trim() || t.name });
                            setEditing(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              updateTask(t.id, { name: target.value.trim() || t.name });
                              setEditing(null);
                            } else if (e.key === 'Escape') {
                              setEditing(null);
                            }
                          }}
                          style={inputStyle}
                        />
                      ) : (
                        <button
                          onClick={() => setEditing({ id: t.id, field: 'name' })}
                          style={cellButton}
                          title="Click to edit"
                        >
                          <span style={{ color: '#e2e8f0' }}>{t.name}</span>
                        </button>
                      )}
                    </td>

                    <td style={td}>
                      {editing?.id === t.id && editing.field === 'dueAt' ? (
                        <input
                          type="datetime-local"
                          autoFocus
                          defaultValue={
                            t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 16) : ''
                          }
                          onBlur={e => {
                            const val = e.target.value;
                            updateTask(t.id, { dueAt: val ? new Date(val).toISOString() : undefined, range: undefined });
                            setEditing(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              const val = target.value;
                              updateTask(t.id, { dueAt: val ? new Date(val).toISOString() : undefined, range: undefined });
                              setEditing(null);
                            } else if (e.key === 'Escape') {
                              setEditing(null);
                            }
                          }}
                          style={inputStyle}
                        />
                      ) : (
                        <button
                          onClick={() => setEditing({ id: t.id, field: 'dueAt' })}
                          style={cellButton}
                          title="Click to edit"
                        >
                          <span style={{ color: t.dueAt || t.range ? '#cbd5e1' : '#64748b' }}>
                            {t.dueAt
                              ? new Date(t.dueAt).toLocaleString()
                              : t.range
                              ? `${new Date(t.range.start).toLocaleString()} → ${new Date(t.range.end).toLocaleString()}`
                              : 'No due'}
                          </span>
                        </button>
                      )}
                    </td>

                    <td style={td}>
                      <button
                        onClick={() => toggleStatus(t.id)}
                        style={{
                          ...pill,
                          background: t.status === 'done' ? '#14532d' : '#1e293b',
                          color: t.status === 'done' ? '#86efac' : '#cbd5e1',
                          borderColor: t.status === 'done' ? '#166534' : '#273244',
                        }}
                      >
                        {t.status}
                      </button>
                    </td>

                    <td style={tdRight}>
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={iconButton}
                        aria-label="Delete task"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...td, color: '#64748b', textAlign: 'center', padding: '32px 12px' }}>
                    No tasks yet. Use the chat to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat pane (1/4) */}
      <div style={{ flex: 1, borderLeft: '1px solid #1a1f27', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #1a1f27' }}>
          <h2 style={{ color: '#eaecef' }}>Chat</h2>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chat.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? '#1f2937' : '#0f172a',
                  color: '#e5e7eb',
                  border: '1px solid #263042',
                  padding: '8px 10px',
                  borderRadius: 10,
                  maxWidth: '80%',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.parts[0].text}
              </div>
            ))}
            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#0f172a',
                  color: '#94a3b8',
                  border: '1px solid #263042',
                  padding: '8px 10px',
                  borderRadius: 10,
                  maxWidth: '80%',
                }}
              >
                Thinking…
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #1a1f27', display: 'flex', gap: 8 }}>
          <input
            placeholder='e.g., "Remind me to get groceries tomorrow at 12"'
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #243041',
              background: '#0b0e13',
              color: '#e5e7eb',
              outline: 'none',
            }}
          />
          <button
            onClick={onSend}
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: loading ? '#334155' : '#1d4ed8',
              color: 'white',
              border: '1px solid #1e3a8a',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  color: '#9aa4b2',
  fontWeight: 600,
  borderBottom: '1px solid #1a1f27',
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const td: React.CSSProperties = { padding: '10px 12px', color: '#d1d5db', verticalAlign: 'middle' };
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
const cellButton: React.CSSProperties = { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #243041', background: '#0b0e13', color: '#e5e7eb', outline: 'none' };
const iconButton: React.CSSProperties = { background: '#111827', color: '#e5e7eb', border: '1px solid #243041', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' };
const pill: React.CSSProperties = { border: '1px solid', borderRadius: 999, padding: '4px 10px', fontSize: 12 };
