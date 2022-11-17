import fs from 'fs';
import path from 'path';

import applicationConfigPath from 'application-config-path';

export class SprintCache {
  private readonly cachePath: string;

  constructor() {
    this.cachePath = applicationConfigPath('status.keyman.com');
    fs.mkdirSync(this.cachePath, {recursive: true});
  }

  getCachePath(sprint: string, section: string): string {
    return path.join(this.cachePath, sprint + '-' + section + '.json');
  }

  getFileFromCache(sprint: string, section: string): string {
    const fn = this.getCachePath(sprint, section);
    if(fs.existsSync(fn)) {
      return fs.readFileSync(fn, 'utf-8');
    }
  }

  shouldCache(sprintStartDateTime: Date): boolean {
    let sprintEndDateTime = new Date(sprintStartDateTime);
    sprintEndDateTime.setDate(sprintEndDateTime.getDate()+12);
    return sprintEndDateTime.valueOf() < new Date().valueOf()
  }

  saveToCache(sprint: string, section: string, data: string) {
    const fn = this.getCachePath(sprint, section);
    fs.writeFileSync(fn, data);
  }
}