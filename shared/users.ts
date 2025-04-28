// github ids / community ids / avatars currently unused
export const userIds: {[index:string]: {community:string, avatar?: string, tz?: string}} = {
  "darcywong00": { community: "darcy", avatar: 'bg+DW.png', tz: 'Asia/Bangkok'},
  "ermshiperete": { community: "EberhardBeilharz", tz: 'Europe/Berlin' },
  "jahorton": { community: "joshua_horton", avatar: 'bg+JH.png', tz: 'Asia/Phnom_Penh'},
  "MakaraSok": { community: "makara", avatar: 'bg+MS.png', tz: 'Asia/Phnom_Penh'},
  "mcdurdin": { community: "Marc", avatar: 'bg+MD.png', tz: 'Asia/Phnom_Penh'},
  "markcsinclair": { community: "", tz: 'Europe/London' },
  "rc-swag": { community: "ross", avatar: 'bg+RC.png', tz: 'Australia/Brisbane'},
  "SabineSIL": { community: "", avatar: 'bg+SAB.png', tz: 'Europe/Berlin'},
  "sgschantz": { community: "Shawn", avatar: 'bg+SGS.png', tz: 'Asia/Phnom_Penh'},
  "srl295": { community: "srl295", avatar: 'bg+SRL.png', tz: 'America/Chicago'},
  "sze2st": { community: "", tz: 'Europe/Berlin' },
  "Markus-SWAG": { community: "", tz: 'Europe/Berlin' },
  // "bharanidharanj": { community: "", avatar: 'bg+BJ.png', tz: 'Asia/Kolkata'},
  "dinakaranr": {community: "", tz: 'Asia/Kolkata' },
  "LornaSIL": { community: "Lorna" , tz: 'America/Chicago'},
  "DavidLRowe": { community: "drowe", tz: 'America/Anchorage' },
  "Nnyny": { community: "nyny", tz: 'Asia/Phnom_Penh' },
  "Meng-Heng": { community: "mengheng", tz: 'Asia/Phnom_Penh' },
};

function getCommunityUserIds() {
  return Object.keys(userIds).map(id => userIds[id].community);
}

export const communityUserIds = getCommunityUserIds();

export function getTz(id) {
  return userIds[id]?.tz;
}

export function getAvatarUrl(id) {
  // if(userIds[id]?.avatar) {
    // return `/assets/avatars/${userIds[id].avatar}`;
  // } else {
    return `https://github.com/${id}.png?size=22`;
  // }
}

export function getUserAvatarUrl(user, size?) {
  // if(userIds[user.login]?.avatar) {
    // return `/assets/avatars/${userIds[user.login].avatar}`;
  // } else {
    return user.avatarUrl + (size ? `&size=${size}` : '');
  // }
}

export function getAuthorAvatarUrl(author, size?) {
  // if(userIds[author.login]?.avatar) {
    // return `/assets/avatars/${userIds[author.login].avatar}`;
  // } else {
    return author.avatarUrl + (size ? `&size=${size}` : '');
  // }
}
