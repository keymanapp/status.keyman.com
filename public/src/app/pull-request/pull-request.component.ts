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
    //if(this.pull.pull.node.commits?.nodes[0]?.commit?.checkSuites?.nodes[0]?.status == 'COMPLETED') {
    //One day, with optional chaining (nearly here)
    if(this.pull.pull.node.commits && this.pull.pull.node.commits.nodes && this.pull.pull.node.commits.nodes.length && this.pull.pull.node.commits.nodes[0].commit &&
        this.pull.pull.node.commits.nodes[0].commit.checkSuites &&
        this.pull.pull.node.commits.nodes[0].commit.checkSuites.nodes.length) {
      if(this.pull.pull.node.commits.nodes[0].commit.checkSuites.nodes[0].status == 'COMPLETED') {
        switch(this.pull.pull.node.commits.nodes[0].commit.checkSuites.nodes[0].conclusion) {
          case 'SUCCESS':   return base+'success';
          case 'ACTION_REQUIRED':
          case 'TIMED_OUT':
          case 'FAILURE':   return base+'failure';
          case 'CANCELLED':
          case 'SKIPPED':
          case 'STALE':
          case 'NEUTRAL':
          default: return base+'missing'; // various other states
        }
      } else {
        //IN_PROGRESS, QUEUED, REQUESTED
        return base+'pending';
      }
    }
    if(!this.pull.state) return base+'missing';
    switch(this.pull.state.state) {
      case 'SUCCESS': return base+'success';
      case 'PENDING': return base+'pending';
      default: return base+'failure';
    }
  }

  pullIsCherryPick() {
    return this.pull.pull.node.labels.edges.reduce( (f, e) => f || e.node.name == 'cherry-pick', false);
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
