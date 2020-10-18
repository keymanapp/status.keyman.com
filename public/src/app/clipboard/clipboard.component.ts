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
      (navigator.clipboard as Clipboard).write([new ClipboardItem({[clipText.type]: new Blob([clipText.content], {type: clipText.type}) })]);
    } else {
      navigator.clipboard.writeText(clipText);
    }
  }
}
