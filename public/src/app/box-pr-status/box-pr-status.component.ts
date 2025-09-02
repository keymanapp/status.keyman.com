import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-box-pr-status',
    templateUrl: './box-pr-status.component.html',
    styleUrls: ['./box-pr-status.component.css'],
    standalone: false
})
export class BoxPrStatusComponent implements OnInit {

  @Input() pullsByStatus: any;
  @Input() changeCounter: number;
  @Input() status: any;
  @Input() userTestIssues: any;
  @Input() userTestIssuesPassed: any;
  @Input() pullStatusName: any;

  constructor() { }

  ngOnInit(): void {
  }

}
