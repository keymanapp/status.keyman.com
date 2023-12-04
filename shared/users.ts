// github ids / community ids / avatars currently unused
export const userIds: {[index:string]: {community:string, avatar?: string}} = {
  "darcywong00": { community: "darcy", avatar: 'bg+DW.png'},
  "ermshiperete": { community: "EberhardBeilharz" },
  "jahorton": { community: "joshua_horton", avatar: 'bg+JH.png'},
  "MakaraSok": { community: "makara", avatar: 'bg+MS.png'},
  "mcdurdin": { community: "Marc", avatar: 'bg+MD.png'},
  "rc-swag": { community: "ross", avatar: 'bg+RC.png'},
  "SabineSIL": { community: "", avatar: 'bg+SAB.png'},
  "sgschantz": { community: "Shawn", avatar: 'bg+SGS.png'},
  "srl295": { community: "srl295", avatar: 'bg+SRL.png'},
  "bharanidharanj": { community: "", avatar: 'bg+BJ.png'},
  "LornaSIL": { community: "Lorna" },
  "DavidLRowe": { community: "drowe" },
  "Nnyny": { community: "Nguonnyny_Tan" },
  "Meng-Heng": { community: "mengheng" },
};

function getCommunityUserIds() {
  return Object.keys(userIds).map(id => userIds[id].community);
}

export const communityUserIds = getCommunityUserIds();

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
