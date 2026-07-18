import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("habit:create", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "create:habit:title";
  await ctx.reply("What habit do you want to track?");
});

composer.callbackQuery(/^schedule:add:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const schedule = ctx.match![1] as "daily" | "weekdays";
  if (ctx.session.pendingHabit) {
    ctx.session.pendingHabit.scheduleType = schedule;
  }
  ctx.session.step = "create:habit:reminder";
  const hourOptions = [];
  for (let h = 6; h <= 22; h += 2) {
    const label = h <= 12 ? (h === 12 ? "12" : String(h)) + " " + (h < 12 ? "AM" : "PM") : String(h - 12) + " PM";
    hourOptions.push(inlineButton("\u23F0 " + label, "create:reminder:" + h));
  }
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < hourOptions.length; i += 3) {
    rows.push(hourOptions.slice(i, i + 3));
  }
  await ctx.reply("When should I remind you?", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^create:reminder:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const hour = parseInt(ctx.match![1], 10);
  if (ctx.session.pendingHabit) {
    ctx.session.pendingHabit.reminderHour = hour;
    ctx.session.pendingHabit.reminderMinute = 0;
  }
  const habit = ctx.session.pendingHabit;
  if (!habit) return;

  const scheduleLabel = habit.scheduleType === "daily" ? "every day" : "weekdays";
  const hourLabel = hour <= 12 ? (hour === 12 ? "12" : String(hour)) + " " + (hour < 12 ? "AM" : "PM") : String(hour - 12) + " PM";

  ctx.session.step = "create:confirm";
  await ctx.reply(
    "Here\u2019s your new habit:\n\n" +
    "\u{1F4CC} " + habit.title + "\n" +
    "\u{1F4C5} " + scheduleLabel + "\n" +
    "\u23F0 Reminder at " + hourLabel + "\n\n" +
    "Add it?",
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("\u2705 Add", "create:confirm:yes"),
          inlineButton("\u270F\uFE0F Change", "create:confirm:edit"),
        ],
      ]),
    },
  );
});

composer.callbackQuery("create:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const habit = ctx.session.pendingHabit;
  if (!habit) return;

  const habits = ctx.session.habits ?? [];
  habits.push(habit);
  ctx.session.habits = habits;
  ctx.session.pendingHabit = undefined;
  ctx.session.step = undefined;

  await ctx.reply(
    "\u2705 \"" + habit.title + "\" added!\n\nYou now have " + habits.length + " habit" + (habits.length > 1 ? "s" : "") + ".",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("\u2795 Add another", "habit:create")],
        [inlineButton("\u2B05\uFE0F Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("create:confirm:edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "create:habit:title";
  await ctx.reply("What habit do you want to track?");
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;
  if (step === "create:habit:title") {
    const title = ctx.message.text.trim();
    if (title.length < 2) {
      await ctx.reply("That\u2019s too short \u2014 give your habit a real name.");
      return;
    }
    const habitId = "h" + Date.now();
    ctx.session.pendingHabit = {
      id: habitId,
      title: title,
      active: true,
      reminderHour: 9,
      reminderMinute: 0,
      scheduleType: "daily",
      createdAt: new Date().toISOString(),
      milestoneTargets: [7, 14, 30, 90],
    };
    ctx.session.step = "create:habit:schedule";
    await ctx.reply(
      "Nice choice \u2014 \"" + title + "\"!\n\nHow often?",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("\u{1F4C5} Every day", "schedule:add:daily")],
          [inlineButton("\u{1F5D3}\uFE0F Weekdays only", "schedule:add:weekdays")],
        ]),
      },
    );
    return;
  }
  return next();
});

export default composer;
