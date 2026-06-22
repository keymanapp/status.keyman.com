import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-box-pr-project',
    templateUrl: './box-pr-project.component.html',
    styleUrls: ['./box-pr-project.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class BoxPrProjectComponent implements OnInit {
  @Input() pullsByProject: any;
  @Input() changeCounter: number;
  @Input() status: any;

  constructor() { }

  ngOnInit(): void {
  }

}
