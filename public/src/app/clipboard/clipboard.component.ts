import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-clipboard',
  templateUrl: './clipboard.component.html',
  styleUrls: ['./clipboard.component.css']
})
export class ClipboardComponent implements OnInit {
  @Input() text: any;
  @Input() title: any;

  constructor() { }

  ngOnInit() {
  }

  copyToClipboard() {
    // async but we don't need to wait around for the answer
    const clipText =
      typeof this.text == 'function' ? this.text() : this.text;
    if(typeof clipText == 'object') {
      let items: ClipboardItems = [];
      let item = new ClipboardItem({[clipText.type]: new Blob([clipText.content], {type: clipText.type}) });
      items.push(item);
      navigator.clipboard.write(items);
    } else {
      navigator.clipboard.writeText(clipText);
    }
  }
}
