
function zeroPad(s, x: number) {
  if(typeof s != 'string') s = s.toString();
  return ('0'.repeat(x) + s).slice(-x);
}

function formatDuration(duration){
  var seconds = Math.abs(Math.ceil(duration / 1000)),
    h = (seconds - seconds % 3600) / 3600,
    m = (seconds - seconds % 60) / 60 % 60,
    s = seconds % 60,
    ms = duration % 1000;
  return (duration < 0 ? '-' : '') + h + ':' + zeroPad(m, 2) + ':' + zeroPad(s, 2) + '.' + zeroPad(ms, 4);
}

export function consoleLog(module: string, service: string, message: string) {
  const dt = new Date();
  const mod = (service ? `${module}[${service}]` : `${module}`).padEnd(48);
  console.log(`${dt.toISOString()}   ${mod} ${message}`);
}

export function consoleError(module: string, service: string, message: string) {
  const dt = new Date();
  const mod = (service ? `${module}[${service}]` : `${module}`).padEnd(48);
  console.error(`${dt.toISOString()}   ${mod} ${message}`);
}