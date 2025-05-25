/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapp-test-bot middleware
 */

import { env } from "node:process";
import * as fs from 'node:fs';

import { createNodeMiddleware, Probot } from 'probot';
import * as keymanappTestBot from './keymanapp-test-bot.js';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rootPath = __dirname + '/../../../../';
const privateKeyFilename = rootPath + '.keymanapp-test-bot.pem';
const secretFilename = rootPath + '.keymanapp-test-bot.secret';
const appIdFilename = rootPath + '.keymanapp-test-bot.appid';
const appId = fs.existsSync(appIdFilename) ?
  parseInt(fs.readFileSync(appIdFilename, 'utf8'), 10) :
  133554; //test id: 134443;

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

const exports = createNodeMiddleware(keymanappTestBot.default, { probot });
export default exports;
