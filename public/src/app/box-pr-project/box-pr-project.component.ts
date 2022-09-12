import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-box-pr-project',
  templateUrl: './box-pr-project.component.html',
  styleUrls: ['./box-pr-project.component.css']
})
export class BoxPrProjectComponent implements OnInit {
  @Input() pullsByProject: any;
  @Input() changeCounter: number;
  @Input() status: any;

  constructor() { }

  ngOnInit(): void {
  }

}
