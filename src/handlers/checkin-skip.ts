import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("checkin:skip", async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session;
  const habits = (session.habits ?? []).filter((h) => h.active);
  if (habits.length === 0) {
    await ctx.reply("No active habits yet.", {
      reply_markup: inlineKeyboard([[inlineButton("\u2B05\uFE0F Back to menu", "menu:main")]]),
    });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const pending = habits.filter(
    (h) => !(session.dayRecords ?? []).some((r) => r.habitId === h.id && r.date === today),
  );
  if (pending.length === 0) {
    await ctx.reply("Nothing to skip \u2014 all habits recorded for today!", {
      reply_markup: inlineKeyboard([[inlineButton("\u2B05\uFE0F Back to menu", "menu:main")]]),
    });
    return;
  }
  const habit = pending[0];
  const records = session.dayRecords ?? [];
  records.push({
    habitId: habit.id,
    date: today,
    status: "skip" as const,
    timestamp: new Date().toISOString(),
  });
  session.dayRecords = records;

  const remaining = habits.filter(
    (h) => !(session.dayRecords ?? []).some((r) => r.habitId === h.id && r.date === today),
  );
  if (remaining.length === 0) {
    await ctx.reply("\u23ED\uFE0F Skipped. All done for today!", {
      reply_markup: inlineKeyboard([[inlineButton("\u2B05\uFE0F Back to menu", "menu:main")]]),
    });
    return;
  }
  const next = remaining[0];
  await ctx.reply("\u23ED\uFE0F Skipped \"" + habit.title + "\".", {
    reply_markup: inlineKeyboard([
      [
        inlineButton("\u2705 Done", "checkin:record:done:" + next.id),
        inlineButton("\u23ED\uFE0F Skip", "checkin:record:skip:" + next.id),
        inlineButton("\u23F0 Later", "checkin:defer:" + next.id),
      ],
    ]),
  });
});

export default composer;
