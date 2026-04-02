import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';

/** Placeholder for future team / user management (admin). */
export default function Team() {
  const { isAdmin, profile } = useAuth();

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-foreground mb-2">Team</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Internal directory and roles will appear here in a future update.
        </p>
        {!isAdmin ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            You need admin access to manage team settings.
          </p>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-foreground">
              Signed in as <strong>{profile?.full_name ?? profile?.email ?? '—'}</strong>
              {profile?.role && (
                <span className="text-muted-foreground"> · {profile.role}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
