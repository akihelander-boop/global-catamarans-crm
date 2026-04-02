import type { ActivityType } from '@/types';

/** Human-readable labels for activity types (timeline + dashboard feed). */
export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  call: 'Phone call',
  email: 'Email',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  viewing: 'Viewing',
  offer: 'Offer',
  contract: 'Contract',
  website_visit: 'Website visit',
  note: 'Note',
  other: 'Other',
};

export const ACTIVITY_TYPE_ORDER: ActivityType[] = [
  'call', 'email', 'linkedin', 'whatsapp',
  'viewing', 'offer', 'contract',
  'website_visit', 'note', 'other',
];

export function formatActivityWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}
