// ═══════════════════════════════════════════════════════════════
// ClientForm — 4-tab intake form (create + edit)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClient, createClient_, updateClient,
} from '@/lib/supabaseClient';
import type {
  CashFlowView,
  CashSource,
  CustomerType,
  ClientFormData,
  ExperienceLevel,
  FinancingAttitude,
  IntendedUse,
  NextStepType,
  OwnerStatus,
  PlanType,
  PriceRange,
  Timescale,
  WeeksUsage,
} from '@/types';
import Layout from '@/components/Layout';

// ── Default empty form state ─────────────────────────────────────
const EMPTY: ClientFormData = {
  name: '',
  email: null, phone: null, nationality: null, languages: null,
  customer_type: null, company_name: null,
  previous_owner: null, current_owner: null,
  goals_overview: null, target_size_ft: null, size_notes: null,
  preferred_location: null, intended_use: [],
  target_price_range: null, price_notes: null,
  preferred_timescale: null, timescale_notes: null,
  experience_level: null, experience_details: null,
  most_important_features: null, weeks_per_year_usage: null,
  potential_score: null, cash_source: null, cash_source_notes: null,
  financing_attitude: null, financing_notes: null, cash_flow_view: null,
  ownership_interests: null, decisions_unresolved: null,
  internal_notes: null, next_step_type: null, next_step_due_date: null,
  agreed_action_notes: null, plan_type: null, plan_notes: null,
  flag_existing_client: false, flag_broker_involved: false, flag_time_sensitive: false,
};

