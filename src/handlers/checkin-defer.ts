import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("checkin:defer", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("\u23F0 Reminder postponed by 30 minutes. I\u2019ll check back soon.", {
    reply_markup: inlineKeyboard([[inlineButton("\u2B05\uFE0F Back to menu", "menu:main")]]),
  });
});

export default composer;
