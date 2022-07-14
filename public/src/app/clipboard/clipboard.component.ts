import { Component, OnInit, Input } from '@angular/core';

/*interface ClipboardItem {
  readonly types: string[];
  readonly presentationStyle: "unspecified" | "inline" | "attachment";
  getType(): Promise<Blob>;
}

interface ClipboardItemData {
  [mimeType: string]: Blob | string | Promise<Blob | string>;
}

declare var ClipboardItem: {
  prototype: ClipboardItem;
  new (itemData: ClipboardItemData): ClipboardItem;
};*/

@Component({
  selector: 'app-clipboard',
  templateUrl: './clipboard.component.html',
  styleUrls: ['./clipboard.component.css']
})
export class ClipboardComponent implements OnInit {
  @Input() text: any;
  @Input() title: any;
  @Input() context: any;

  loading: boolean = false;

  constructor() { }

  ngOnInit() {
  }

  finishCopying() {
    this.loading = false;
  }

  copyToClipboard() {
    this.loading = true;
    // async but we don't need to wait around for the answer
    const clipText =
      typeof this.text == 'function' ? this.text(this.context) : this.text;
    if(typeof clipText == 'object') {
      let items: ClipboardItems = [];
      let item = new ClipboardItem({[clipText.type]: new Blob([clipText.content], {type: clipText.type}) });
      items.push(item);
      navigator.clipboard.write(items).then(this.finishCopying.bind(this));
    } else {
      navigator.clipboard.writeText(clipText).then(this.finishCopying.bind(this));
    }
  }
}
