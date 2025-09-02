import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-box-pr-base',
    templateUrl: './box-pr-base.component.html',
    styleUrls: ['./box-pr-base.component.css'],
    standalone: false
})
export class BoxPrBaseComponent implements OnInit {
  @Input() pullsByBase: any;
  @Input() changeCounter: number;
  @Input() status: any;

  constructor() { }

  ngOnInit(): void {
  }

}
