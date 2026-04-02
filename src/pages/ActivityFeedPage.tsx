// ═══════════════════════════════════════════════════════════════
// Global activity feed — all team contact across clients
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ActivityFeedList from '@/components/ActivityFeedList';
import { getProfilesByIds, listRecentActivitiesGlobal } from '@/lib/supabaseClient';
import type { ActivityWithClient, Profile } from '@/types';

const FEED_LIMIT = 150;

export default function ActivityFeedPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityWithClient[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listRecentActivitiesGlobal(FEED_LIMIT);
    setItems(rows);
    const authorIds = rows.map(r => r.user_id).filter((x): x is string => !!x);
    const profs = await getProfilesByIds(authorIds);
    setProfiles(new Map(profs.map(p => [p.id, p])));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0"
              aria-label="Back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                CRM
              </p>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                All client activity
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                Recent calls, messages, meetings and notes across every client — newest first.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading activity…</div>
        ) : (
          <ActivityFeedList items={items} profiles={profiles} compact={false} />
        )}
      </div>
    </Layout>
  );
}
