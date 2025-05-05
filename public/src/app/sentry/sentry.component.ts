import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { platformSentryIds } from '../../../../shared/platforms';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { PopupComponent } from '../popup/popup.component';
import { siteSentryIds } from '../sites';
import { escapeHtml } from '../utility/escapeHtml';
import { VisibilityService } from '../visibility/visibility.service';

@Component({
    selector: 'app-sentry',
    templateUrl: './sentry.component.html',
    styleUrls: ['./sentry.component.css'],
    standalone: false
})
export class SentryComponent extends PopupComponent implements OnInit, OnChanges {
  @Input() environment: string;
  @Input() platform?: string;
  @Input() site?: string;
  @Input() issues?: any;
  @Input() mode?: string;

  env: any;

  constructor(popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

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

  issueTrackBy(index, item) {
    return item.shortId;
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
    const map = { ...siteSentryIds, ...platformSentryIds };
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
