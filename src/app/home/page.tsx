'use client';

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

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
  const [chat, setChat] = React.useState<{ role: 'user' | 'model'; parts: { text: string }[]; data?: { type: 'searchResults'; ids: string[] } }[]>([]);
  const [editing, setEditing] = React.useState<{ id: string; field: keyof Task } | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Pagination & Highlighting State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [highlightedTaskId, setHighlightedTaskId] = React.useState<string | null>(null);

  // Filter State
  const [activeTab, setActiveTab] = React.useState<'All' | 'Pending' | 'Done'>('All');

  const supabase = createClient();
  const router = useRouter();

  const [userName, setUserName] = React.useState('');

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const done = tasks.filter(t => t.status === 'done').length;
    return { total, pending, done };
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    if (activeTab === 'Pending') return tasks.filter(t => t.status === 'pending');
    if (activeTab === 'Done') return tasks.filter(t => t.status === 'done');
    return tasks;
  }, [tasks, activeTab]);

  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Set user name from metadata
      const meta = user.user_metadata;
      if (meta?.first_name && meta?.last_name) {
        setUserName(`${meta.first_name} ${meta.last_name}`);
      } else if (meta?.full_name) {
        setUserName(meta.full_name);
      } else {
        setUserName(user.email || '');
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        const mappedTasks: Task[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          desc: t.description,
          dueAt: t.due_at,
          range: t.range_start && t.range_end ? { start: t.range_start, end: t.range_end } : undefined,
          status: t.status,
          createdAt: t.created_at,
        }));
        setTasks(mappedTasks);
      }
    };

    fetchTasks();
  }, [router, supabase]);

  // Auto-navigation to highlighted task
  useEffect(() => {
    if (highlightedTaskId) {
      // 1. Check if task is in current filter
      const isInFilter = filteredTasks.some(t => t.id === highlightedTaskId);

      if (isInFilter) {
        const index = filteredTasks.findIndex(t => t.id === highlightedTaskId);
        if (index !== -1) {
          const page = Math.floor(index / pageSize) + 1;
          if (page !== currentPage) {
            setCurrentPage(page);
          }
        }
      } else {
        // 2. If not in current filter, switch tab
        const task = tasks.find(t => t.id === highlightedTaskId);
        if (task) {
          if (task.status === 'pending' && activeTab !== 'Pending') setActiveTab('Pending');
          else if (task.status === 'done' && activeTab !== 'Done') setActiveTab('Done');
          else if (activeTab !== 'All') setActiveTab('All');
        }
      }
    }
  }, [highlightedTaskId, filteredTasks, pageSize, currentPage, activeTab, tasks]);

  // Scroll to highlighted task
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`task-row-${highlightedTaskId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId, currentPage, activeTab]);

  // Clear highlight after 5 seconds
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => setHighlightedTaskId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  async function addTaskLocal(args: any) {
    const name = args.name?.toString().trim();
    const datetime = args.datetime ? isoOrUndefined(args.datetime) : undefined;
    const range = args.date_range?.start && args.date_range?.end
      ? { start: isoOrUndefined(args.date_range.start)!, end: isoOrUndefined(args.date_range.end)! }
      : undefined;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newTask = {
      user_id: user.id,
      name: name || 'New task',
      description: args.desc ? String(args.desc) : undefined,
      due_at: datetime,
      range_start: range?.start,
      range_end: range?.end,
      status: 'pending',
    };

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });

    const data = await res.json();

    if (data) {
      const t: Task = {
        id: data.id,
        name: data.name,
        desc: data.description,
        dueAt: data.due_at,
        range: data.range_start && data.range_end ? { start: data.range_start, end: data.range_end } : undefined,
        status: data.status,
        createdAt: data.created_at,
      };
      setTasks(prev => [t, ...prev]);
      setHighlightedTaskId(t.id);
    }
  }

  async function editTaskLocal(args: any) {
    const byId = args.id ? String(args.id) : undefined;
    const byName = args.name ? String(args.name).toLowerCase() : undefined;

    const taskToUpdate = tasks.find(t =>
      (byId && t.id === byId) || (byName && t.name.toLowerCase() === byName)
    );

    if (!taskToUpdate) return;

    const patch = args.patch || {};
    const updates: any = {};

    if (patch.name) updates.name = String(patch.name);
    if (patch.desc !== undefined) updates.description = patch.desc ? String(patch.desc) : null;
    if (patch.status) updates.status = patch.status === 'done' ? 'done' : 'pending';

    if (patch.datetime) {
      updates.due_at = isoOrUndefined(patch.datetime);
      updates.range_start = null;
      updates.range_end = null;
    } else if (patch.date_range?.start && patch.date_range?.end) {
      updates.range_start = isoOrUndefined(patch.date_range.start);
      updates.range_end = isoOrUndefined(patch.date_range.end);
      updates.due_at = null;
    }

    const res = await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskToUpdate.id, ...updates }),
    });

    const data = await res.json();

    if (res.ok) {
      setTasks(prev =>
        prev.map(t => {
          if (t.id !== taskToUpdate.id) return t;
          const next = { ...t, ...patch };
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
        })
      );
      setHighlightedTaskId(taskToUpdate.id);
    }
  }

  async function removeTaskLocal(args: any) {
    const byId = args.id ? String(args.id) : undefined;
    const byName = args.name ? String(args.name).toLowerCase() : undefined;

    const taskToDelete = tasks.find(t =>
      (byId && t.id === byId) || (byName && t.name.toLowerCase() === byName)
    );

    if (!taskToDelete) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskToDelete.id);

    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
    }
  }

  async function findTasksLocal(args: any) {
    const name = args.name ? String(args.name).toLowerCase() : undefined;
    const query = args.query ? String(args.query) : undefined;
    const status = args.status ? String(args.status) as Task['status'] : undefined;
    const before = args.before ? new Date(args.before) : undefined;
    const after = args.after ? new Date(args.after) : undefined;

    let foundIds: string[] = [];

    if (query || name) {
      // Use semantic search API if query or name is provided
      // We use 'name' as query if 'query' is not provided, to leverage semantic search for names too
      const q = query || name;
      try {
        const res = await fetch(`/api/tasks?query=${encodeURIComponent(q!)}`);
        if (res.ok) {
          const results = await res.json();
          foundIds = results.map((t: any) => t.id);
        }
      } catch (e) {
        console.error("Search failed", e);
      }
    } else {
      // Fallback to local filtering if no text query
      foundIds = tasks.filter(t => {
        if (status && t.status !== status) return false;
        const anchor = t.dueAt ? new Date(t.dueAt) : t.range ? new Date(t.range.start) : undefined;
        if (before && anchor && anchor > before) return false;
        if (after && anchor && anchor < after) return false;
        return true;
      }).map(t => t.id);
    }

    setChat(prev => [
      ...prev,
      {
        role: 'model',
        parts: [{ text: `Found ${foundIds.length} task(s).` }],
        data: foundIds.length > 1 ? { type: 'searchResults', ids: foundIds } : undefined
      },
    ]);

    if (foundIds.length > 0) {
      // Find the first found ID that exists in our local tasks list
      const firstMatch = foundIds.find(id => tasks.some(t => t.id === id));
      if (firstMatch) {
        setHighlightedTaskId(firstMatch);
      }
    }
  }

  function clearChat() {
    setChat([]);
  }

  async function sendToGemini(msg: string) {
    setLoading(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ chatHistory: chat, message: msg }),
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
          setChat(prev => [...prev, { role: 'model', parts: [{ text: payload.text }] }]);
        } else if (payload.type === 'toolCall') {
          if (payload.name === 'add_task') { addTaskLocal(payload.args); clearChat(); }
          if (payload.name === 'edit_task') editTaskLocal(payload.args);
          if (payload.name === 'remove_task') removeTaskLocal(payload.args);
          if (payload.name === 'find_tasks') findTasksLocal(payload.args);
        }
      }
    }
    setLoading(false);
  }

  function onSend() {
    const msg = input.trim();
    if (!msg) return;
    setChat(prev => [...prev, { role: 'user', parts: [{ text: msg }] }]);
    setInput('');
    sendToGemini(msg);
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));

    const updates: any = {};
    if (patch.name) updates.name = patch.name;
    if (patch.desc !== undefined) updates.description = patch.desc;
    if (patch.status) updates.status = patch.status;
    if (patch.dueAt !== undefined) {
      updates.due_at = patch.dueAt;
      if (patch.range === undefined) {
        updates.range_start = null;
        updates.range_end = null;
      }
    }

    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  }

  async function toggleStatus(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'pending' : 'done';

    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)),
    );

    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
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



  const totalPages = Math.ceil(filteredTasks.length / pageSize);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <style>{`
        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 2px #3b82f6; }
          50% { box-shadow: 0 0 0 2px #8b5cf6; }
          100% { box-shadow: 0 0 0 2px #3b82f6; }
        }
        .highlight-row {
          animation: pulse-border 2s infinite;
          z-index: 1;
          position: relative;
        }
      `}</style>

      {/* Main Content (3/4) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          </div>
          <div className="flex items-center gap-4">
            {userName && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">{userName}</span>
              </div>
            )}
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900">Logout</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-sm font-medium text-gray-500">Total Tasks</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium text-gray-500">Pending Tasks</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.pending}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-500">Completed Tasks</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.done}</div>
            </div>
          </div>

          {/* Tabs & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex gap-6 border-b border-gray-200 w-full sm:w-auto">
              {['All', 'Pending', 'Done'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => document.getElementById('chat-input')?.focus()}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                + Add Task
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-6 py-4">Task Name</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence initial={false} mode="wait">
                  {paginatedTasks.map((t, idx) => (
                    <motion.tr
                      id={`task-row-${t.id}`}
                      key={t.id}
                      layout
                      custom={idx}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={`hover:bg-gray-50 transition-colors ${highlightedTaskId === t.id ? 'highlight-row bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4">
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
                                updateTask(t.id, { name: (e.target as HTMLInputElement).value.trim() || t.name });
                                setEditing(null);
                              } else if (e.key === 'Escape') setEditing(null);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                            <button
                              onClick={() => setEditing({ id: t.id, field: 'name' })}
                              className="font-medium text-gray-900 hover:text-blue-600 text-sm text-left"
                            >
                              {t.name}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {editing?.id === t.id && editing.field === 'dueAt' ? (
                          <input
                            type="datetime-local"
                            autoFocus
                            defaultValue={t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 16) : ''}
                            onBlur={e => {
                              const val = e.target.value;
                              updateTask(t.id, { dueAt: val ? new Date(val).toISOString() : undefined, range: undefined });
                              setEditing(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value;
                                updateTask(t.id, { dueAt: val ? new Date(val).toISOString() : undefined, range: undefined });
                                setEditing(null);
                              } else if (e.key === 'Escape') setEditing(null);
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <button
                            onClick={() => setEditing({ id: t.id, field: 'dueAt' })}
                            className="text-sm text-gray-500 hover:text-blue-600"
                          >
                            {t.dueAt
                              ? new Date(t.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                              : t.range
                                ? `${new Date(t.range.start).toLocaleDateString()} - ${new Date(t.range.end).toLocaleDateString()}`
                                : 'No due date'}
                          </button>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(t.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${t.status === 'done'
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                            }`}
                        >
                          {t.status === 'done' ? 'Completed' : 'Pending'}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                      No tasks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, filteredTasks.length)}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, filteredTasks.length)}</span> of <span className="font-medium">{filteredTasks.length}</span> entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Simple pagination logic for display
                    let p = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      p = currentPage - 2 + i;
                    }
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded text-sm ${currentPage === p
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 border border-gray-300 rounded bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar (1/4) */}
      <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full shadow-lg z-10">
        <div className="h-20 px-6 flex flex-col justify-center border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800 leading-tight">AI Assistant</h2>
          <p className="text-xs text-gray-500 mt-0.5">Ask me to add, edit, or find tasks.</p>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          <div className="flex flex-col gap-4">
            {chat.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm max-w-[90%] ${m.role === 'user'
                  ? 'self-end bg-blue-600 text-white'
                  : 'self-start bg-white border border-gray-200 text-gray-700 shadow-sm'
                  }`}
              >
                {m.parts[0].text}
                {m.data?.type === 'searchResults' && m.data.ids.length > 1 && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        const ids = m.data!.ids;
                        const currentIdx = ids.indexOf(highlightedTaskId || '');
                        const nextIdx = currentIdx <= 0 ? ids.length - 1 : currentIdx - 1;
                        setHighlightedTaskId(ids[nextIdx]);
                      }}
                      className="text-xs bg-black/10 hover:bg-black/20 px-2 py-1 rounded"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => {
                        const ids = m.data!.ids;
                        const currentIdx = ids.indexOf(highlightedTaskId || '');
                        const nextIdx = currentIdx === -1 || currentIdx === ids.length - 1 ? 0 : currentIdx + 1;
                        setHighlightedTaskId(ids[nextIdx]);
                      }}
                      className="text-xs bg-black/10 hover:bg-black/20 px-2 py-1 rounded"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="self-start bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-sm animate-pulse">
                Thinking...
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              id="chat-input"
              placeholder="Type a command..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
            />
            <button
              onClick={onSend}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
