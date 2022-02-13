
export function pullStatus(pull) {
  let authors = {};
  let pr = pull.pull.node;

  if(pr.isDraft) return 'status-draft';

  if(pr.labels.edges.find(node => node.node.name == 'work-in-progress') !== undefined) return 'status-draft';

  pr.reviews.nodes.forEach(review => {
    if(!authors[review.author.login]) authors[review.author.login] = {reviews:[]};
    authors[review.author.login].reviews.push(review);
  });

  Object.entries(authors).forEach(entry => {
    (entry[1] as any).state = (entry[1] as any).reviews.reduce((a, c) => c.state == 'APPROVED' || c.state == 'CHANGES_REQUESTED' ? c.state : a, 'PENDING');
  });

  return Object.entries(authors).reduce(
    (a, c) =>
      (c[1] as any).state == 'CHANGES_REQUESTED' || a == 'status-changes-requested' ? 'status-changes-requested' :
      (c[1] as any).state == 'APPROVED' || a == 'status-approved' ? 'status-approved' : 'status-pending',
    'status-pending' // Initial value
  );
}

export function pullUserTesting(pull) {
  if(!pull.userTesting) return 'user-test-none';
  switch(pull.userTesting.state) {
    case 'SUCCESS': return 'user-test-success';
    case 'FAILURE': return 'user-test-failure';
    default: return 'user-test-pending';
  }
}

export function pullBuildState(pull) {
  let pr = pull.pull.node;
  if(pr.commits && pr.commits.nodes && pr.commits.nodes.length && pr.commits.nodes[0].commit &&
    pr.commits.nodes[0].commit.checkSuites &&
    pr.commits.nodes[0].commit.checkSuites.nodes.length) {
    const checks = pr.commits.nodes[0].commit.checkSuites.nodes;
    let conclusion = '';
    for(let check of checks) {
      if(check.app == null) {
        // GitHub will return a QUEUED null-app check. Not sure why.
        continue;
      }
      if(check.app?.name != "GitHub Actions") { // e.g. "Dependabot" || "GitGuardian"
        // We don't want status reports from anything other than our Github Action
        continue;
      }
      if(check.status == 'COMPLETED') {
        switch(check.conclusion) {
          case 'SUCCESS':
            if(conclusion == '') conclusion = 'SUCCESS';
            break;
          case 'ACTION_REQUIRED':
          case 'TIMED_OUT':
          case 'FAILURE':
            conclusion = 'FAILURE'; //   return base+'failure';
            break;
          case 'CANCELLED':
          case 'SKIPPED':
          case 'STALE':
          case 'NEUTRAL':
          default:
            if(conclusion == '') conclusion = 'CANCELLED';
            //return base+'missing'; // various other states
        }
      } else {
        //IN_PROGRESS, QUEUED, REQUESTED
        conclusion = 'QUEUED';
        //return base+'pending';
      }
    }
    switch(conclusion) {
      case 'QUEUED': return 'pending';
      case 'SUCCESS': return 'success';
      case 'FAILURE': return 'failure';
      default: return 'missing';
    }
  }
  if(!pull.state) return 'missing';
  switch(pull.state.state) {
    case 'SUCCESS': return 'success';
    case 'PENDING': return 'pending';
    default: return 'failure';
  }
}