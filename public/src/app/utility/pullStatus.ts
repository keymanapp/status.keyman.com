
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
    (entry[1] as any).updatedAt = (entry[1] as any).reviews.reduce((a, c) => new Date(c.updatedAt) >= a ? new Date(c.updatedAt) : a, new Date(0));
  });

  const latestReviewStatus = Object.entries(authors).reduce(
    (a, c) =>
      (c[1] as any).state == 'CHANGES_REQUESTED' || a[0] == 'status-changes-requested' ? ['status-changes-requested', ((c[1] as any).updatedAt)] :
      (c[1] as any).state == 'APPROVED' || a[0] == 'status-approved' ? ['status-approved', (c[1] as any).updatedAt] : ['status-pending', null],
    ['status-pending', <Date>null] // Initial value
  );

  if(pr.reviewsRequested?.nodes?.length) {
    const latestReviewRequest = pr.reviewsRequested.nodes[pr.reviewsRequested.nodes.length - 1];
    if(new Date(latestReviewRequest.createdAt) >= latestReviewStatus[1]) {
      return 'status-pending';
    }
  }

  return latestReviewStatus[0];
}

export function pullUserTesting(pull) {
  if(!pull.userTesting) return 'user-test-none';
  switch(pull.userTesting.state) {
    case 'SUCCESS': return 'user-test-success';
    case 'FAILURE': return 'user-test-failure';
    default: return 'user-test-pending';
  }
}

export function pullChecks(pull) {
  const results = [];
  const commitNode = pull?.node?.commits?.edges?.[0]?.node ?? pull?.commits?.nodes?.[0];
  if(commitNode?.checkSuites?.nodes?.length) {
    const checks = commitNode.checkSuites.nodes;
    for(let check of checks) {
      if(check.app == null) {
        // GitHub will return a QUEUED null-app check. Not sure why.
        continue;
      }
      if(check.app?.name != "GitHub Actions") { // e.g. "Dependabot" || "GitGuardian"
        // We don't want status reports from anything other than our Github Action
        continue;
      }
      results.push(check);
    }
  }

  if(commitNode?.commit?.status?.contexts?.[0]) {
    for(let context of commitNode.commit.status.contexts) {
      results.push(context);
    }
  }
  return results;
}

export function pullBuildStateEx(pull) {
  let fileSizeResult = '';
  let conclusion = '';
  let pr = pull.pull.node;
  if(!pr.checkSummary) return 'missing';

  for(let check of pr.checkSummary) {
    if(check.context == 'check/web/file-size') {
      fileSizeResult = check.state == 'SUCCESS' ? 'file-size-success' : check.state == 'FAILURE' ? 'file-size-failure' : '';
      pr.fileSizeFailureText = check.description;
    } else if(check.context == 'user_testing') {
    } else {
      if(check.state) {
        switch(check.state) {
          case 'SUCCESS':
            if(conclusion == '') conclusion = 'success';
            break;
          case 'PENDING':
          case 'EXPECTED':
            conclusion = 'pending';
            break;
          case 'ERROR':
          case 'FAILURE':
            conclusion = 'failure';
            break;
        }
      }
      else if(check.status == 'COMPLETED') {
        switch(check.conclusion) {
          case 'SUCCESS':
            if(conclusion == '') conclusion = 'success';
            check.state = 'SUCCESS';
            break;
          case 'ACTION_REQUIRED':
          case 'TIMED_OUT':
          case 'FAILURE':
            conclusion = 'failure';
            check.state = 'FAILURE';
            break;
          case 'CANCELLED':
          case 'SKIPPED':
          case 'STALE':
          case 'NEUTRAL':
          default:
            if(conclusion == '') conclusion = 'failure';
            check.state = 'FAILURE';
        }
      } else {
        conclusion = 'pending';
        check.state = 'PENDING';
      }
    }
  }

  if(conclusion == '') conclusion = 'missing';
  return (conclusion+' '+fileSizeResult).trim();
}

export function pullBuildState(pull) {
  let pr = pull.pull.node;
  const commitNode = pr?.commits?.edges?.[0]?.node ?? pr?.commits?.nodes?.[0];

  if(commitNode?.checkSuites?.nodes?.length) {
    const checks = commitNode.checkSuites.nodes;
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
      // case 'SUCCESS': return 'success';
      case 'FAILURE': return 'failure';
      // default: return 'missing';
    }
  }

  if(commitNode?.commit?.status?.contexts?.[0]) {
    let conclusion = '';
    for(let context of commitNode.commit.status.contexts) {
      if(context.context == 'user_testing') {
        continue;
      }

      switch(context.state) {
        case 'SUCCESS':
          if(conclusion == '') conclusion = 'SUCCESS';
          break;
        case 'PENDING':
        case 'EXPECTED':
          conclusion = 'QUEUED';
          break;
        case 'ERROR':
        case 'FAILURE':
          if(context.context != 'check/web/file-size')
            conclusion = 'FAILURE'; //   return base+'failure';
          break;
      }
    }
    switch(conclusion) {
      case 'QUEUED': return 'pending';
      case 'SUCCESS': return 'success';
      case 'FAILURE': return 'failure';
      // default: return 'missing';
    }
  }

  if(!pull.state) return 'missing';
  switch(pull.state.state) {
    case 'SUCCESS': return 'success';
    case 'PENDING': return 'pending';
    default: return 'failure';
  }
}