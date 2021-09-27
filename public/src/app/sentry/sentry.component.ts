import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { PopupComponent } from '../popup/popup.component';
import { siteSentryIds } from '../sites';
import { escapeHtml } from '../utility/escapeHtml';

@Component({
  selector: 'app-sentry',
  templateUrl: './sentry.component.html',
  styleUrls: ['./sentry.component.css']
})
export class SentryComponent extends PopupComponent implements OnInit, OnChanges {
  @Input() environment: string;
  @Input() platform?: string;
  @Input() site?: string;
  @Input() issues?: any;
  @Input() mode?: string;

  env: any;

  ngOnInit() {
    this.popupId = 'sentry-'+this.environment+'-'+(this.platform ? this.platform : this.site);
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';
    this.env = this.issues && this.issues[this.environment] ? this.issues[this.environment] : {
      totalUsers: 0,
      totalEvents: 0,
      issues: []
    };
    super.ngOnInit();
  }

  ngOnChanges() {
    this.env = this.issues && this.issues[this.environment] ? this.issues[this.environment] : {
      totalUsers: 0,
      totalEvents: 0,
      issues: []
    };
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

  // annotations are returned in the form "<a href=\"https://github.com/keymanapp/status.keyman.com/issues/88\">keymanapp/status.keyman.com#88</a>"
  extractAnnotationLink(annotation: string): string {
    const res = /<a href="(.+)">/.exec(annotation);
    if(res) return res[1];
    return '';
  }

  extractAnnotationIssueNumber(annotation: string): string {
    const res = /<a href=".+\/(\d+)">/.exec(annotation);
    if(res) return res[1];
    return '';
  }

  getSentryIssueText() {
    if(!this.env) return '';
    const text =
      '<ul>' +
      this.env.issues.reduce(
        (text, node) => {
          return text + `<li>${escapeHtml(node.title)} (<a href='${node.permalink}'>${node.shortId}</a>)</li>\n`
        }, '') +
      '</ul>';
    return { content: text, type: 'text/html' };

  }
}
