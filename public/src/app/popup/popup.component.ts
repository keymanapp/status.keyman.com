import { Component, OnInit, Input } from '@angular/core';
import { PopupCoordinatorService } from '../popup-coordinator.service';

@Component({
  selector: 'app-popup',
  template: ``,
  styleUrls: ['./popup.component.css']
})
export class PopupComponent implements OnInit {
  @Input() gravityX?: string;
  @Input() gravityY?: string;

  popupId: string;

  get pinned(): boolean {
    return this.popupCoordinator.isPinned(this.popupId);
  }

  constructor(private popupCoordinator: PopupCoordinatorService) { }

  ngOnInit(): void {
    this.popupCoordinator.addPopup(this.popupId);
    if(!this.gravityX) this.gravityX = 'left';
    if(!this.gravityY) this.gravityY = 'bottom';
  }

  pin() {
    this.popupCoordinator.togglePin(this.popupId);
  }
}
