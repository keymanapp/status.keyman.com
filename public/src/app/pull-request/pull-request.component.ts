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
    const pr = this.pull.pull.node;
    const base = pr.milestone ? pr.milestone.title == 'Future' ? 'future ' : '' : '';
    //if(this.pull.pull.node.commits?.nodes[0]?.commit?.checkSuites?.nodes[0]?.status == 'COMPLETED') {
    //One day, with optional chaining (nearly here)
    if(pr.commits && pr.commits.nodes && pr.commits.nodes.length && pr.commits.nodes[0].commit &&
        pr.commits.nodes[0].commit.checkSuites &&
        pr.commits.nodes[0].commit.checkSuites.nodes.length) {
      const checks = pr.commits.nodes[0].commit.checkSuites.nodes;
      let conclusion = '';
      for(let check of checks) {
        if(check.app == null) { 
          // GitHub will return a QUEUED null-app check. Not sure why.
          continue;
        }
        if(check.status == 'COMPLETED') {
          switch(check.conclusion) {
            case 'SUCCESS':  
              if(conclusion == '') conclusion = 'SUCCESS'; 
              break;
            case 'ACTION_REQUIRED':
            case 'TIMED_OUT':
            case 'FAILURE':
              conclusion = 'FAILURE'; //   return base+'failure';
              break;
            case 'CANCELLED':
            case 'SKIPPED':
            case 'STALE':
            case 'NEUTRAL':
            default:
              if(conclusion == '') conclusion = 'CANCELLED';
              //return base+'missing'; // various other states
          }
        } else {
          //IN_PROGRESS, QUEUED, REQUESTED
          conclusion = 'QUEUED';
          //return base+'pending';
        }
      }
      switch(conclusion) {
        case 'QUEUED': return base+'pending';
        case 'SUCCESS': return base+'success';
        case 'FAILURE': return base+'failure';
        default: return base+'missing';
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
