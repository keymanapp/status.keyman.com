exports.getCurrentSprint = function(ghdata) {
  // We want the current milestone, plus its start and end date.
  // We find this milestone by looking for the oldest one in the list :)

  let phase = ghdata.repository.milestones.edges.reduce ((a, m) => {
    if(m.node.dueOn == null) return a;
    if(a == null || a.node.dueOn == null) return m;
    if(new Date(a.node.dueOn) < new Date(m.node.dueOn)) return a;
    return m;
  });
  if(phase == null) {
    return null;
  }

  // Assuming a phase is 2 weeks
  let phaseEnd = new Date(phase.node.dueOn);
  let d = new Date(phase.node.dueOn);
  d.setDate(d.getDate()-11);
  let phaseStart = new Date(d);

  return {start: phaseStart, end: phaseEnd};
}