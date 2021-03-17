exports.getCurrentSprint = function(ghdata) {
  // For specific milestone queries, we get this from the initial milestoneDueOn

  let phase = null;

  if(ghdata.milestoneDueOn) {
    phase = ghdata.milestoneDueOn.edges[0].node.milestone;
  }
  else {
    // We want the current milestone, plus its start and end date.
    // We find this milestone by looking for the oldest one in the list :)

    phase = ghdata.repository.milestones.edges.reduce ((a, m) => {
      if(m.node.dueOn == null) return a;
      if(a == null || a.node.dueOn == null) return m;
      if(new Date(a.node.dueOn) < new Date(m.node.dueOn)) return a;
      return m;
    });
    if(phase == null) {
      return null;
    }
    phase = phase.node;
  }

  // Assuming a phase is 2 weeks
  let phaseEnd = new Date(phase.dueOn);
  let d = new Date(phase.dueOn);
  d.setDate(d.getDate()-11);
  let phaseStart = new Date(d);

  return {title: phase.title, start: phaseStart, end: phaseEnd};
}