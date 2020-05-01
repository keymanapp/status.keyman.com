import { Component, OnInit, Input } from '@angular/core';
import { siteSentryIds } from '../sites';

@Component({
  selector: 'app-sentry',
  templateUrl: './sentry.component.html',
  styleUrls: ['./sentry.component.css']
})
export class SentryComponent implements OnInit {
  @Input() platform?: string;
  @Input() site?: string;
  @Input() stats?: any;

  constructor() { }

  ngOnInit() {
  }

  projectIndex(): number {
    if(!this.platform) return 0;
    // TODO: consolidate with list in code.js
    const map = { ...siteSentryIds, ...{
      android:7,
      developer:6,
      ios:8,
      linux:12,
      mac:9,
      web:11,
      windows:5
      }
    };
    return map[this.platform];
  }

  sum(): number {
    if(!this.stats || this.stats.errorId || this.platform == 'common') return 0;
    return this.stats.reduce((count, item) => count + item[1], 0);
  }

  summary(): string {
    if(!this.stats || this.stats.errorId || this.platform == 'common') return '';
    return this.stats.reduce((res, item) => (res == '' ? '' : res + '\n') + new Date(item[0]*1000).toDateString() + ': '+item[1].toString(), '');
  }

}