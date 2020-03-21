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
    let base = this.pull.pull.node.milestone ? this.pull.pull.node.milestone.title == 'Future' ? 'future ' : '' : '';
    if(!this.pull.state) return base+'missing';
    switch(this.pull.state.state) {
      case 'SUCCESS': return base+'success';
      case 'PENDING': return base+'pending';
      default: return base+'failure';
    }
  }

  pullStatus() {
    let authors = {};

    if(this.pull.pull.node.isDraft) return 'status-draft';

    if(this.pull.pull.node.labels.edges.find(node => node.node.name == 'work-in-progress') !== undefined) return 'status-draft';

    this.pull.pull.node.reviews.nodes.forEach(review => {
      if(!authors[review.author.login]) authors[review.author.login] = {reviews:[]};
      authors[review.author.login].reviews.push(review);
    });

    Object.entries(authors).forEach(entry => {
      (entry[1] as any).state = (entry[1] as any).reviews.reduce((a, c) => c.state == 'APPROVED' || c.state == 'CHANGES_REQUESTED' ? c.state : a, 'PENDING');
    });

    return Object.entries(authors).reduce(
      (a, c) =>
        (c[1] as any).state == 'CHANGES_REQUESTED' || a == 'status-changes-requested' ? 'status-changes-requested' :
        (c[1] as any).state == 'APPROVED' || a == 'status-approved' ? 'status-approved' : 'status-pending',
      'status-pending' // Initial value
    );
  }

}
