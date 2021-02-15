import SocketClient from './libs/SocketClient.js';
import dotenv from 'dotenv';
import Discord from 'discord.js';
dotenv.config()
let TICKER;           // Which ticker to pull price for
let UPDATE_INTERVAL;  // Price update interval in milliseconds
let TOKEN_INDEX;      // Discord bot token index to use (in auth.json)
let priceData;

if (typeof process.argv[2] !== 'undefined') {
  TICKER = process.argv[2].toLowerCase();
}
else {
  TICKER = 'eth'
}

if (typeof process.argv[3] !== 'undefined') {
  UPDATE_INTERVAL = process.argv[3];
}
else {
  UPDATE_INTERVAL = 3000;
}

if (typeof process.argv[4] !== 'undefined') {
  TOKEN_INDEX = process.argv[4];
}
else {
  TOKEN_INDEX = 0;
}

const bot = new Discord.Client();
const Streams = 'ticker'
const streamName = `${TICKER}usdt@${Streams}`;

let guildMeCache = [];
let nickTimeOut = Date.now();
console.log(process.argv)

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  bot.user.setActivity(`😀`);
  bot.guilds.cache.each(guild => guildMeCache.push(guild.me));
  const socketClient = new SocketClient(`ws/${streamName}`, 'wss://stream.binance.com/');
  socketClient.setHandler('24hrTicker', (params) => { priceData = params });
  setInterval(showPrice, UPDATE_INTERVAL);
});

function showPrice() {
  let change24H = priceData.P
  let lastPRICE = priceData.c
  let changeArrow = change24H > 0 ? '(↗)' : (change24H < 0 ? '(↘)' : '(→)')
  let coin = TICKER.toUpperCase()
  if (Date.now() > nickTimeOut) guildMeCache.forEach(guildMe => guildMe.setNickname(`${coin} :24h ${change24H}%`));
  bot.user.setActivity(`$ ${lastPRICE} ${changeArrow}`);
  //console.log(`${coin.toUpperCase()} 24hr change ${change24H} ${changeArrow} $ ${lastPRICE}`)
}

bot.on('rateLimit', (e) => {
  console.log(e)
  if (typeof e.timeout !== undefined && e.path.includes('@me/nick')) {
    nickTimeOut = Date.now() + e.timeout + 500
  }
})
bot.on('message', (msg) => {
  let { guildID, channelID, authorID, content } = msg
  console.log(msg)
  console.log(guildID, channelID, authorID, content)
  // filters only for commands that start with '!'
  if (content.substring(0, 1) == '!') {
    var args = content.substring(1).split(' ');
    var command = args[0]
    var param = args[1]

    if (command === 'ping') {
      msg.channel.send('pong');
    }
  }
});
bot.login(process.env[`token_${TOKEN_INDEX}`]);
