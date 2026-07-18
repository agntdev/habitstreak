import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "\u{1F4CB} My habits", data: "menu:myhabits", order: 10 });

const composer = new Composer<Ctx>();

function getStreak(habits: NonNullable<Ctx["session"]["habits"]>, records: NonNullable<Ctx["session"]["dayRecords"]>, habitId: string): { current: number; longest: number } {
  const habitRecords = records
    .filter((r) => r.habitId === habitId && r.status === "done")
    .map((r) => r.date)
    .sort()
    .reverse();
  if (habitRecords.length === 0) return { current: 0, longest: 0 };

  let current = 0;
  let longest = 0;
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let checkDate = today;

  for (let i = 0; i < 365; i++) {
    if (habitRecords.includes(checkDate)) {
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

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function completionRate(records: NonNullable<Ctx["session"]["dayRecords"]>, habitId: string): string {
  const done = records.filter((r) => r.habitId === habitId && r.status === "done").length;
  const total = records.filter((r) => r.habitId === habitId).length;
  if (total === 0) return "0%";
  return Math.round((done / total) * 100) + "%";
}

composer.command("myhabits", async (ctx) => {
  await showHabits(ctx);
});

composer.callbackQuery("menu:myhabits", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showHabits(ctx);
});

async function showHabits(ctx: Ctx) {
  const habits = ctx.session.habits ?? [];
  if (habits.length === 0) {
    await ctx.reply("No habits yet \u2014 create one to get started!", {
      reply_markup: inlineKeyboard([
        [inlineButton("\u2795 Create a habit", "habit:create")],
        [inlineButton("\u2B05\uFE0F Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const lines: string[] = ["Your habits:\n"];
  for (const h of habits) {
    const streak = getStreak(ctx.session.habits ?? [], ctx.session.dayRecords ?? [], h.id);
    const rate = completionRate(ctx.session.dayRecords ?? [], h.id);
    const status = h.active ? "\u{1F7E2}" : "\u23F8\uFE0F";
    lines.push(status + " " + h.title);
    lines.push("   \u{1F525} " + streak.current + " day streak \u00B7 " + rate + " completion");
  }

  const buttons: ReturnType<typeof inlineButton>[][] = [];
  for (const h of habits) {
    buttons.push([
      inlineButton(
        (h.active ? "\u23F8\uFE0F" : "\u25B6\uFE0F") + " " + h.title,
        "habit:toggle:" + h.id,
      ),
    ]);
    buttons.push([
      inlineButton("\u270F\uFE0F Edit", "habit:edit:" + h.id),
      inlineButton("\u{1F5D1}\uFE0F Delete", "habit:delete:" + h.id),
    ]);
  }
  buttons.push([inlineButton("\u2795 Add new habit", "habit:create")]);
  buttons.push([inlineButton("\u2B05\uFE0F Back to menu", "menu:main")]);

  await ctx.reply(lines.join("\n"), {
    reply_markup: inlineKeyboard(buttons),
  });
}

composer.callbackQuery(/^habit:toggle:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
  if (!habit) return;
  habit.active = !habit.active;
  const msg = habit.active
    ? "\u25B6\uFE0F \"" + habit.title + "\" is active again."
    : "\u23F8\uFE0F \"" + habit.title + "\" is paused.";
  await ctx.reply(msg, {
    reply_markup: inlineKeyboard([
      [inlineButton("\u2B05\uFE0F Back to habits", "menu:myhabits")],
    ]),
  });
});

composer.callbackQuery(/^habit:edit:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
  if (!habit) return;
  const rh = habit.reminderHour;
  const hourLabel = rh <= 12
    ? (rh === 12 ? "12" : String(rh)) + " " + (rh < 12 ? "AM" : "PM")
    : String(rh - 12) + " PM";
  await ctx.reply(
    "Editing \"" + habit.title + "\"\n\nCurrent: " + habit.scheduleType + ", reminder at " + hourLabel,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("\u270F\uFE0F Change name", "habit:editname:" + habitId)],
        [inlineButton("\u23F0 Change reminder", "habit:editreminder:" + habitId)],
        [inlineButton("\u{1F4C5} Change schedule", "habit:editschedule:" + habitId)],
        [inlineButton("\u2B05\uFE0F Back to habits", "menu:myhabits")],
      ]),
    },
  );
});

composer.callbackQuery(/^habit:delete:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
  if (!habit) return;
  ctx.session.habits = (ctx.session.habits ?? []).filter((h) => h.id !== habitId);
  ctx.session.dayRecords = (ctx.session.dayRecords ?? []).filter((r) => r.habitId !== habitId);
  await ctx.reply("\u{1F5D1}\uFE0F \"" + habit.title + "\" deleted.", {
    reply_markup: inlineKeyboard([
      [inlineButton("\u2B05\uFE0F Back to habits", "menu:myhabits")],
    ]),
  });
});

composer.callbackQuery(/^habit:editname:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  ctx.session.step = "editname:" + habitId;
  await ctx.reply("What should the new name be?");
});

composer.callbackQuery(/^habit:editreminder:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
  if (!habit) return;
  const hourOptions = [];
  for (let h = 6; h <= 22; h += 2) {
    const label = h <= 12 ? (h === 12 ? "12" : String(h)) + " " + (h < 12 ? "AM" : "PM") : String(h - 12) + " PM";
    hourOptions.push(inlineButton("\u23F0 " + label, "reminder:set:" + habitId + ":" + h));
  }
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < hourOptions.length; i += 3) {
    rows.push(hourOptions.slice(i, i + 3));
  }
  await ctx.reply("Pick a new reminder time:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^reminder:set:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  const hour = parseInt(ctx.match![2], 10);
  const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
  if (!habit) return;
  habit.reminderHour = hour;
  habit.reminderMinute = 0;
  const hourLabel = hour <= 12
    ? (hour === 12 ? "12" : String(hour)) + " " + (hour < 12 ? "AM" : "PM")
    : String(hour - 12) + " PM";
  await ctx.reply("\u23F0 Reminder for \"" + habit.title + "\" updated to " + hourLabel + ".", {
    reply_markup: inlineKeyboard([
      [inlineButton("\u2B05\uFE0F Back to habits", "menu:myhabits")],
    ]),
  });
});

