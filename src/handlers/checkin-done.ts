import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("checkin:done", async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session;
  const habits = (session.habits ?? []).filter((h) => h.active);
  if (habits.length === 0) {
    await ctx.reply("No active habits yet \u2014 tap \ud83d\udccb My habits to create one.", {
      reply_markup: inlineKeyboard([[inlineButton("\u2b05\ufe0f Back to menu", "menu:main")]]),
    });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const pending = habits.filter(
    (h) => !(session.dayRecords ?? []).some((r) => r.habitId === h.id && r.date === today),
  );
  if (pending.length === 0) {
    await ctx.reply("All done for today! \ud83c\udf89", {
      reply_markup: inlineKeyboard([[inlineButton("\u2b05\ufe0f Back to menu", "menu:main")]]),
    });
    return;
  }
  session.pendingReminderHabitIds = pending.map((h) => h.id);
  session.currentHabitIndex = 0;
  const habit = pending[0];
  await ctx.reply(
    "\u2705 Mark \"" + habit.title + "\" as done for today?",
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("\u2705 Done", "checkin:record:done:" + habit.id),
          inlineButton("\u23ed\ufe0f Skip", "checkin:record:skip:" + habit.id),
          inlineButton("\u23f0 Later", "checkin:defer:" + habit.id),
        ],
      ]),
    },
  );
});

composer.callbackQuery(/^checkin:record:(done|skip):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const status = ctx.match![1] as "done" | "skip";
  const habitId = ctx.match![2];
  const session = ctx.session;
  const today = new Date().toISOString().slice(0, 10);

  const existing = (session.dayRecords ?? []).find(
    (r) => r.habitId === habitId && r.date === today,
  );
  if (existing) {
    await ctx.reply("Already recorded for today.", {
      reply_markup: inlineKeyboard([[inlineButton("\u2b05\ufe0f Back to menu", "menu:main")]]),
    });
    return;
  }

  const records = session.dayRecords ?? [];
  records.push({
    habitId: habitId,
    date: today,
    status: status,
    timestamp: new Date().toISOString(),
  });
  session.dayRecords = records;

  const habits = (session.habits ?? []).filter((h) => h.active);
  const pending = habits.filter(
    (h) => !(session.dayRecords ?? []).some((r) => r.habitId === h.id && r.date === today),
  );

  if (pending.length === 0) {
    await ctx.reply("All done for today! \ud83c\udf89", {
      reply_markup: inlineKeyboard([[inlineButton("\u2b05\ufe0f Back to menu", "menu:main")]]),
    });
    return;
  }

  const nextHabit = pending[0];
  const msg = status === "done"
    ? "\u2705 \"" + nextHabit.title + "\" recorded!"
    : "\u23ed\ufe0f Moving on...";
  await ctx.reply(msg, {
    reply_markup: inlineKeyboard([
      [
        inlineButton("\u2705 Done", "checkin:record:done:" + nextHabit.id),
        inlineButton("\u23ed\ufe0f Skip", "checkin:record:skip:" + nextHabit.id),
        inlineButton("\u23f0 Later", "checkin:defer:" + nextHabit.id),
      ],
    ]),
  });
});

composer.callbackQuery(/^checkin:defer:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
  const title = habit != null ? habit.title : "that habit";
  await ctx.reply("\u23f0 Reminder for \"" + title + "\" postponed. I'll check back in a bit.", {
    reply_markup: inlineKeyboard([[inlineButton("\u2b05\ufe0f Back to menu", "menu:main")]]),
  });
});

export default composer;
