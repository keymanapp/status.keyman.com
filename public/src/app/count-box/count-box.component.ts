import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-count-box',
  templateUrl: './count-box.component.html',
  styleUrls: ['./count-box.component.css']
})
export class CountBoxComponent implements OnInit {
  @Input() repo?: string;
  @Input() title?: string;
  @Input() count?: number;
  @Input() class?: string;
  @Input() label?: string;
  @Input() isPulls: boolean;

  filter() {
    let f = "";
    if(this.label) {
      f += "+label%3A"+encodeURIComponent(this.label);
    } 
    if(this.class) {
      f += "+" + (this.title == 'Other' ? "no:milestone" : "milestone:"+this.title);
    }
    return f;
  }

  modeUri() {
    return this.isPulls ? "pulls" : "issues";
  }

  modeFilter() {
    return this.isPulls ? "is%3Apr" : "is%3Aissue";
  }

  constructor() { }

  ngOnInit() {
  }

}
