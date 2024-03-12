import httpget from '../../util/httpget';
import { userIds } from '../../../shared/users';

export default {
  get: async function(startDate) {
    let result = {
      queue: await this.getQueue(),
      contributions: {}
    };
    for(let user of Object.keys(userIds)) {
      try {
        result.contributions[user] = await this.getUser(startDate, userIds[user].community);
      } catch(e) {
        console.log(`Error retrieving discourse contributions for ${user}: ${e}`);
      }
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
      '&limit=60'+
      `&filter=4,5`;

    const host = 'community.software.sil.org';

    let discourseQuery = httpget(host, url);

    return discourseQuery.then((data) => {
      let json = JSON.parse(data.data);
      if(json?.user_actions) {
        const actions = json.user_actions.filter(a => new Date(a.created_at) >= startDate);
        const results = [].concat(posts, actions);
        if(actions.length == json.user_actions.length && actions.length > 0) {
          // Because we filter out-of-range contributions, we avoid retrieving
          // the entire history of contributions
          return this.getUser(startDate, user, results, cursor + this.PAGE_SIZE);
        }
        return results;
      }
      return [];
    });
  },

  getQueue: async function(topics?, cursor?) {
    cursor = cursor ?? 0;
    topics = topics ?? [];

    const url =
      `/search.json`+
      `?q=-tags:done,resolved+%23keyman+after:2022-12-01+status:open+order:latest`;

    const host = 'community.software.sil.org';

    let discourseQuery = httpget(host, url);

    return discourseQuery.then((data) => {
      let json = JSON.parse(data.data);
      if(!json?.topics?.length) {
        return topics;
      }

      let filteredTopics = json.topics.filter(topic =>
        !topic.has_accepted_answer &&
        !topic.tags.includes('closed') &&
        !topic.tags.includes('resolved') &&
        !topic.tags.includes('announcement') &&
        !topic.tags.includes('done')
      );

      filteredTopics.forEach(topic => topic.last_post = json.posts.find(post => post.topic_id == topic.id));

      let results = [].concat(topics, filteredTopics);

      // todo: pagination?

      return results;
    });
  }

};
