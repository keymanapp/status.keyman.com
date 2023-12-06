import { pullEmoji } from "./pullEmoji";

export class PullRequestClipboard {

  public static getPullRequest(pull, emojiToRemove) {
    const title = emojiToRemove ? pull.node.title.replace(emojiToRemove, '') : pull.node.title;
    const style = pull.node.isDraft ? ` style='color: #aaaaaa'` : '';
    return `<li${style}>${title} (<a href='${pull.node.url}'>#${pull.node.number}</a>)</li>\n`;
  }

  public static getPullRequestListForAuthor(pullRequests, sites, author) {
    const bases = Object.keys(pullRequests).sort();

    let text = `<ul>\n`;

    for(let base of bases) {
      const pulls = pullRequests[base];
      for(let pull of pulls) {
        if(pull.pull.node.author.login == author) {
          text += this.getPullRequest(pull.pull, null);
        }
      }
    }

    for(let siteName of Object.keys(sites)) {
      let site = sites[siteName];
      for(let pull of site.pulls) {
        if(pull.pull.node.author.login == author) {
          text += this.getPullRequest(pull.pull, null);
        }
      }
    }

    text += `</ul>\n`;
    return { content: text, type: 'text/html' };
  }

  public static getPullRequestListByArea(pullRequests, sites) {
    let text = ``;

    const bases = Object.keys(pullRequests).sort();

    for(let base of bases) {
      const pulls = pullRequests[base];
      const baseEmoji = pulls.length ? pullEmoji(pulls[0].pull) : '';
      text += `<h3>${base} ${baseEmoji}</h3>`;
      if(pulls.length) {
        text += `<ul>`;
        let thisPullEmoji = baseEmoji;
        for(let pull of pulls) {
          let emoji = pullEmoji(pull.pull);
          if(emoji != thisPullEmoji) {
            if(thisPullEmoji.length) {
              text += `</ul></li>`;
            }
            if(emoji.length) {
              text += `<li>${emoji}<ul>`;
            }
            thisPullEmoji = emoji;
          }
          text += this.getPullRequest(pull.pull, emoji);
        }
        if(thisPullEmoji != baseEmoji) {
          text += `</ul></li>`;
        }
        text += `</ul>`;
      }
    }

    for(let siteName of Object.keys(sites)) {
      let site = sites[siteName];
      if(site.pulls.length) {
        text += `<h3>${siteName}</h3><ul>`;
        for(let pull of site.pulls) {
          text += this.getPullRequest(pull.pull, null);
        }
        text += '</ul>';
      }
    }

    text += `</ul>`;

    return { content: text, type: 'text/html' };
  }
}