import { consoleLog } from "./util/console-log.js";

function spacePad(s, x: number) {
  if(typeof s != 'string') s = s.toString();
  return (' '.repeat(x) + s).slice(-x);
}

// function formatMsec()

export function performanceLog(dt, event) {
  consoleLog('performance', null, `${(Math.round(performance.now() - dt)).toString().padEnd(8)}   ${event}`);
}
