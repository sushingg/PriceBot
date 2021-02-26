#!/usr/bin/env node
import SocketClient from './libs/SocketClient.js';
import dotenv from 'dotenv';
import Discord from 'discord.js';
dotenv.config()
let UPDATE_INTERVAL;  // Price update interval in milliseconds

if (typeof process.argv[2] !== 'undefined') {
  UPDATE_INTERVAL = process.argv[2];
}
else {
  UPDATE_INTERVAL = 12000;
}

console.log(process.argv)


let bot_count = process.env.BOT_COUNT;
let streamName = [];
let bot_group = []
let guildMeCache = [];
let ticker_list = [];
let priceData = [];
let TimeOut = [];
let botArrow = []
for (let i = 1; i <= bot_count; i++) {
  let bot_num = i - 1;
  let TICKER = process.env[`SYMBOL_${bot_num}`]
  ticker_list[bot_num] = TICKER;
  streamName[bot_num] = `${TICKER}usdt@ticker`
  let bot = bot_group[bot_num] = new Discord.Client()
  TimeOut[bot_num] = Date.now()
  bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}! UPDATE INTERVAL ${UPDATE_INTERVAL}`);
    bot.user.setActivity(`bot starting....❤❤`);
    if (guildMeCache?.[bot_num] == undefined) guildMeCache[bot_num] = []
    bot.guilds.cache.each(guild => guildMeCache[bot_num].push(guild.me));
    setInterval(() => { showPrice(bot_num) }, UPDATE_INTERVAL);
  });

  bot.on('rateLimit', (e) => {
    if (typeof e.timeout !== undefined && e.path.includes('@me/nick')) {
      TimeOut[bot_num] = Date.now() + e.timeout + 3000
      console.log(`${Date.now()}-${TICKER}:time out ${e.timeout}`, TimeOut[bot_num])

    }
  })

  bot.on('message', (msg) => {
    let { guildID, channelID, authorID, content } = msg
    // console.log(msg)
    // console.log(guildID, channelID, authorID, content)
    // filters only for commands that start with '!'
    if (content.substring(0, 1) == '!') {
      var args = content.substring(1).split(' ');
      var command = args[0]
      var param = args[1]
      if (command === `${TICKER.toLowerCase()}ping`) {
        msg.channel.send('pong');
      }
      if (command === `${TICKER.toLowerCase()}test`) {
        msg.channel.send('pong');
        console.log('-------------------------------')
        guildMeCache[bot_num].forEach(guildMe => {
          let role_up = guildMe.guild.roles.cache.find(e => e.name == 'Crypto Up')
          let role_down = guildMe.guild.roles.cache.find(e => e.name == 'Crypto Down')
          let role_base = guildMe.guild.roles.cache.find(e => e.name == 'CryptoCurrency')
          guildMe.roles.add(role_down)
          guildMe.roles.remove(role_up)
          guildMe.roles.remove(role_base)
        });
      }
    }
  });

  bot.login(process.env[`TOKEN_${bot_num}`]);
}
const socketClient = new SocketClient(`ws/${streamName.join('/')}`, 'wss://stream.binance.com/');
socketClient.setHandler('24hrTicker', (params) => {
  {
    let symbol = params.s.replace("USDT", '').toLowerCase();
    let index = ticker_list.indexOf(symbol)
    if (index > -1) {
      priceData[index] = params
    }
  }
});
function setGroup(guildMe, status) {
  let role_up = guildMe.guild.roles.cache.find(e => e.name == 'Crypto Up')
  let role_down = guildMe.guild.roles.cache.find(e => e.name == 'Crypto Down')
  let role_base = guildMe.guild.roles.cache.find(e => e.name == 'CryptoCurrency')
  if (status == 'up') {
    guildMe.roles.add(role_up)
    guildMe.roles.remove(role_base)
  }
  if (status == 'down') {
    guildMe.roles.add(role_down)
    guildMe.roles.remove(role_up)
    guildMe.roles.remove(role_base)
  }
  if (status == 'equal') {
    guildMe.roles.add(role_base)
  }
}
function showPrice(bot_num) {
  if (priceData?.[bot_num] == undefined) return;
  let change24H = priceData[bot_num].P
  let lastPRICE = priceData[bot_num].c
  let changeArrow = change24H > 0 ? '(↗)' : (change24H < 0 ? '(↘)' : '(→)')
  if (changeArrow != botArrow[bot_num]) {
    let group = change24H > 0 ? 'up' : (change24H < 0 ? 'down' : 'equal')
    guildMeCache[bot_num].forEach(guildMe => {
      setGroup(guildMe, group)
    });
    botArrow[bot_num] = changeArrow
  }
  botArrow[bot_num] = changeArrow
  let coin = ticker_list[bot_num].toUpperCase()
  if (Date.now() < TimeOut[bot_num]) return;
  guildMeCache[bot_num].forEach(guildMe => guildMe.setNickname(`${coin} :24h ${parseFloat(change24H).toFixed(2)}%`));
  bot_group[bot_num].user.setActivity(`$ ${lastPRICE.toFixed(4)} ${changeArrow}`);

  //console.log(`${coin.toUpperCase()} 24hr change ${change24H} ${changeArrow} $ ${lastPRICE}`)
}