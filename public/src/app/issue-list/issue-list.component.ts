import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { repoShortNameFromGithubUrl } from '../utility/repoShortNameFromGithubUrl';
import { escapeHtml } from '../utility/escapeHtml';
import { labelColor } from '../utility/labelColor';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { PopupComponent } from '../popup/popup.component';

@Component({
  selector: 'app-issue-list',
  templateUrl: './issue-list.component.html',
  styleUrls: ['./issue-list.component.css']
})
export class IssueListComponent extends PopupComponent implements OnInit {
  @Input() isNav: boolean;
  @Input() issues: any;
  @Input() repo?: any;
  @Input() milestone?: any;
  @Input() platform?: any;

  constructor(private sanitizer: DomSanitizer, popupCoordinator: PopupCoordinatorService) {
    super(popupCoordinator);
  }

  ngOnInit() {
    this.popupId = 'issues-'+(this.platform ? this.platform.value.id : this.repo)+'-'+this.milestone?.title;
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';
    super.ngOnInit();
  }

  labelColor(label) {
    return this.sanitizer.bypassSecurityTrustStyle(labelColor(label));
  }

  labelName(label: string) {
    return label.replace(/-/g, '‑');
  }

  getIssueListText() {
    if(!this.issues) return null;

    const text =
      '<ul>' +
      this.issues.reduce(
        (text, node) => {
          const repo = repoShortNameFromGithubUrl(node.url);
          const check = node.timelineItems && node.timelineItems.nodes.length ? '✔ ' : '';
          const prs = check
            ? node.timelineItems.nodes.reduce(
                (current, pr) => `${current} <a href='${pr.subject.url}'>#${pr.subject.number}</a>`, ' 🔗 '
              )
            : '';
          return text + `<li>${check}${escapeHtml(node.title)} (<a href='${node.url}'>${repo}#${node.number}</a>)${prs}</li>\n`
        }, '') +
      '</ul>';
    return { content: text, type: 'text/html' };
  }

  errorClassIfNonZero(v) {
    if(v !== null && v != 0) return "failure";
    return "";
  }

}
