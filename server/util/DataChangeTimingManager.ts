import { consoleLog } from "./console-log.js";

export class DataChangeTimingManager {
  started: Date[] = [];
  lastRun: Date[] = [];
  dataChangeTimeout: NodeJS.Timeout[] = [];

  private formatDate(date: Date) {
    return date ? date.toISOString() : 'unknown';
  }

  isTooSoon = (id: string, minInterval: number, callback: () => void): boolean => {
    const lastRunDelta = this.lastRun[id] ? (new Date()).valueOf() - this.lastRun[id].valueOf() : 1000000;

    if (this.started[id] || lastRunDelta < minInterval) {
      if(this.started[id]) {
        consoleLog('timing', id, `Data change is still underway (started at ${this.formatDate(this.started[id])}); waiting ${minInterval} milliseconds`);
      } else {
        consoleLog('timing', id, `Data change was only ${lastRunDelta} msec ago (finished at ${this.formatDate(this.lastRun[id])}); waiting ${minInterval} milliseconds`);
      }

      if (this.dataChangeTimeout[id]) {
        clearTimeout(this.dataChangeTimeout[id]);
      }
      this.dataChangeTimeout[id] = setTimeout(() => {
        this.dataChangeTimeout[id] = null;
        callback();
      }, minInterval);
      return true;
    }
    return false;
  };

  isRunning = (id): boolean => {
    return !!this.started[id];
  };

  start = (id): void => {
    this.started[id] = new Date();
    consoleLog('timing', id, `starting at ${this.formatDate(this.started[id])}`);
    // this.lastRun[id] = new Date();
  };

  finish = (id): void => {
    this.lastRun[id] = new Date();
    const delta = this.started[id] ? this.lastRun[id].valueOf() - this.started[id].valueOf() : '??';
    consoleLog('timing', id, `finished in ${delta} msec at ${this.formatDate(this.lastRun[id])}; started at ${this.formatDate(this.started[id])}`);
    this.started[id] = null;
  };

  reset = (): void => {
    consoleLog('timing', null, `resetting all timeouts`);
    this.started = [];
    this.lastRun = [];
    this.dataChangeTimeout.forEach(t => clearTimeout(t));
    this.dataChangeTimeout = [];
  }
}
