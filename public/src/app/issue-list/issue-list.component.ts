import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { repoShortNameFromGithubUrl } from '../utility/repoShortNameFromGithubUrl';
import { escapeHtml } from '../utility/escapeHtml';
import { labelColor } from '../utility/labelColor';

@Component({
  selector: 'app-issue-list',
  templateUrl: './issue-list.component.html',
  styleUrls: ['./issue-list.component.css']
})
export class IssueListComponent implements OnInit {
  @Input() isNav: boolean;
  @Input() issues: any;
  @Input() repo?: any;
  @Input() milestone?: any;
  @Input() platform?: any;
  @Input() gravityX?: string;
  @Input() gravityY?: string;

  constructor(private sanitizer: DomSanitizer) { }

  pinned: boolean = false;

  ngOnInit() {
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';
  }

  pin() {
    this.pinned = !this.pinned;
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
