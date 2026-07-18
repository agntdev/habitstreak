import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";

registerMainMenuItem({ label: "\u{1F4CA} Weekly recap", data: "recap:show", order: 30 });

const composer = new Composer<Ctx>();

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getStreak(
  records: NonNullable<Ctx["session"]["dayRecords"]>,
  habitId: string,
): { current: number; longest: number } {
  const doneDates = records
    .filter((r) => r.habitId === habitId && r.status === "done")
    .map((r) => r.date)
    .sort()
    .reverse();
  if (doneDates.length === 0) return { current: 0, longest: 0 };

  let current = 0;
  let longest = 0;
  let streak = 0;
  const today = formatDate(new Date());
  let checkDate = today;

  for (let i = 0; i < 365; i++) {
    if (doneDates.includes(checkDate)) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      if (i === 0) {
        checkDate = shiftDate(checkDate, -1);
        continue;
      }
      if (streak > 0 && current === 0) current = streak;
      streak = 0;
    }
    checkDate = shiftDate(checkDate, -1);
  }
  if (streak > 0 && current === 0) current = streak;
  return { current, longest };
}

function completionRate(records: NonNullable<Ctx["session"]["dayRecords"]>, habitId: string): string {
  const done = records.filter((r) => r.habitId === habitId && r.status === "done").length;
  const total = records.filter((r) => r.habitId === habitId).length;
  if (total === 0) return "0%";
  return Math.round((done / total) * 100) + "%";
}

function weekCalendar(
  records: NonNullable<Ctx["session"]["dayRecords"]>,
  habitId: string,
): string {
  const today = formatDate(new Date());
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = shiftDate(today, -i);
    const hasRecord = records.some((r) => r.habitId === habitId && r.date === date);
    const isDone = records.some(
      (r) => r.habitId === habitId && r.date === date && r.status === "done",
    );
    days.push(isDone ? "\u2705" : hasRecord ? "\u23ED\uFE0F" : "\u2B1C");
  }
  return days.join(" ");
}

composer.callbackQuery("recap:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const habits = ctx.session.habits ?? [];
  const records = ctx.session.dayRecords ?? [];

  if (habits.length === 0) {
    await ctx.reply("No habits to recap \u2014 create one first!", {
      reply_markup: inlineKeyboard([
        [inlineButton("\u2795 Create a habit", "habit:create")],
        [inlineButton("\u2B05\uFE0F Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const lines = ["\u{1F4CA} Weekly Recap\n"];
  for (const h of habits) {
    const streak = getStreak(records, h.id);
    const rate = completionRate(records, h.id);
    const cal = weekCalendar(records, h.id);
    lines.push("\u{1F4CC} " + h.title);
    lines.push("   " + cal);
    lines.push("   \u{1F525} " + streak.current + " day streak \u00B7 " + rate + " completion");
    lines.push("");
  }

  lines.push("Keep it up \u2014 consistency is everything!");

  await ctx.reply(lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("\u2B05\uFE0F Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
