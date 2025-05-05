import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'app-count-box',
    templateUrl: './count-box.component.html',
    styleUrls: ['./count-box.component.css'],
    standalone: false
})
export class CountBoxComponent implements OnInit {
  @Input() repo?: string;
  @Input() title?: string;
  @Input() count?: number;
  @Input() unfixedCount?: number;
  @Input() class?: string;
  @Input() label?: string;
  @Input() isPulls: boolean;
  @Input() alwaysShow: boolean;
  @Input() link?: string;

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
