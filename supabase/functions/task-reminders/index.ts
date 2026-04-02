/**
 * Supabase Edge Function: send due task reminders (email / WhatsApp).
 *
 * Setup:
 * 1. supabase secrets set CRON_SECRET=random-long-string
 * 2. Optional: RESEND_API_KEY, RESEND_FROM=CRM <onboarding@yourdomain.com>
 * 3. Optional Twilio WhatsApp: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
 * 4. Schedule: Supabase Dashboard → Edge Functions → task-reminders → invoke on a schedule, or pg_cron
 *
 * Invoke manually (test):
 *   curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/task-reminders' \
 *     --header 'Authorization: Bearer <CRON_SECRET>' \
 *     --header 'Content-Type: application/json'
 *
 * WhatsApp: Twilio sandbox or approved WhatsApp Business sender required; Meta Cloud API is an alternative (not implemented here).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type CrmTaskRow = {
  id: string;
  title: string;
  task_type: string;
  assigned_to: string;
  due_at: string;
  reminder_channel: "in_app" | "email" | "whatsapp";
  whatsapp_phone_e164: string | null;
  notes: string | null;
};

type ProfileRow = { id: string; email: string; full_name: string | null };

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!cronSecret || token !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const nowIso = new Date().toISOString();
  const { data: tasks, error: qErr } = await supabase
    .from("crm_tasks")
    .select(
      "id, title, task_type, assigned_to, due_at, reminder_channel, whatsapp_phone_e164, notes",
    )
    .eq("status", "open")
    .is("reminder_sent_at", null)
    .in("reminder_channel", ["email", "whatsapp"])
    .lte("due_at", nowIso);

  if (qErr) {
    console.error("query", qErr);
    return new Response(JSON.stringify({ error: qErr.message }), { status: 500 });
  }

  const rows = (tasks ?? []) as CrmTaskRow[];
  const results: { id: string; ok: boolean; detail?: string }[] = [];

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM") ?? "CRM <onboarding@resend.dev>";

  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

  for (const task of rows) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", task.assigned_to)
      .maybeSingle();

    const profile = prof as ProfileRow | null;

    try {
      if (task.reminder_channel === "email") {
        if (!resendKey) {
          await supabase
            .from("crm_tasks")
            .update({
              reminder_last_error: "RESEND_API_KEY not set on Edge Function",
            })
            .eq("id", task.id);
          results.push({ id: task.id, ok: false, detail: "no_resend" });
          continue;
        }
        if (!profile?.email) {
          await supabase
            .from("crm_tasks")
            .update({ reminder_last_error: "Assignee has no email in profiles" })
            .eq("id", task.id);
          results.push({ id: task.id, ok: false, detail: "no_email" });
          continue;
        }

        const body = {
          from: resendFrom,
          to: [profile.email],
          subject: `[CRM] Reminder: ${task.title}`,
          html: `<p><strong>${task.task_type}</strong> — due ${task.due_at}</p>
            <p>${task.notes ? task.notes.replace(/</g, "&lt;") : ""}</p>
            <p style="color:#666;font-size:12px">Task id: ${task.id}</p>`,
        };

        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!r.ok) {
          const errText = await r.text();
          await supabase
            .from("crm_tasks")
            .update({ reminder_last_error: `Resend: ${errText.slice(0, 500)}` })
            .eq("id", task.id);
          results.push({ id: task.id, ok: false, detail: errText });
          continue;
        }

        await supabase
          .from("crm_tasks")
          .update({ reminder_sent_at: nowIso, reminder_last_error: null })
          .eq("id", task.id);
        results.push({ id: task.id, ok: true });
        continue;
      }

      if (task.reminder_channel === "whatsapp") {
        if (!twilioSid || !twilioToken || !twilioFrom) {
          await supabase
            .from("crm_tasks")
            .update({
              reminder_last_error:
                "Twilio env vars missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)",
            })
            .eq("id", task.id);
          results.push({ id: task.id, ok: false, detail: "no_twilio" });
          continue;
        }
        const to = task.whatsapp_phone_e164?.trim();
        if (!to || !to.startsWith("+")) {
          await supabase
            .from("crm_tasks")
            .update({
              reminder_last_error: "Invalid or missing whatsapp_phone_e164 (E.164)",
            })
            .eq("id", task.id);
          results.push({ id: task.id, ok: false, detail: "bad_phone" });
          continue;
        }

        const msg = `CRM reminder: ${task.title}\nType: ${task.task_type}\nDue: ${task.due_at}${
          task.notes ? `\n${task.notes}` : ""
        }`;

        const form = new URLSearchParams();
        form.set("From", twilioFrom);
        form.set("To", `whatsapp:${to}`);
        form.set("Body", msg);

        const tw = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization:
                "Basic " + btoa(`${twilioSid}:${twilioToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form.toString(),
          },
        );

        if (!tw.ok) {
          const errText = await tw.text();
          await supabase
            .from("crm_tasks")
            .update({ reminder_last_error: `Twilio: ${errText.slice(0, 500)}` })
            .eq("id", task.id);
          results.push({ id: task.id, ok: false, detail: errText });
          continue;
        }

        await supabase
          .from("crm_tasks")
          .update({ reminder_sent_at: nowIso, reminder_last_error: null })
          .eq("id", task.id);
        results.push({ id: task.id, ok: true });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("crm_tasks")
        .update({ reminder_last_error: msg.slice(0, 500) })
        .eq("id", task.id);
      results.push({ id: task.id, ok: false, detail: msg });
    }
  }

  return new Response(
    JSON.stringify({ processed: rows.length, results }),
    { headers: { "Content-Type": "application/json" } },
  );
});
