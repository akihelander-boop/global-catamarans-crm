// ═══════════════════════════════════════════════════════════════
// Global Catamarans CRM — TypeScript Types
// These mirror the Supabase PostgreSQL schema exactly.
// ═══════════════════════════════════════════════════════════════

export type UserRole = 'admin' | 'sales';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

export type CustomerType   = 'private' | 'business';
export type OwnerStatus    = 'yes' | 'no' | 'unknown';
export type IntendedUse    = 'private_cruising' | 'charter' | 'liveaboard' | 'racing' | 'mixed_other';
export type PriceRange     = 'under_300k' | '300k_600k' | '600k_900k' | '900k_1500k' | 'over_1500k' | 'not_sure';
export type Timescale      = '0_3m' | '3_12m' | '12plus_m' | 'researching';
export type ExperienceLevel= 'none' | 'some_charter' | 'previous_owner' | 'professional' | 'other';
export type WeeksUsage     = '0_4w' | '4_8w' | '8_16w' | '16plus_w' | 'not_sure';
export type CashSource     = 'savings' | 'investment_sale' | 'property_sale' | 'business_income' | 'other_mixed';
export type FinancingAttitude = 'not_considering' | 'open' | 'clear_plan' | 'not_sure';
export type CashFlowView   = 'cash_positive' | 'cash_neutral' | 'cash_negative' | 'not_sure';
export type NextStepType   = 'followup_call' | 'video_meeting' | 'inperson_meeting' | 'sea_trial' | 'proposal' | 'info_pack' | 'other';
export type PlanType       = 'nurture' | 'high_priority' | 'wait_trigger' | 'disqualify' | 'other';

export interface Client {
  id: string;

  // Tab 1
  name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  languages: string | null;
  customer_type: CustomerType | null;
  company_name: string | null;
  previous_owner: OwnerStatus | null;
  current_owner: OwnerStatus | null;

  // Tab 2
  goals_overview: string | null;
  target_size_ft: string | null;
  size_notes: string | null;
  preferred_location: string | null;
  intended_use: IntendedUse[] | null;
  target_price_range: PriceRange | null;
  price_notes: string | null;
  preferred_timescale: Timescale | null;
  timescale_notes: string | null;
  experience_level: ExperienceLevel | null;
  experience_details: string | null;
  most_important_features: string | null;
  weeks_per_year_usage: WeeksUsage | null;

  // Tab 3
  potential_score: number | null;
  cash_source: CashSource | null;
  cash_source_notes: string | null;
  financing_attitude: FinancingAttitude | null;
  financing_notes: string | null;
  cash_flow_view: CashFlowView | null;
  ownership_interests: string | null;
  decisions_unresolved: string | null;

  // Tab 4
  internal_notes: string | null;
  next_step_type: NextStepType | null;
  next_step_due_date: string | null;
  agreed_action_notes: string | null;
  plan_type: PlanType | null;
  plan_notes: string | null;
  flag_existing_client: boolean;
  flag_broker_involved: boolean;
  flag_time_sensitive: boolean;

  // Meta
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Partial version used for form state (all optional except name)
export type ClientFormData = Omit<Client, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

/** Activity timeline — maps to `activities` table (buyer = client). */
export type ActivityType =
  | 'call'
  | 'email'
  | 'linkedin'
  | 'whatsapp'
  | 'viewing'
  | 'offer'
  | 'contract'
  | 'website_visit'
  | 'note'
  | 'other';

export interface Activity {
  id: string;
  type: ActivityType;
  note: string | null;
  buyer_id: string;
  boat_id: string | null;
  user_id: string | null;
  /** When the interaction happened (sort key for timeline). */
  occurred_at: string;
  created_at: string;
}

/** Activity with joined client row (global feed queries). */
export interface ActivityWithClient extends Activity {
  clients: { id: string; name: string } | null;
}

/** Assigned CRM tasks / reminders (`crm_tasks` table). */
export type CrmTaskType = 'call' | 'email' | 'message';

/** in_app = dashboard only; email / whatsapp need Edge Function + provider keys. */
export type CrmReminderChannel = 'in_app' | 'email' | 'whatsapp';

export type CrmTaskStatus = 'open' | 'done' | 'cancelled';

export interface CrmTask {
  id: string;
  buyer_id: string | null;
  title: string;
  task_type: CrmTaskType;
  assigned_to: string;
  created_by: string | null;
  due_at: string;
  reminder_channel: CrmReminderChannel;
  /** E.164, e.g. +358401234567 — required in UI when channel is whatsapp. */
  whatsapp_phone_e164: string | null;
  reminder_sent_at: string | null;
  reminder_last_error: string | null;
  status: CrmTaskStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmTaskWithRelations extends CrmTask {
  clients: { id: string; name: string } | null;
}