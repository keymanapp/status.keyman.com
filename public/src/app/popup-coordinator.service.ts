import { Injectable } from '@angular/core';

class PopupData {
  id: string;
  pinned: boolean;
  hover: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class PopupCoordinatorService {

  popups: {[id: string]: PopupData};

  constructor() {
    this.popups = {};
  }

  addPopup(id: string) {
    let data = this.popups[id];
    if(typeof data == 'undefined') {
      this.popups[id] = {
        id: id,
        pinned: false,
        hover: false
      };
    }
  }

  isPinned(id: string) {
    return this.popups[id] && this.popups[id].pinned;
  }

  togglePin(id: string) {
    if(this.popups[id]) {
      this.popups[id].pinned = !this.popups[id].pinned;
    }
  }
}
