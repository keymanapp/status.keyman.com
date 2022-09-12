import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-box-pr-platform',
  templateUrl: './box-pr-platform.component.html',
  styleUrls: ['./box-pr-platform.component.css']
})
export class BoxPrPlatformComponent implements OnInit {
  @Input() platform: any;
  @Input() changeCounter: number;
  @Input() status: any;

  constructor() { }

  ngOnInit(): void {
  }

}
