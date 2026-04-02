// ═══════════════════════════════════════════════════════════════
// CRM tasks — assign to teammates, due time, reminder channel
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import {
  createCrmTask,
  getAssignableProfiles,
  getProfilesByIds,
  listClients,
  listCrmTasks,
  updateCrmTaskStatus,
} from '@/lib/supabaseClient';
import type { ListCrmTasksScope } from '@/lib/supabaseClient';
import {
  CRM_REMINDER_CHANNEL_HELP,
  CRM_REMINDER_CHANNEL_LABEL,
  CRM_TASK_TYPE_LABEL,
} from '@/lib/crmTaskLabels';
import { formatActivityWhen } from '@/lib/activityLabels';
import type {
  Client,
  CrmReminderChannel,
  CrmTaskType,
  CrmTaskWithRelations,
  Profile,
} from '@/types';

export default function Tasks() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<ListCrmTasksScope>('assigned_to_me');
  const [rows, setRows] = useState<CrmTaskWithRelations[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<CrmTaskType>('call');
  const [assignedTo, setAssignedTo] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [dueLocal, setDueLocal] = useState('');
  const [channel, setChannel] = useState<CrmReminderChannel>('in_app');
  const [waPhone, setWaPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [assigneeListIsFallback, setAssigneeListIsFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const taskList = await listCrmTasks({ scope, includeDone: false });
    setRows(taskList);

    const { profiles: baseProfs, usedAuthFallback } = await getAssignableProfiles();
    setAssigneeListIsFallback(usedAuthFallback);
    const assigneeIds = [...new Set(taskList.map(t => t.assigned_to))];
    const missingIds = assigneeIds.filter(id => !baseProfs.some(p => p.id === id));
    const extra = missingIds.length > 0 ? await getProfilesByIds(missingIds) : [];
    const merged = new Map<string, Profile>();
    for (const p of [...baseProfs, ...extra]) merged.set(p.id, p);
    setProfiles([...merged.values()]);

    const cl = await listClients({});
    setClients(cl.slice(0, 300));
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (profiles.length && !assignedTo) {
      setAssignedTo(profiles[0].id);
    }
  }, [profiles, assignedTo]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!assignedTo) {
      setFormError('Choose a teammate.');
      return;
    }
    if (!dueLocal) {
      setFormError('Set a due date and time.');
      return;
    }
    if (channel === 'whatsapp' && !waPhone.trim()) {
      setFormError('WhatsApp reminders need a phone number in E.164 format (e.g. +358401234567).');
      return;
    }

    const due_at = new Date(dueLocal).toISOString();
    setSaving(true);
    const { task, error } = await createCrmTask({
      title: title.trim(),
      task_type: taskType,
      assigned_to: assignedTo,
      buyer_id: buyerId || null,
      due_at,
      reminder_channel: channel,
      whatsapp_phone_e164: channel === 'whatsapp' ? waPhone.trim() : null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error || !task) {
      setFormError(error ?? 'Could not create task.');
      return;
    }
    setTitle('');
    setNotes('');
    setWaPhone('');
    await load();
  };

  const handleDone = async (id: string) => {
    const { ok, error } = await updateCrmTaskStatus(id, 'done');
    if (!ok) {
      console.error(error);
      return;
    }
    await load();
  };

  const assigneeName = (id: string) => {
    const p = profiles.find(x => x.id === id);
    return p?.full_name || p?.email || id.slice(0, 8) + '…';
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto pb-16">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">CRM</p>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Tasks & reminders</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Assign a call, email or message to a teammate. Choose when it is due and how reminders are delivered.
              External email/WhatsApp requires Supabase Edge Function + provider keys (see deploy notes below the form).
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted shrink-0"
          >
            Dashboard
          </button>
        </div>

        {/* Create */}
        <section className="rounded-2xl border-2 border-border bg-card shadow-sm p-6 mb-10">
          <h2 className="text-base font-bold text-foreground mb-4">New task</h2>
          {assigneeListIsFallback && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Team list not loaded from the database</p>
              <p className="mt-1 text-amber-900/90">
                Only your account appears for now — you can still save tasks assigned to yourself.
                To list everyone: add a row in <code className="bg-amber-100/80 px-1 rounded">public.profiles</code> for each
                CRM user (id = auth user id) and ensure RLS allows SELECT on profiles (migration includes policy{' '}
                <code className="bg-amber-100/80 px-1 rounded">profiles_select_team_crm</code>).
              </p>
            </div>
          )}
          {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Call back about financing"
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Type</label>
                <select
                  value={taskType}
                  onChange={e => setTaskType(e.target.value as CrmTaskType)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background"
                >
                  {(Object.keys(CRM_TASK_TYPE_LABEL) as CrmTaskType[]).map(t => (
                    <option key={t} value={t}>{CRM_TASK_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Assign to</label>
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-semibold">Client (optional)</label>
                <select
                  value={buyerId}
                  onChange={e => setBuyerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background"
                >
                  <option value="">— none —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Due</label>
                <input
                  type="datetime-local"
                  value={dueLocal}
                  onChange={e => setDueLocal(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Reminder</label>
                <select
                  value={channel}
                  onChange={e => setChannel(e.target.value as CrmReminderChannel)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background"
                >
                  {(Object.keys(CRM_REMINDER_CHANNEL_LABEL) as CrmReminderChannel[]).map(c => (
                    <option key={c} value={c}>{CRM_REMINDER_CHANNEL_LABEL[c]}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{CRM_REMINDER_CHANNEL_HELP[channel]}</p>
              </div>
              {channel === 'whatsapp' && (
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">WhatsApp number (E.164)</label>
                  <input
                    value={waPhone}
                    onChange={e => setWaPhone(e.target.value)}
                    placeholder="+358401234567"
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background font-mono"
                  />
                </div>
              )}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background resize-y"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving || profiles.length === 0}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Create task'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Automated email & WhatsApp</p>
            <p>
              <strong>In-app</strong> tasks appear here and on the dashboard — no extra setup.
            </p>
            <p>
              <strong>Email</strong> at due time: deploy the <code className="bg-muted px-1 rounded">task-reminders</code> Edge Function
              in Supabase and set <code className="bg-muted px-1 rounded">RESEND_API_KEY</code> (and sender domain in Resend).
            </p>
            <p>
              <strong>WhatsApp</strong> at due time: Twilio WhatsApp or Meta Cloud API — business verification is usually required.
              Configure Twilio secrets on the function; the app stores the destination number per task.
            </p>
          </div>
        </section>

        {/* List */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-foreground">Open tasks</h2>
            <div className="flex rounded-xl border border-border p-1 bg-muted/50 w-fit">
              {([
                ['assigned_to_me', 'Assigned to me'],
                ['created_by_me', 'I created'],
                ['open_all', 'All open'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    scope === key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border-2 border-dashed border-border text-muted-foreground text-sm">
              No open tasks in this view.
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map(t => (
                <li
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-start gap-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-foreground">{t.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {CRM_TASK_TYPE_LABEL[t.task_type]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {CRM_REMINDER_CHANNEL_LABEL[t.reminder_channel]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground/90">Assignee:</strong> {assigneeName(t.assigned_to)}
                      {' · '}
                      <strong className="text-foreground/90">Due:</strong>{' '}
                      <time dateTime={t.due_at}>{formatActivityWhen(t.due_at)}</time>
                    </p>
                    {t.clients?.name && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Client: </span>
                        <Link
                          to={`/clients/${t.buyer_id}/activity`}
                          className="font-medium text-primary hover:underline"
                        >
                          {t.clients.name}
                        </Link>
                      </p>
                    )}
                    {t.notes && (
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap pt-1">{t.notes}</p>
                    )}
                    {t.reminder_last_error && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                        Reminder error: {t.reminder_last_error}
                      </p>
                    )}
                    {t.reminder_sent_at && (
                      <p className="text-xs text-muted-foreground">
                        Reminder sent: {formatActivityWhen(t.reminder_sent_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleDone(t.id)}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      Mark done
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  );
}
