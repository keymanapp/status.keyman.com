import httppost from '../../util/httppost';
import httpget from '../../util/httpget';
import { slack_bot_token, slack_user_token } from '../../identity/slack';

const SLACK_CHANNEL='C6Q9WS09G';

export function slackLGTM(data) {
  if(data.action == 'submitted' && data.review && data.review.pull_request_url) {
    let reaction = data.review.state == 'approved' ? 'lgtm' : 'eyes';
    let url = data.review.pull_request_url;
    console.log(`Received ${reaction} on PR ${url}`);
    //console.log(reaction);
    //console.log(url);

    // We'll ask Slack for any posts that reference this PR
    return httpget('slack.com', '/api/search.messages?query='+encodeURIComponent(url), {
      Authorization: `Bearer ${slack_user_token}`
    }).then((data) => {
      const results = JSON.parse(data.data);
      //console.log(data);
      if(results.ok && results.messages && results.messages.matches && results.messages.matches.length) {
        return Promise.all(results.messages.matches.map(message =>
          message.channel.id != SLACK_CHANNEL ? Promise.resolve() :
          // Add a reaction to each matching message
          httppost('slack.com', '/api/reactions.add', {
            Authorization: `Bearer ${slack_bot_token}`,
            'Content-Type': 'application/json'
          },
          JSON.stringify({
            channel: SLACK_CHANNEL,
            name: reaction,
            timestamp: message.ts
          })).then((response) => {
            //console.log(response);
          })
        ));
      }
    });
  }
  return Promise.resolve();
}