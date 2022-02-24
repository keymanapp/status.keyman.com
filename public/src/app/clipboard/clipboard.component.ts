import { Component, OnInit, Input } from '@angular/core';

// ClipboardItem and Clipboard.write are not yet in current types.d.ts
declare class ClipboardItem {
  constructor(data: { [mimeType: string]: Blob });
}

declare class Clipboard extends globalThis.Clipboard {
  write(items: [ClipboardItem]);
}

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
      let items: globalThis.ClipboardItems = [];
      let item = new globalThis.ClipboardItem({[clipText.type]: new Blob([clipText.content], {type: clipText.type}) });
      items.push(item);
      navigator.clipboard.write(items);
    } else {
      navigator.clipboard.writeText(clipText);
    }
  }
}
