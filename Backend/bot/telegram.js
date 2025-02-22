const { Telegraf } = require('telegraf');
const User = require('../models/User');
const List = require('../models/List');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

bot.command('start', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const existingUser = await User.findOne({ telegramId });

    if (!existingUser) {
      ctx.reply('Please login to the web app first and link your Telegram account.');
    } else {
      ctx.reply('Welcome! You can create lists by sending me prompts.');
    }
  } catch (error) {
    ctx.reply('An error occurred. Please try again.');
  }
});

bot.on('text', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    if (!user) {
      ctx.reply('Please login to the web app first and link your Telegram account.');
      return;
    }

    const prompt = ctx.message.text;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    ctx.reply('Generating your list...');

    const result = await model.generateContent(
      `Create a detailed list for: ${prompt}. Return only the list items separated by newlines.`
    );

    const items = result.response.text().split('\n')
      .filter(item => item.trim())
      .map(content => ({ content, isCompleted: false }));

    const list = await List.create({
      title: prompt,
      items,
      owner: user._id,
      description: prompt
    });

    await User.findByIdAndUpdate(user._id, {
      $push: { createdLists: list._id }
    });

    ctx.reply('List created successfully! Check your dashboard to view it.');
  } catch (error) {
    ctx.reply('An error occurred while generating the list. Please try again.');
  }
});

// Add error handling for bot launch
const launchBot = async () => {
  try {
    await bot.launch();
    console.log('Telegram bot started successfully');
  } catch (error) {
    console.error('Failed to start Telegram bot:', error.message);
    console.log('Telegram bot functionality will be disabled');
  }
};

// Replace bot.launch() with launchBot()
launchBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot; 