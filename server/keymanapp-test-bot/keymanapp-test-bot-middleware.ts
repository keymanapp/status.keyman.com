/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapptestbot middleware
 */

const { createNodeMiddleware, Probot } = require('probot');
const keymanappTestBot = require('./keymanapp-test-bot');
const fs = require('fs');

const probot = new Probot({
  appId: 133554,
  privateKey: fs.readFileSync(__dirname + '/../../../../.keymanapp-test-bot.pem', 'utf8'),
  secret: fs.readFileSync(__dirname + '/../../../../.keymanapp-test-bot.secret', 'utf8').trim(),
});

module.exports = createNodeMiddleware(keymanappTestBot, { probot });
