import httpget from '../../util/httpget';
import { userIds } from '../../../shared/users';

export default {
  get: async function(startDate) {
    let result = {};
    for(let user of Object.keys(userIds)) {
      result[user] = await this.getUser(startDate, userIds[user].community);
    }
    return result;
  },

  PAGE_SIZE: 60,

  getUser: async function(startDate, user, posts?, cursor?) {
    if(!user) {
      return [];
    }

    cursor = cursor ?? 0;
    posts = posts ?? [];

    const url =
      `/user_actions.json`+
      `?offset=${cursor}`+
      `&username=${user}`+
      `&filter=4,5`;

    const host = 'community.software.sil.org';

    let discourseQuery = httpget(host, url);

    return discourseQuery.then((data) => {
      // console.log(data.data);
      let json = JSON.parse(data.data);
      if(json?.user_actions) {
        const actions = json.user_actions.filter(a => new Date(a.created_at) >= startDate);
        const results = [].concat(posts, actions);
        if(actions.length == json.user_actions.length) {
          return this.getUser(startDate, user, posts, cursor + this.PAGE_SIZE);
        }
        return results;
      }
      return [];
    });
  }
};