const TABS = [
  { id: 'contact',  label: 'Client & Contact' },
  { id: 'goals',    label: 'Goals & Usage' },
  { id: 'finance',  label: 'Financial Profile' },
  { id: 'internal', label: 'Internal Notes' },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Small reusable field components ──────────────────────────────
function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-foreground">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = `w-full px-3.5 py-2.5 rounded-lg border border-border text-sm bg-card
  focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition`;

const selectCls = inputCls + ' appearance-none';

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls + (props.className ? ' ' + props.className : '')} />;
}

function Sel({
  value, onChange, children, placeholder,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={selectCls}
      >
        <option value="">{placeholder ?? '— select —'}</option>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  );
}

function Txt(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={inputCls + ' resize-y min-h-[80px]' + (props.className ? ' ' + props.className : '')}
    />
  );
}

function SubSection({ title }: { title: string }) {
  return (
    <div className="pt-2 pb-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">
        {title}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════
export default function ClientForm() {
  const { id }     = useParams<{ id?: string }>();
  const navigate   = useNavigate();
  const isNew      = !id || id === 'new';

  const [form,      setForm]      = useState<ClientFormData>(EMPTY);
  const [tab,       setTab]       = useState<TabId>('contact');
  const [loading,   setLoading]   = useState(!isNew);
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  // Load existing client
  useEffect(() => {
    if (isNew) return;
    (async () => {
      const data = await getClient(id!);
      if (data) {
        const { id, created_at, updated_at, created_by, ...rest } = data;
        void id;
        void created_at;
        void updated_at;
        void created_by;
        setForm({ ...EMPTY, ...rest });
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  // Generic setter helpers
  const set = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const str  = (key: keyof ClientFormData) => (form[key] as string | null) ?? '';
  const bool = (key: keyof ClientFormData) => !!(form[key]);

  const toggleUse = (val: IntendedUse) => {
    const cur = form.intended_use ?? [];
    set('intended_use', cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]);
  };

  // Validation
  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Jump to first tab with errors
      if (errors.name || errors.email) setTab('contact');
      return;
    }
    setShowConfirm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setShowConfirm(false);
    let saved;
    if (isNew) {
      saved = await createClient_({ ...form, name: form.name.trim() });
    } else {
      saved = await updateClient(id!, form);
    }
    setSaving(false);
    if (saved) navigate('/');
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground text-sm">Loading client…</div>
      </Layout>
    );
  }

  const tabCls = (t: TabId) =>
    `flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition-all text-center
    ${tab === t
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:text-primary hover:bg-secondary'}`;

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isNew ? 'New client' : form.name || 'Edit client'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNew ? 'Create a new intake record' : 'Update client record'}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tabCls(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>

          {/* ══════════════════════════════════════════════
              TAB 1 · CLIENT & CONTACT
          ══════════════════════════════════════════════ */}
          {tab === 'contact' && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
              {/* Name */}
              <Field label="Name" required>
                <Inp
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Full name of the primary client"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Email">
                  <Inp
                    type="email"
                    value={str('email')}
                    onChange={e => set('email', e.target.value || null)}
                    placeholder="Client email address"
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </Field>

                <Field label="Phone number">
                  <Inp
                    value={str('phone')}
                    onChange={e => set('phone', e.target.value || null)}
                    placeholder="Phone with country code"
                  />
                </Field>

                <Field label="Nationality">
                  <Inp
                    value={str('nationality')}
                    onChange={e => set('nationality', e.target.value || null)}
                    placeholder="Client nationality"
                  />
                </Field>

                <Field label="Languages">
                  <Inp
                    value={str('languages')}
                    onChange={e => set('languages', e.target.value || null)}
                    placeholder="Languages client is comfortable using"
                  />
                </Field>

                <Field label="Customer type">
                  <Sel
                    value={form.customer_type ?? ''}
                    onChange={v => set('customer_type', (v || null) as CustomerType | null)}
                    placeholder="Select type"
                  >
                    <option value="private">Private</option>
                    <option value="business">Business</option>
                  </Sel>
                </Field>

                <Field
                  label="Company name"
                  hint={form.customer_type !== 'business' ? 'Relevant if customer type is Business' : undefined}
                >
                  <Inp
                    value={str('company_name')}
                    onChange={e => set('company_name', e.target.value || null)}
                    placeholder="Company or organisation name"
                    className={form.customer_type === 'business' ? 'border-primary ring-1 ring-ring/20' : ''}
                  />
                </Field>

                <Field label="Previous catamaran owner?">
                  <Sel
                    value={form.previous_owner ?? ''}
                    onChange={v => set('previous_owner', (v || null) as OwnerStatus | null)}
                    placeholder="Has the client owned one before?"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unknown">Unknown</option>
                  </Sel>
                </Field>

                <Field label="Current catamaran owner?">
                  <Sel
                    value={form.current_owner ?? ''}
                    onChange={v => set('current_owner', (v || null) as OwnerStatus | null)}
                    placeholder="Does the client currently own one?"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unknown">Unknown</option>
                  </Sel>
                </Field>
              </div>

              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setTab('goals')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                  Next: Goals & Usage
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 2 · GOALS & USAGE
          ══════════════════════════════════════════════ */}
          {tab === 'goals' && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">

              <Field label="Overview of catamaran goals">
                <Txt
                  value={str('goals_overview')}
                  onChange={e => set('goals_overview', e.target.value || null)}
                  placeholder="Describe the client's overall catamaran goals in your own words"
                  className="min-h-[100px]"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Target boat size (ft)">
                  <Sel
                    value={form.target_size_ft ?? ''}
                    onChange={v => set('target_size_ft', v || null)}
                    placeholder="Select approximate size"
                  >
                    {['30','35','40','45','50','60','70','80'].map(s =>
                      <option key={s} value={s}>{s} ft</option>
                    )}
                    <option value="other">Other / not sure</option>
                  </Sel>
                </Field>

                <Field label="Preferred location / region">
                  <Inp
                    value={str('preferred_location')}
                    onChange={e => set('preferred_location', e.target.value || null)}
                    placeholder="Home port or cruising region"
                  />
                </Field>
              </div>

              <Field label="Size notes">
                <Txt
                  value={str('size_notes')}
                  onChange={e => set('size_notes', e.target.value || null)}
                  placeholder="Any notes about size preferences or flexibility"
                />
              </Field>

              <Field label="Intended use" hint="Select all that apply">
                <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-1">
                  {([
                    ['private_cruising', 'Private cruising'],
                    ['charter',          'Charter'],
                    ['liveaboard',       'Liveaboard'],
                    ['racing',           'Racing'],
                    ['mixed_other',      'Mixed / other'],
                  ] as [IntendedUse, string][]).map(([val, lbl]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={(form.intended_use ?? []).includes(val)}
                        onChange={() => toggleUse(val)}
                        className="w-4 h-4 accent-primary rounded"
                      />
                      {lbl}
                    </label>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Target price range">
                  <Sel
                    value={form.target_price_range ?? ''}
                    onChange={v => set('target_price_range', (v || null) as PriceRange | null)}
                    placeholder="Approximate budget"
                  >
                    <option value="under_300k">Under 300k</option>
                    <option value="300k_600k">300k – 600k</option>
                    <option value="600k_900k">600k – 900k</option>
                    <option value="900k_1500k">900k – 1.5M</option>
                    <option value="over_1500k">Over 1.5M</option>
                    <option value="not_sure">Not sure</option>
                  </Sel>
                </Field>

                <Field label="Preferred timescale">
                  <Sel
                    value={form.preferred_timescale ?? ''}
                    onChange={v => set('preferred_timescale', (v || null) as Timescale | null)}
                    placeholder="When does the client want this?"
                  >
                    <option value="0_3m">0 – 3 months</option>
                    <option value="3_12m">3 – 12 months</option>
                    <option value="12plus_m">12+ months</option>
                    <option value="researching">Just researching</option>
                  </Sel>
                </Field>
              </div>

              <Field label="Price notes">
                <Txt
                  value={str('price_notes')}
                  onChange={e => set('price_notes', e.target.value || null)}
                  placeholder="Any comments on budget and flexibility"
                />
              </Field>

              <Field label="Timescale notes">
                <Txt
                  value={str('timescale_notes')}
                  onChange={e => set('timescale_notes', e.target.value || null)}
                  placeholder="Special timing constraints or dependencies"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Experience with catamarans">
                  <Sel
                    value={form.experience_level ?? ''}
                    onChange={v => set('experience_level', (v || null) as ExperienceLevel | null)}
                    placeholder="Client's experience level"
                  >
                    <option value="none">None</option>
                    <option value="some_charter">Some charter experience</option>
                    <option value="previous_owner">Previous owner</option>
                    <option value="professional">Professional / industry</option>
                    <option value="other">Other</option>
                  </Sel>
                </Field>

                <Field label="Estimated usage per year">
                  <Sel
                    value={form.weeks_per_year_usage ?? ''}
                    onChange={v => set('weeks_per_year_usage', (v || null) as WeeksUsage | null)}
                    placeholder="Estimated weeks per year"
                  >
                    <option value="0_4w">0 – 4 weeks</option>
                    <option value="4_8w">4 – 8 weeks</option>
                    <option value="8_16w">8 – 16 weeks</option>
                    <option value="16plus_w">16+ weeks</option>
                    <option value="not_sure">Not sure</option>
                  </Sel>
                </Field>
              </div>

              <Field label="Experience details">
                <Txt
                  value={str('experience_details')}
                  onChange={e => set('experience_details', e.target.value || null)}
                  placeholder="Ownership history, charter time, other relevant experience"
                />
              </Field>

              <Field label="Most important features">
                <Txt
                  value={str('most_important_features')}
                  onChange={e => set('most_important_features', e.target.value || null)}
                  placeholder="List the 3–5 most important features and why they matter"
                  className="min-h-[100px]"
                />
              </Field>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setTab('contact')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  Back
                </button>
                <button type="button" onClick={() => setTab('finance')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                  Next: Financial
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 3 · FINANCIAL PROFILE
          ══════════════════════════════════════════════ */}
          {tab === 'finance' && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Potential score (internal)" hint="1 = low · 5 = very high">
                  <Sel
                    value={form.potential_score != null ? String(form.potential_score) : ''}
                    onChange={v => set('potential_score', v ? Number(v) : null)}
                    placeholder="Select score"
                  >
                    <option value="1">1 — Low</option>
                    <option value="2">2 — Below average</option>
                    <option value="3">3 — Average</option>
                    <option value="4">4 — High</option>
                    <option value="5">5 — Very high</option>
                  </Sel>
                </Field>

                <Field label="Cash flow view of the boat">
                  <Sel
                    value={form.cash_flow_view ?? ''}
                    onChange={v => set('cash_flow_view', (v || null) as CashFlowView | null)}
                    placeholder="How does the client view cash flow?"
                  >
                    <option value="cash_positive">Expect cash positive</option>
                    <option value="cash_neutral">Expect cash neutral</option>
                    <option value="cash_negative">Expect cash negative</option>
                    <option value="not_sure">Not sure / not a priority</option>
                  </Sel>
                </Field>

                <Field label="Source of cash portion">
                  <Sel
                    value={form.cash_source ?? ''}
                    onChange={v => set('cash_source', (v || null) as CashSource | null)}
                    placeholder="Main source of cash portion"
                  >
                    <option value="savings">Savings</option>
                    <option value="investment_sale">Investment sale</option>
                    <option value="property_sale">Property sale</option>
                    <option value="business_income">Business income</option>
                    <option value="other_mixed">Other / mixed</option>
                  </Sel>
                </Field>

                <Field label="Financing and leveraging assets">
                  <Sel
                    value={form.financing_attitude ?? ''}
                    onChange={v => set('financing_attitude', (v || null) as FinancingAttitude | null)}
                    placeholder="Attitude towards financing"
                  >
                    <option value="not_considering">Not considering financing</option>
                    <option value="open">Open to financing</option>
                    <option value="clear_plan">Has clear financing plan</option>
                    <option value="not_sure">Not sure yet</option>
                  </Sel>
                </Field>
              </div>

              <Field label="Cash source notes">
                <Txt
                  value={str('cash_source_notes')}
                  onChange={e => set('cash_source_notes', e.target.value || null)}
                  placeholder="Clarify details about funds and timing"
                />
              </Field>

              <Field label="Financing notes">
                <Txt
                  value={str('financing_notes')}
                  onChange={e => set('financing_notes', e.target.value || null)}
                  placeholder="Specific financing ideas or assets to be leveraged"
                />
              </Field>

              <Field label="Catamarans and ownership models of interest">
                <Txt
                  value={str('ownership_interests')}
                  onChange={e => set('ownership_interests', e.target.value || null)}
                  placeholder="Brands, models and ownership structures that interest the client"
                  className="min-h-[100px]"
                />
              </Field>

              <Field label="Main decisions still unresolved">
                <Txt
                  value={str('decisions_unresolved')}
                  onChange={e => set('decisions_unresolved', e.target.value || null)}
                  placeholder="Key decisions still unresolved (new vs pre-owned, size, brand…)"
                  className="min-h-[100px]"
                />
              </Field>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setTab('goals')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  Back
                </button>
                <button type="button" onClick={() => setTab('internal')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                  Next: Internal Notes
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 4 · INTERNAL NOTES & ACTIONS
          ══════════════════════════════════════════════ */}
          {tab === 'internal' && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">

              {/* Internal only banner */}
              <div className="px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                🔒 This section is internal only — not visible to clients
              </div>

              <Field label="Internal notes">
                <Txt
                  value={str('internal_notes')}
                  onChange={e => set('internal_notes', e.target.value || null)}
                  placeholder="Internal observations not shared with the client"
                  className="min-h-[100px]"
                />
              </Field>

              {/* Agreed action */}
              <SubSection title="Agreed action with client" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Next step type">
                  <Sel
                    value={form.next_step_type ?? ''}
                    onChange={v => set('next_step_type', (v || null) as NextStepType | null)}
                    placeholder="Select next step"
                  >
                    <option value="followup_call">Follow-up call</option>
                    <option value="video_meeting">Video meeting</option>
                    <option value="inperson_meeting">In-person meeting</option>
                    <option value="sea_trial">Sea trial</option>
                    <option value="proposal">Proposal</option>
                    <option value="info_pack">Send information pack</option>
                    <option value="other">Other</option>
                  </Sel>
                </Field>

                <Field label="Next step due date">
                  <Inp
                    type="date"
                    value={str('next_step_due_date')}
                    onChange={e => set('next_step_due_date', e.target.value || null)}
                  />
                </Field>
              </div>

              <Field label="Agreed action notes">
                <Txt
                  value={str('agreed_action_notes')}
                  onChange={e => set('agreed_action_notes', e.target.value || null)}
                  placeholder="Summary of what was agreed with the client"
                />
              </Field>

              {/* Plan of action */}
              <SubSection title="Plan of action (internal)" />

              <Field label="Plan type">
                <Sel
                  value={form.plan_type ?? ''}
                  onChange={v => set('plan_type', (v || null) as PlanType | null)}
                  placeholder="Select plan type"
                >
                  <option value="nurture">Nurture</option>
                  <option value="high_priority">High-priority pursuit</option>
                  <option value="wait_trigger">Wait for client trigger</option>
                  <option value="disqualify">Disqualify / park</option>
                  <option value="other">Other</option>
                </Sel>
              </Field>

              <Field label="Plan notes">
                <Txt
                  value={str('plan_notes')}
                  onChange={e => set('plan_notes', e.target.value || null)}
                  placeholder="Internal plan to move this opportunity forward"
                  className="min-h-[100px]"
                />
              </Field>

              {/* Internal flags */}
              <SubSection title="Internal flags" />

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {([
                    ['flag_existing_client', 'Existing Global Catamarans client'],
                    ['flag_broker_involved', 'Broker involved'],
                    ['flag_time_sensitive',  'Time-sensitive opportunity'],
                  ] as [keyof ClientFormData, string][]).map(([key, lbl]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={bool(key)}
                        onChange={e => set(key, e.target.checked as ClientFormData[typeof key])}
                        className="w-4 h-4 accent-primary rounded"
                      />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setTab('finance')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  Back
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90
                             text-primary-foreground text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M5 13l4 4L19 7"/>
                      </svg>
                      {isNew ? 'Create client' : 'Save changes'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </form>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm border border-border">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 className="font-bold text-foreground mb-2">
              {isNew ? 'Create client?' : 'Save changes?'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isNew
                ? `This will create a new client record for "${form.name}".`
                : `This will update the record for "${form.name}". Changes are saved immediately.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Review again
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
              >
                {isNew ? 'Create client' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}