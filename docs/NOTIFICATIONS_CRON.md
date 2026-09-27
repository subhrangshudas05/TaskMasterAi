# TaskMaster Web Push & Cron Notifications (Phase 2)

To keep TaskMaster notifications running automatically, you need to configure an external cron service (like cron-job.org, Vercel Cron, or GitHub Actions) to ping the endpoints created in this project.

## Authentication
Both endpoints are protected by a secret token. You must include the following header in your cron requests:
`x-cron-secret: taskmaster_cron_secret_key_2026`

*(Match this to whatever is in your `.env.local` for `CRON_SECRET`)*

---

## 1. Per-Task Reminders & Nudges
This endpoint checks for tasks scheduled around the current time and sends reminders or nudges (+20m, +45m, +2h).

- **Endpoint**: `POST https://yourdomain.com/api/cron/reminders`
- **Schedule**: Every 1 to 5 minutes.
- **Method**: POST
- **Headers**:
  ```
  x-cron-secret: your_secret
  ```

## 2. Daily Digest
This endpoint sends daily scheduled notifications (Morning, Evening, Day Ending, Recap, Tomorrow Planning, Good Night). 
The endpoint automatically detects the correct digest type based on the current IST time if triggered unconditionally.

- **Endpoint**: `POST https://yourdomain.com/api/cron/daily-digest`
- **Method**: POST
- **Headers**:
  ```
  x-cron-secret: your_secret
  ```
- **Schedule**: Trigger this at EXACTLY these times (IST - Asia/Kolkata):
  - 08:00 AM (Morning)
  - 06:00 PM (Evening)
  - 10:00 PM (Day Ending)
  - 11:00 PM (Day Recap)
  - 11:30 PM (Tomorrow Planning)
  - 01:00 AM (Good Night)

*Alternatively*, you can force a specific digest type for manual testing or explicit scheduling by passing the `type` query parameter:
`POST /api/cron/daily-digest?type=morning`

### TODOs for Phase 2:
- The exact copy for the `6:00 PM` and `11:30 PM` notifications are pending finalization. Update the `/api/cron/daily-digest/route.ts` once the copy is provided.
