import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-box-pr-author',
  templateUrl: './box-pr-author.component.html',
  styleUrls: ['./box-pr-author.component.css']
})
export class BoxPrAuthorComponent implements OnInit {
  @Input() pullsByAuthor: any;
  @Input() changeCounter: number;
  @Input() status: any;

  constructor() { }

  ngOnInit(): void {
  }

}
