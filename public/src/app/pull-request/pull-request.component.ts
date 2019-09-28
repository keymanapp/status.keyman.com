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
    if(this.pull.pull.node.changesRequestedReviews.totalCount) {
      return "status-changes-requested";
    }
    if(this.pull.pull.node.approvedReviews.totalCount) {
      return "status-approved";
    }

    return "status-pending";
  }

}
