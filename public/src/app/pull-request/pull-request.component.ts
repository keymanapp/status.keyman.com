import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-pull-request',
  templateUrl: './pull-request.component.html',
  styleUrls: ['./pull-request.component.css']
})
export class PullRequestComponent implements OnInit {
  @Input() pull: any;
  @Input() class?: string;

  constructor() { }

  ngOnInit() {
  }

  pullClass() {
    let base = this.pull.pull.node.milestone.title == 'Future' ? 'future ' : '';
    if(!this.pull.state) return base+'missing';
    switch(this.pull.state.state) {
      case 'SUCCESS': return base+'success';
      case 'PENDING': return base+'pending';
      default: return base+'failure';
    }
  }

  pullStatus() {
    let state: string = this.pull.pull.node.hovercard.contexts.reduce((a, c) => a || (c.__typename == "ReviewStatusHovercardContext" ? c.octicon : null), null);
    switch(state) {
      case "comment":         return "status-pending";
      case "check":           return "status-approved";
      case "request-changes": return "status-changes-requested";
    }

    return "status-pending";
  }

}