composer.callbackQuery(/^habit:editschedule:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
  if (!habit) return;
  await ctx.reply("Change schedule for \"" + habit.title + "\":", {
    reply_markup: inlineKeyboard([
      [inlineButton("\u{1F4C5} Every day", "schedule:set:" + habitId + ":daily")],
      [inlineButton("\u{1F5D3}\uFE0F Weekdays only", "schedule:set:" + habitId + ":weekdays")],
    ]),
  });
});

composer.callbackQuery(/^schedule:set:(.+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match![1];
  const schedule = ctx.match![2] as "daily" | "weekdays";
  const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
  if (!habit) return;
  habit.scheduleType = schedule;
  const label = schedule === "daily" ? "every day" : "weekdays";
  await ctx.reply("\u{1F4C5} \"" + habit.title + "\" set to " + label + ".", {
    reply_markup: inlineKeyboard([
      [inlineButton("\u2B05\uFE0F Back to habits", "menu:myhabits")],
    ]),
  });
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;
  if (step != null && step.startsWith("editname:")) {
    const habitId = step.split(":")[1];
    const habit = (ctx.session.habits ?? []).find((h) => h.id === habitId);
    if (!habit) return next();
    const name = ctx.message.text.trim();
    if (name.length < 2) {
      await ctx.reply("That\u2019s too short \u2014 try a longer name.");
      return;
    }
    habit.title = name;
    ctx.session.step = undefined;
    await ctx.reply("\u270F\uFE0F Renamed to \"" + name + "\".", {
      reply_markup: inlineKeyboard([
        [inlineButton("\u2B05\uFE0F Back to habits", "menu:myhabits")],
      ]),
    });
    return;
  }
  return next();
});

export default composer;
