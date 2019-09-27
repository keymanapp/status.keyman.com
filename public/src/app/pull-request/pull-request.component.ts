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
    if(!this.pull.state) return 'missing';
    switch(this.pull.state.state) {
      case 'SUCCESS': return 'success';
      case 'PENDING': return 'pending';
      default: return 'failure';
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
