import emojiRegex from "emoji-regex";

export function pullEmoji(pull) {
  let title: string = pull.node.title;
  let regex = emojiRegex(), match;
  while(match = regex.exec(title)) {
    const emoji = match[0];
    if(emoji != '🍒') return emoji;
  }
  return "";
}
