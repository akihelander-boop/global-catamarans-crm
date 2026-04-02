import { Link } from 'react-router-dom';
import { ACTIVITY_TYPE_LABEL, formatActivityWhen } from '@/lib/activityLabels';
import type { ActivityType, ActivityWithClient, Profile } from '@/types';

function authorLabel(profiles: Map<string, Profile>, userId: string | null) {
  if (!userId) return 'Unknown user';
  const p = profiles.get(userId);
  return p?.full_name || p?.email || `${userId.slice(0, 8)}…`;
}

function notePreview(text: string | null, max = 140) {
  if (!text?.trim()) return null;
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function ActivityFeedList({
  items,
  profiles,
  emptyMessage = 'No logged contact yet. Add activities from a client’s timeline.',
  compact = false,
}: {
  items: ActivityWithClient[];
  profiles: Map<string, Profile>;
  emptyMessage?: string;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  const pad = compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5';

  return (
    <ul className="space-y-0 border border-border rounded-xl overflow-hidden bg-card divide-y divide-border">
      {items.map(a => {
        const type = a.type as ActivityType;
        const clientName = a.clients?.name ?? 'Unknown client';
        const clientId = a.clients?.id ?? a.buyer_id;

        return (
          <li key={a.id} className={`${pad} flex gap-3`}>
            <div
              className="w-1 shrink-0 rounded-full bg-primary/80 self-stretch min-h-[3rem]"
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                  <Link
                    to={`/clients/${clientId}/activity`}
                    className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                  >
                    {clientName}
                  </Link>
                  <span className="text-foreground/90 font-medium">
                    · {ACTIVITY_TYPE_LABEL[type] ?? a.type}
                  </span>
                </div>
                <time
                  className="text-xs text-muted-foreground tabular-nums shrink-0"
                  dateTime={a.occurred_at}
                >
                  {formatActivityWhen(a.occurred_at)}
                </time>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {authorLabel(profiles, a.user_id)}
              </p>
              {notePreview(a.note) && (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-3">
                  {notePreview(a.note)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
