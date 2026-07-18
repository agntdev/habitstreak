import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP =
  "\u2139\uFE0F How to use HabitStreak:\n\n" +
  "Tap /start to open the menu, then pick what you want from the buttons.\n\n" +
  "\u2022 \u{1F4CB} My habits \u2014 view and manage your habits\n" +
  "\u2022 \u2705 Check in \u2014 mark today\u2019s habits as done\n" +
  "\u2022 \u2795 Add habit \u2014 create a new habit to track\n\n" +
  "I\u2019ll remind you each day to check in. Keep your streak going!";

const backToMenu = inlineKeyboard([[inlineButton("\u2B05\uFE0F Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
