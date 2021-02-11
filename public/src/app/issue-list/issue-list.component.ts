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
  @Input() issues: any;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
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
          return text + `<li>${escapeHtml(node.title)} (<a href='${node.url}'>${repo}#${node.number}</a>)</li>\n`
        }, '') +
      '</ul>';
    return { content: text, type: 'text/html' };
  }
}
