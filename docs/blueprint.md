# HabitStreak — Bot specification

**Archetype:** workflow

**Voice:** professional and encouraging — write every user-facing message, button label, error, and empty state in this voice.

Private habit-tracking Telegram bot with scheduled reminders, one-tap check-ins, streak tracking, and weekly recaps. Focuses on unobtrusive encouragement, timezone-aware scheduling, and single-tap interactions. All data is per-user and private by default.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individuals seeking habit formation support
- privacy-conscious users
- minimalist productivity enthusiasts

## Success criteria

- User maintains consistent check-in rate >80% over 30 days
- Weekly recap delivery with accurate stats
- No double-counting of check-ins in 90-day period

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Launch onboarding wizard or main menu
- **/myhabits** (command, actor: user, command: /myhabits) — View active habits and stats
- **Done** (button, actor: user, callback: checkin:done) — Mark habit as completed for the day
- **Skip** (button, actor: user, callback: checkin:skip) — Mark habit as skipped for the day
- **Remind me later** (button, actor: user, callback: checkin:defer) — Postpone reminder by 30m or 2h

## Flows

### onboarding
_Trigger:_ /start

1. Welcome message
2. Timezone detection/prompt
3. Habit creation wizard
4. Reminder time selection
5. Confirmation of first habit

_Data touched:_ User, Habit

### daily_reminder
_Trigger:_ scheduled event

1. Send reminder with check-in buttons
2. Handle multi-habit batch reminders
3. Prevent duplicate check-ins

_Data touched:_ DayRecord, Habit

### weekly_recap
_Trigger:_ scheduled event

1. Generate week calendar visualization
2. Calculate completion rates
3. Highlight milestones
4. Send summary with optional export button

_Data touched:_ Stats, DayRecord

### manual_edit
_Trigger:_ /myhabits

1. Display habit list with stats
2. Edit schedule/time
3. Pause/unpause habit
4. Backdate check-ins
5. Delete habit

_Data touched:_ Habit, DayRecord

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user profile with preferences
  - fields: telegram_id, timezone, language, reminder_hour, weekly_recap_day, opt_in_milestones
- **Habit** _(retention: persistent)_ — User-defined habit with scheduling rules
  - fields: id, title, schedule_type, active, reminder_hour, milestone_targets
- **DayRecord** _(retention: persistent)_ — Daily check-in status for a habit
  - fields: habit_id, date, status, timestamp, source
- **Stats** _(retention: persistent)_ — Derived habit performance metrics
  - fields: habit_id, current_streak, longest_streak, completion_rate

## Integrations

- **Telegram** (required) — Bot API messaging and payments
- **CSV Export** (optional) — Data export on demand
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Create/edit/delete habits
- Adjust reminder times
- Pause/unpause habits
- Export data as CSV
- Configure weekly recap timing
- Toggle milestone notifications

## Notifications

- Daily check-in reminders
- Weekly recap
- Milestone celebrations (7/14/30/90 days)
- Reminder deferral follow-ups

## Permissions & privacy

- All data private by default
- No group sharing without explicit opt-in
- User controls data export
- No third-party data sharing

## Edge cases

- Time zone changes mid-streak
- Missed check-ins during travel
- Multiple habits due at same time
- Reminder deferral across midnight boundary

## Required tests

- End-to-end onboarding flow with habit creation
- Multi-habit batch reminder handling
- Weekly recap generation with accurate stats
- Double-check-in prevention across 24h period
- Timezone-aware reminder scheduling

## Assumptions

- Telegram's scheduled message delivery is reliable
- Users will manually adjust reminders after DST changes
- CSV export will use Telegram file API
