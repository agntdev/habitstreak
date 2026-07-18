import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function getHour(): number {
  return new Date().getHours();
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

composer.on("message", async (ctx, next) => {
  const habits = (ctx.session.habits ?? []).filter((h) => h.active);
  if (habits.length === 0) return next();

  const today = formatDate(new Date());
  const hour = getHour();

  const dueHabits = habits.filter((h) => {
    if (h.reminderHour !== hour) return false;
    const alreadyDone = (ctx.session.dayRecords ?? []).some(
      (r) => r.habitId === h.id && r.date === today,
    );
    return !alreadyDone;
  });

  if (dueHabits.length === 0) return next();

  const lines = ["\u23F0 Time to check in!\n"];
  for (const h of dueHabits) {
    lines.push("\u2022 " + h.title);
  }

  const buttons: ReturnType<typeof inlineButton>[][] = [];
  for (const h of dueHabits) {
    buttons.push([
      inlineButton("\u2705 " + h.title, "checkin:record:done:" + h.id),
      inlineButton("\u23ED\uFE0F Skip", "checkin:record:skip:" + h.id),
    ]);
  }
  buttons.push([inlineButton("\u23F0 Remind me later", "checkin:defer")]);

  await ctx.reply(lines.join("\n"), {
    reply_markup: inlineKeyboard(buttons),
  });

  return next();
});

export default composer;
