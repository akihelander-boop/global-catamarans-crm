// ═══════════════════════════════════════════════════════════════
// Dashboard — client list with search, filter, stats
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClients, deleteClient } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import type { Client } from '@/types';
import Layout from '@/components/Layout';

// ── Helpers ─────────────────────────────────────────────────────
const SCORE_LABEL: Record<number, string> = {
  1: 'Low', 2: 'Below avg', 3: 'Average', 4: 'High', 5: 'Very high',
};
const SCORE_COLOR: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-blue-100 text-blue-700',
  5: 'bg-green-100 text-green-700',
};

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ScorePill({ score }: { score: number | null }) {
  if (!score) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SCORE_COLOR[score]}`}>
      {score} · {SCORE_LABEL[score]}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [clients,      setClients]      = useState<Client[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [scoreFilter,  setScoreFilter]  = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listClients({
      search: search || undefined,
      potentialScore: scoreFilter ? Number(scoreFilter) : undefined,
      customerType: typeFilter || undefined,
    });
    setClients(data);
    setLoading(false);
  }, [search, scoreFilter, typeFilter]);

  // Reload when filters change (debounce search)
  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, scoreFilter, typeFilter, load]);

  const stats = useMemo(() => ({
    total:         clients.length,
    highPotential: clients.filter(c => (c.potential_score ?? 0) >= 4).length,
    timeSensitive: clients.filter(c => c.flag_time_sensitive).length,
    withAction:    clients.filter(c => c.next_step_type).length,
  }), [clients]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteClient(deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    load();
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              Client Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {clients.length} client{clients.length !== 1 ? 's' : ''} in CRM
            </p>
          </div>
          <button
            onClick={() => navigate('/clients/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90
                       text-primary-foreground text-sm font-semibold transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add client
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total clients',    value: stats.total,         color: 'text-primary',  bg: 'bg-secondary' },
            { label: 'High potential',   value: stats.highPotential, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Time-sensitive',   value: stats.timeSensitive, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Actions set',      value: stats.withAction,    color: 'text-green-600',  bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
              <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-sm text-gray-500 leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, email or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border text-sm
                         focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition"
            />
          </div>

          <select
            value={scoreFilter}
            onChange={e => setScoreFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-border text-sm bg-card
                       focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
          >
            <option value="">All scores</option>
            {[1,2,3,4,5].map(n => (
              <option key={n} value={n}>{n} — {SCORE_LABEL[n]}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-border text-sm bg-card
                       focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
          >
            <option value="">All types</option>
            <option value="private">Private</option>
            <option value="business">Business</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading clients…</div>
          ) : clients.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center px-6">
              <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              <p className="font-medium text-gray-500">
                {search || scoreFilter || typeFilter ? 'No clients match your filters' : 'No clients yet'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {!search && !scoreFilter && !typeFilter && 'Click "Add client" to create your first intake.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    {['Name', 'Contact', 'Type', 'Score', 'Next step', 'Modified', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => (
                    <tr
                      key={client.id}
                      className="border-b last:border-0 hover:bg-secondary/80 cursor-pointer transition-colors"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{client.name}</span>
                          {client.flag_time_sensitive && (
                            <span title="Time-sensitive" className="text-orange-400">⚑</span>
                          )}
                          {client.flag_broker_involved && (
                            <span title="Broker involved" className="text-blue-400 text-xs">B</span>
                          )}
                        </div>
                        {client.company_name && (
                          <p className="text-xs text-gray-400 mt-0.5">{client.company_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <div className="space-y-0.5">
                          {client.email && <p className="text-xs">{client.email}</p>}
                          {client.phone && <p className="text-xs">{client.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {client.customer_type ? (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 capitalize">
                            {client.customer_type}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <ScorePill score={client.potential_score} />
                      </td>
                      <td className="px-4 py-3">
                        {client.next_step_type ? (
                          <div>
                            <p className="text-xs font-medium capitalize">
                              {client.next_step_type.replace(/_/g, ' ')}
                            </p>
                            {client.next_step_due_date && (
                              <p className="text-xs text-gray-400">{fmt(client.next_step_due_date)}</p>
                            )}
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {fmt(client.updated_at)}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => navigate(`/clients/${client.id}`)}
                            className="p-1.5 rounded hover:bg-secondary text-primary transition-colors"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(client)}
                              className="p-1.5 rounded hover:bg-red-100 text-red-400 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Showing {clients.length} client{clients.length !== 1 ? 's' : ''}
          {(search || scoreFilter || typeFilter) && ' (filtered)'}
        </p>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm border border-border">
            <h2 className="font-bold text-foreground mb-2">Delete client?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete <strong>{deleteTarget.name}</strong> and all their data. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}