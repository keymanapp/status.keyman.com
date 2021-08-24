/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapp-test-bot middleware
 */

import { env } from "process";

const { createNodeMiddleware, Probot } = require('probot');
const keymanappTestBot = require('./keymanapp-test-bot');
const fs = require('fs');

const rootPath = __dirname + '/../../../../';
const privateKeyFilename = rootPath + '.keymanapp-test-bot.pem';
const secretFilename = rootPath + '.keymanapp-test-bot.secret';
const appId = 133554;

let privateKey, secret;
if(fs.existsSync(privateKeyFilename))
  privateKey = fs.readFileSync(privateKeyFilename, 'utf8');
else if(env.PROBOT_PRIVATE_KEY)
  privateKey = Buffer.from(env.PROBOT_PRIVATE_KEY, 'base64');

if(fs.existsSync(secretFilename))
  secret = fs.readFileSync(secretFilename, 'utf8').trim();
else if(env.PROBOT_SECRET)
  secret = env.PROBOT_SECRET;

//let buf = Buffer.from(privateKey);
//console.log(buf.toString('base64'));

const probot = new Probot({
  appId: appId,
  privateKey: privateKey,
  secret: secret,
});

module.exports = createNodeMiddleware(keymanappTestBot, { probot });
