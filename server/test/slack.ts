/* // commented out so it doesn't keep triggering slack...
import { slackLGTM } from '../services/slack/slack';

(async function main() {
  await slackLGTM(
      {
       action:'submitted',
       review:{
         pull_request_url:'https://github.com/keymanapp/keyman/pull/5080',
         state: 'approved'
    }}
  );
})();
*/