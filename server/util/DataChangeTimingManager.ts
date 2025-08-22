export class DataChangeTimingManager {
  started: Date[] = [];
  lastRun: Date[] = [];
  dataChangeTimeout: NodeJS.Timeout[] = [];

  isTooSoon = (id: string, minInterval: number, callback: () => void): boolean => {
    if (this.started[id] || this.lastRun[id] &&
        (new Date()).valueOf() - this.lastRun[id].valueOf() < minInterval) {

      console.log(
        `DataChangeTimingManager: Data change for ${id} is ${this.isRunning(id) ? 'still underway' : 'too soon'} `+
        `(started at ${(this.started[id] ?? '??').toString()}); waiting ${minInterval} milliseconds`
      );

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
    // this.lastRun[id] = new Date();
  };

  finish = (id): void => {
    this.started[id] = null;
    this.lastRun[id] = new Date();
  };

  reset = (): void => {
    console.log('DataChangeTimingManager: Resetting all timeouts');
    this.started = [];
    this.lastRun = [];
    this.dataChangeTimeout.forEach(t => clearTimeout(t));
    this.dataChangeTimeout = [];
  }
}
