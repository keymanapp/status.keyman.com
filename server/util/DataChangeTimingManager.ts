export class DataChangeTimingManager {
  started: boolean[] = [];
  lastRun: Date[] = [];
  dataChangeTimeout: NodeJS.Timeout[] = [];

  isTooSoon = (id: string, minInterval: number, callback: () => void): boolean => {
    if (this.started[id] || this.lastRun[id] &&
        (new Date()).valueOf() - this.lastRun[id].valueOf() < minInterval) {

      //if(process.env['NODE_ENV'] != 'production') {
        if(this.isRunning(id))
          console.log(`DataChangeTimingManager: Data change for ${id} is still underway; waiting ${minInterval} milliseconds`);
        else
          console.log(`DataChangeTimingManager: Data change for ${id} is too soon; waiting ${minInterval} milliseconds`);
      //}

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
    this.started[id] = true;
  };

  finish = (id): void => {
    this.started[id] = false;
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
