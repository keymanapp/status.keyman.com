export function getTeamcityUrlParams(u: URL) {
  let buildTypeId: string = null, buildId: string = null;
  // Assume TeamCity
  const re = /\/buildConfiguration\/([^\/]+)\/(\d+)$/.exec(u.pathname);
  if (re) {
    // 2024 update of teamCity
    buildTypeId = re[1];
    buildId = re[2];
  } else {
    buildTypeId = u.searchParams.get('buildTypeId');
    buildId = u.searchParams.get('buildId');
  }
  return { buildTypeId, buildId };
}
