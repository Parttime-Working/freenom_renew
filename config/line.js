const HttpAgent = require('agentkeepalive');
const { HttpsAgent } = HttpAgent;
const { Client } = require('@line/bot-sdk')

const config = {
  channelAccessToken: process.env.LINE_BOT_TOKEN,
  httpConfig: {
    httpAgent: new HttpAgent(),
    httpsAgent: new HttpsAgent(),
  },
}

const lineClient = new Client(config)

module.exports = lineClient