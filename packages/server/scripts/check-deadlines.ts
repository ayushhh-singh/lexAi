/**
 * Cron job: Check case deadlines and create notifications.
 *
 * Run daily via cron or scheduler:
 *   npx tsx packages/server/scripts/check-deadlines.ts
 *
 * Checks all non-completed deadlines and creates notifications for:
 * - Overdue deadlines (missed)
 * - Deadlines within reminder_days thresholds (default: 7, 3, 1 days)
 *
 * Deduplicates by (deadline_id, notification_type, days_until_deadline)
 * so re-running the same day won't create duplicate alerts.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Deadline {
  id: string;
  case_matter_id: string;
  user_id: string;
  title: string;
  deadline_date: string;
  deadline_type: string;
  reminder_days: number[];
  is_completed: boolean;
}

interface ExistingNotification {
  deadline_id: string;
  notification_type: string;
  days_until_deadline: number;
}

async function main() {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  console.log(`[check-deadlines] Running at ${now.toISOString()}`);

  // Fetch non-completed deadlines (capped at 5000 to prevent unbounded queries)
  const { data: deadlines, error: dlErr } = await supabase
    .from("case_deadlines")
    .select("id, case_matter_id, user_id, title, deadline_date, deadline_type, reminder_days, is_completed")
    .eq("is_completed", false)
    .limit(5000);

  if (dlErr) {
    console.error("Failed to fetch deadlines:", dlErr.message);
    process.exit(1);
  }

  if (!deadlines || deadlines.length === 0) {
    console.log("[check-deadlines] No active deadlines found.");
    process.exit(0);
  }

  console.log(`[check-deadlines] Found ${deadlines.length} active deadlines.`);

  // Fetch today's existing notifications to avoid duplicates
  const startOfDay = `${todayStr}T00:00:00.000Z`;
  const endOfDay = `${todayStr}T23:59:59.999Z`;

  const { data: existingNotifs } = await supabase
    .from("deadline_notifications")
    .select("deadline_id, notification_type, days_until_deadline")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay);

  const existingSet = new Set(
    (existingNotifs ?? []).map(
      (n: ExistingNotification) => `${n.deadline_id}:${n.notification_type}:${n.days_until_deadline}`
    )
  );

  const notifications: Array<{
    user_id: string;
    case_matter_id: string;
    deadline_id: string;
    title: string;
    message: string;
    notification_type: string;
    days_until_deadline: number;
  }> = [];

  for (const dl of deadlines as Deadline[]) {
    const deadlineDate = new Date(dl.deadline_date);
    const daysUntil = Math.ceil(
      (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check overdue
    if (daysUntil < 0) {
      const key = `${dl.id}:overdue:${daysUntil}`;
      if (!existingSet.has(key)) {
        notifications.push({
          user_id: dl.user_id,
          case_matter_id: dl.case_matter_id,
          deadline_id: dl.id,
          title: `Overdue: ${dl.title}`,
          message: `Deadline "${dl.title}" (${dl.deadline_type}) was due on ${deadlineDate.toLocaleDateString("en-IN")} and is now ${Math.abs(daysUntil)} day(s) overdue.`,
          notification_type: "overdue",
          days_until_deadline: daysUntil,
        });
      }
      continue;
    }

    // Check reminder thresholds
    const reminderDays = dl.reminder_days?.length > 0 ? dl.reminder_days : [7, 3, 1];

    for (const threshold of reminderDays) {
      if (daysUntil <= threshold) {
        const notifType = daysUntil === 0 ? "upcoming" : "reminder";
        const key = `${dl.id}:${notifType}:${daysUntil}`;

        if (!existingSet.has(key)) {
          const message =
            daysUntil === 0
              ? `Deadline "${dl.title}" (${dl.deadline_type}) is DUE TODAY.`
              : `Deadline "${dl.title}" (${dl.deadline_type}) is due in ${daysUntil} day(s) on ${deadlineDate.toLocaleDateString("en-IN")}.`;

          notifications.push({
            user_id: dl.user_id,
            case_matter_id: dl.case_matter_id,
            deadline_id: dl.id,
            title: daysUntil === 0 ? `Due Today: ${dl.title}` : `Reminder: ${dl.title}`,
            message,
            notification_type: notifType,
            days_until_deadline: daysUntil,
          });

          // Only one notification per deadline per run (use the closest threshold)
          break;
        }
      }
    }
  }

  if (notifications.length === 0) {
    console.log("[check-deadlines] No new notifications to create.");
    process.exit(0);
  }

  // Batch insert
  const { error: insertErr } = await supabase
    .from("deadline_notifications")
    .insert(notifications);

  if (insertErr) {
    console.error("Failed to insert notifications:", insertErr.message);
    process.exit(1);
  }

  console.log(`[check-deadlines] Created ${notifications.length} notification(s).`);
  for (const n of notifications) {
    console.log(`  - [${n.notification_type}] ${n.title} (${n.days_until_deadline}d)`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
