import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
  mainMenuKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "✅ Check in", data: "checkin:start", order: 20 });

const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome to HabitStreak! I'll help you build good habits one day at a time.\n\nLet's get you set up — what's your timezone?";
const TIMEZONE_PROMPT = "Pick your timezone:";

const TIMEZONES = [
  { label: "🌎 New York (EST)", data: "tz:America/New_York" },
  { label: "🌎 Los Angeles (PST)", data: "tz:America/Los_Angeles" },
  { label: "🌎 Chicago (CST)", data: "tz:America/Chicago" },
  { label: "🌍 London (GMT)", data: "tz:Europe/London" },
  { label: "🌍 Paris (CET)", data: "tz:Europe/Paris" },
  { label: "🌍 Berlin (CET)", data: "tz:Europe/Berlin" },
  { label: "🌏 Tokyo (JST)", data: "tz:Asia/Tokyo" },
  { label: "🌏 Shanghai (CST)", data: "tz:Asia/Shanghai" },
  { label: "🌏 Sydney (AEST)", data: "tz:Australia/Sydney" },
  { label: "🌏 Dubai (GST)", data: "tz:Asia/Dubai" },
];

function tzKeyboard() {
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < TIMEZONES.length; i += 2) {
    const row: ReturnType<typeof inlineButton>[] = [
      inlineButton(TIMEZONES[i].label, TIMEZONES[i].data),
    ];
    if (TIMEZONES[i + 1]) {
      row.push(inlineButton(TIMEZONES[i + 1].label, TIMEZONES[i + 1].data));
    }
    rows.push(row);
  }
  rows.push([inlineButton("Other (type it below)", "tz:other")]);
  return inlineKeyboard(rows);
}

composer.command("start", async (ctx) => {
  const session = ctx.session;
  const hasHabits = (session.habits ?? []).length > 0;
  if (hasHabits) {
    await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
    return;
  }
  session.step = "onboarding:timezone";
  await ctx.reply(WELCOME + "\n\n" + TIMEZONE_PROMPT, {
    reply_markup: tzKeyboard(),
  });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery(/^tz:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const tz = ctx.match![1];
  if (tz === "other") {
    ctx.session.step = "onboarding:timezone:text";
    await ctx.editMessageText(
      "Type your timezone (e.g. America/Sao_Paulo):\n\nCommon ones: America/New_York, Europe/London, Asia/Tokyo",
    );
    return;
  }
  ctx.session.timezone = tz;
  ctx.session.step = "onboarding:habit:title";
  await ctx.editMessageText(
    "Great, " + tz + " it is!\n\nNow let's create your first habit. What do you want to track?",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🏃 Exercise", "habit:quick:Exercise")],
        [inlineButton("📚 Read", "habit:quick:Read")],
        [inlineButton("🧘 Meditate", "habit:quick:Meditate")],
        [inlineButton("💧 Drink water", "habit:quick:Drink water")],
        [inlineButton("✍️ Journal", "habit:quick:Journal")],
        [inlineButton("Type your own", "habit:custom")],
      ]),
    },
  );
});

composer.callbackQuery(/^habit:quick:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const title = ctx.match![1];
  const habitId = "h" + Date.now();
  ctx.session.step = "onboarding:habit:schedule";
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
  await ctx.editMessageText(
    "Nice choice — \"" + title + "\"!\n\nHow often?",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("📅 Every day", "schedule:daily")],
        [inlineButton("🗓️ Weekdays only", "schedule:weekdays")],
      ]),
    },
  );
});

composer.callbackQuery("habit:custom", async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = "h" + Date.now();
  ctx.session.step = "onboarding:habit:title:text";
  ctx.session.pendingHabit = {
    id: habitId,
    title: "",
    active: true,
    reminderHour: 9,
    reminderMinute: 0,
    scheduleType: "daily",
    createdAt: new Date().toISOString(),
    milestoneTargets: [7, 14, 30, 90],
  };
  await ctx.editMessageText("What habit do you want to track?");
});

composer.callbackQuery(/^schedule:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const schedule = ctx.match![1] as "daily" | "weekdays";
  if (ctx.session.pendingHabit) {
    ctx.session.pendingHabit.scheduleType = schedule;
  }
  ctx.session.step = "onboarding:habit:reminder";
  const hourOptions = [];
  for (let h = 6; h <= 22; h += 2) {
    const label = h <= 12 ? (h === 12 ? "12" : String(h)) + " " + (h < 12 ? "AM" : "PM") : String(h - 12) + " PM";
    hourOptions.push(inlineButton("⏰ " + label, "reminder:" + h));
  }
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < hourOptions.length; i += 3) {
    rows.push(hourOptions.slice(i, i + 3));
  }
  await ctx.editMessageText("When should I remind you?", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^reminder:(\d+)$/, async (ctx) => {
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

  ctx.session.step = "onboarding:confirm";
  await ctx.editMessageText(
    "Here's your first habit:\n\n" +
    "📌 " + habit.title + "\n" +
    "📅 " + scheduleLabel + "\n" +
    "⏰ Reminder at " + hourLabel + "\n\n" +
    "Ready to start?",
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("✅ Let's go", "onboarding:confirm:yes"),
          inlineButton("✏️ Change", "onboarding:confirm:edit"),
        ],
      ]),
    },
  );
});

composer.callbackQuery("onboarding:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const habit = ctx.session.pendingHabit;
  if (!habit) return;

  const habits = ctx.session.habits ?? [];
  habits.push(habit);
  ctx.session.habits = habits;
  ctx.session.pendingHabit = undefined;
  ctx.session.step = undefined;

  await ctx.editMessageText(
    "🎉 You're all set!\n\n" +
    "Your first habit \"" + habit.title + "\" is active. I'll remind you daily.\n\n" +
    "Tap a button below to get started.",
    { reply_markup: mainMenuKeyboard() },
  );
});

composer.callbackQuery("onboarding:confirm:edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "onboarding:habit:title";
  await ctx.editMessageText("What habit do you want to track?");
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;
  if (step === "onboarding:timezone:text") {
    const tz = ctx.message.text.trim();
    ctx.session.timezone = tz;
    ctx.session.step = "onboarding:habit:title";
    await ctx.reply(
      "Got it, " + tz + "!\n\nNow let's create your first habit. What do you want to track?",
    );
    return;
  }
  if (step === "onboarding:habit:title:text") {
    const title = ctx.message.text.trim();
    if (title.length < 2) {
      await ctx.reply("That's too short — give your habit a real name.");
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
    ctx.session.step = "onboarding:habit:schedule";
    await ctx.reply(
      "Nice choice — \"" + title + "\"!\n\nHow often?",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("📅 Every day", "schedule:daily")],
          [inlineButton("🗓️ Weekdays only", "schedule:weekdays")],
        ]),
      },
    );
    return;
  }
  return next();
});

export default composer;
