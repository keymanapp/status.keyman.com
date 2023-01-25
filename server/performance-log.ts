
function zeroPad(s, x: number) {
  if(typeof s != 'string') s = s.toString();
  return ('0'.repeat(x) + s).slice(-x);
}

function spacePad(s, x: number) {
  if(typeof s != 'string') s = s.toString();
  return (' '.repeat(x) + s).slice(-x);
}

function formatDuration(duration){
	var seconds = Math.abs(Math.ceil(duration / 1000)),
		h = (seconds - seconds % 3600) / 3600,
		m = (seconds - seconds % 60) / 60 % 60,
		s = seconds % 60,
    ms = duration % 1000;
	return (duration < 0 ? '-' : '') + h + ':' + zeroPad(m, 2) + ':' + zeroPad(s, 2) + '.' + zeroPad(ms, 4);
}

// function formatMsec()

export function performanceLog(dt, event) {
  console.log(`[${formatDuration(dt)}]  ${spacePad(Math.round(performance.now() - dt), 8)}ms       ${event}`);
}
