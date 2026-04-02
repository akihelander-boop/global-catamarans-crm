// ═══════════════════════════════════════════════════════════════
// Client activity timeline — calls, messages, viewings, offers, etc.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import {
  getClient,
  listActivitiesForBuyer,
  createActivity,
  getProfilesByIds,
} from '@/lib/supabaseClient';
import { ACTIVITY_TYPE_LABEL, ACTIVITY_TYPE_ORDER, formatActivityWhen } from '@/lib/activityLabels';
import type { Activity, ActivityType, Client, Profile } from '@/types';

export default function ClientTimeline() {
  const { id: buyerId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [type, setType] = useState<ActivityType>('note');
  const [note, setNote] = useState('');
  const [boatId, setBoatId] = useState('');
  const [occurredLocal, setOccurredLocal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch client + activities when buyer id changes (mount or navigation).
  /* eslint-disable react-hooks/set-state-in-effect -- classic fetch-on-mount; avoids stale closure on buyerId */
  useEffect(() => {
    if (!buyerId) return;
    let cancelled = false;
    setLoadError(null);
    setLoading(true);
    (async () => {
      const c = await getClient(buyerId);
      if (cancelled) return;
      if (!c) {
        setClient(null);
        setLoadError('Client not found.');
        setLoading(false);
        return;
      }
      setClient(c);
      const rows = await listActivitiesForBuyer(buyerId);
      if (cancelled) return;
      setActivities(rows);
      const authorIds = rows.map(r => r.user_id).filter((x): x is string => !!x);
      const profs = await getProfilesByIds(authorIds);
      if (cancelled) return;
      setProfiles(new Map(profs.map(p => [p.id, p])));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [buyerId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function refreshTimeline() {
    if (!buyerId) return;
    const rows = await listActivitiesForBuyer(buyerId);
    setActivities(rows);
    const authorIds = rows.map(r => r.user_id).filter((x): x is string => !!x);
    const profs = await getProfilesByIds(authorIds);
    setProfiles(new Map(profs.map(p => [p.id, p])));
  }

  const authorLabel = useMemo(() => {
    return (userId: string | null) => {
      if (!userId) return 'Unknown user';
      const p = profiles.get(userId);
      return p?.full_name || p?.email || userId.slice(0, 8) + '…';
    };
  }, [profiles]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId) return;
    setSaveError(null);
    setSaving(true);
    const occurred_at = occurredLocal
      ? new Date(occurredLocal).toISOString()
      : undefined;
    const boat_id = boatId.trim() || null;
    const { activity: created, error: createErr } = await createActivity({
      type,
      note: note.trim() || null,
      buyer_id: buyerId,
      boat_id,
      occurred_at,
    });
    setSaving(false);
    if (created) {
      setNote('');
      setBoatId('');
      setOccurredLocal('');
      setType('note');
      await refreshTimeline();
    } else {
      setSaveError(
        createErr ??
          'Could not save activity. Check Supabase table `activities` and RLS.',
      );
    }
  };

  if (!buyerId) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground text-sm">Missing client id.</div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground text-sm">Loading timeline…</div>
      </Layout>
    );
  }

  if (loadError || !client) {
    return (
      <Layout>
        <div className="p-8 max-w-md mx-auto text-center space-y-4">
          <p className="text-red-600 text-sm">{loadError ?? 'Not found.'}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Back to dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto pb-24 md:pb-8">
        {/* Prominent header */}
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.12] via-card to-card shadow-sm mb-8 overflow-hidden">
          <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="p-2.5 rounded-xl bg-background/80 border border-border/80 hover:bg-muted text-muted-foreground transition-colors shrink-0"
                aria-label="Back"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div className="flex gap-4 min-w-0">
                <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
                    Activity timeline
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight break-words">
                    {client.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                    Log every touchpoint here — calls, messages, viewings and notes. The whole team sees this history.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 lg:pt-1">
              <Link
                to="/activity"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background/90 text-sm font-semibold hover:bg-muted transition-colors"
              >
                All client activity
              </Link>
              <Link
                to={`/clients/${buyerId}`}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors"
              >
                Edit client profile
              </Link>
            </div>
          </div>
        </div>

        {/* Add activity */}
        <form
          onSubmit={handleAdd}
          className="bg-card border-2 border-border rounded-2xl shadow-md p-6 mb-10 space-y-4"
        >
          <h2 className="text-base font-bold text-foreground">Log new activity</h2>
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as ActivityType)}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background"
              >
                {ACTIVITY_TYPE_ORDER.map(t => (
                  <option key={t} value={t}>{ACTIVITY_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">When (optional)</label>
              <input
                type="datetime-local"
                value={occurredLocal}
                onChange={e => setOccurredLocal(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="What happened? Next steps?"
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background resize-y min-h-[88px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              Boat ID <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              value={boatId}
              onChange={e => setBoatId(e.target.value)}
              placeholder="UUID when listing is linked"
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background font-mono text-xs"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Add to timeline'}
            </button>
          </div>
        </form>

        {/* Timeline */}
        <h2 className="text-lg font-bold text-foreground mb-4">History</h2>
        {activities.length === 0 ? (
          <div className="text-center py-14 px-4 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-sm">
            No activities yet. Log a call, email, or note above.
          </div>
        ) : (
          <ul className="space-y-0 border-2 border-border rounded-2xl overflow-hidden bg-card divide-y divide-border shadow-sm">
            {activities.map(a => (
              <li key={a.id} className="p-4 sm:p-5 flex gap-3">
                <div
                  className="w-1 shrink-0 rounded-full bg-primary/70 self-stretch min-h-[2.5rem]"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <span className="font-semibold text-foreground text-base">
                    {ACTIVITY_TYPE_LABEL[a.type] ?? a.type}
                  </span>
                  <time className="text-xs text-muted-foreground tabular-nums" dateTime={a.occurred_at}>
                    {formatActivityWhen(a.occurred_at)}
                  </time>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {authorLabel(a.user_id)}
                  {a.boat_id && (
                    <span className="ml-2 font-mono text-[10px] opacity-80">· boat {a.boat_id.slice(0, 8)}…</span>
                  )}
                </p>
                {a.note && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{a.note}</p>
                )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
