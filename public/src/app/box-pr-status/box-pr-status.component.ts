import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-box-pr-status',
    templateUrl: './box-pr-status.component.html',
    styleUrls: ['./box-pr-status.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
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
