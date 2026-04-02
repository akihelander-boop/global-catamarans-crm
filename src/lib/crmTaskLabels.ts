import type { CrmReminderChannel, CrmTaskType } from '@/types';

export const CRM_TASK_TYPE_LABEL: Record<CrmTaskType, string> = {
  call: 'Phone call',
  email: 'Email',
  message: 'Message',
};

export const CRM_REMINDER_CHANNEL_LABEL: Record<CrmReminderChannel, string> = {
  in_app: 'In-app only',
  email: 'Email reminder',
  whatsapp: 'WhatsApp reminder',
};

export const CRM_REMINDER_CHANNEL_HELP: Record<CrmReminderChannel, string> = {
  in_app: 'Shows in CRM (Dashboard + Tasks). No external send.',
  email: 'Sends email at due time if Resend is configured in Supabase Edge Function.',
  whatsapp: 'Sends WhatsApp at due time if Twilio WhatsApp is configured (business setup required).',
};
