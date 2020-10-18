import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { repoShortNameFromGithubUrl } from '../utility/repoShortNameFromGithubUrl';
import { escapeHtml } from '../utility/escapeHtml';

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

  issueColor(issue) {
    return this.sanitizer.bypassSecurityTrustStyle('background: #'+issue.color+'; color: '+this.contrast(issue.color));
  }

  /* Contrasting function from https://medium.com/better-programming/generate-contrasting-text-for-your-random-background-color-ac302dc87b4 */

  labelName(label: string) {
    return label.replace(/-/g, '‑');
  }

  rgbToYIQ({r, g, b}) {
    return ((r * 299) + (g * 587) + (b * 114)) / 1000;
  }

  hexToRgb(hex) {
    if (!hex || hex === undefined || hex === '') {
      return undefined;
    }

    const result =
          /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : undefined;
  }

  contrast(colorHex, threshold = 128) {
    if (colorHex === undefined) {
      return '#000';
    }

    const rgb = this.hexToRgb(colorHex);

    if (rgb === undefined) {
      return '#000';
    }

    return this.rgbToYIQ(rgb) >= threshold ? '#000' : '#fff';
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
