import { ElementRef, ViewChild } from '@angular/core';
import { Component, OnInit, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { VisibilityService } from '../visibility/visibility.service';

@Component({
    selector: 'app-popup',
    template: ``,
    styleUrls: ['./popup.component.css'],
    standalone: false
})
export class PopupComponent implements OnInit {
  @Input() gravityX?: string;
  @Input() gravityY?: string;

  @ViewChild("wrapper") wrapper: ElementRef;

  isVisible: Observable<boolean>;

  popupId: string;

  get pinned(): boolean {
    return this.popupCoordinator.isPinned(this.popupId);
  }

  constructor(private popupCoordinator: PopupCoordinatorService, private visibilityService: VisibilityService) { }

  ngOnInit(): void {
    this.popupCoordinator.addPopup(this.popupId);
    if(!this.gravityX) this.gravityX = 'left';
    if(!this.gravityY) this.gravityY = 'bottom';
  }

  ngAfterViewInit() {
    if(this.wrapper) {
      this.isVisible = this.visibilityService.elementInSight(this.wrapper).pipe(filter(visible => visible), take(1));
    } else {
      this.isVisible = undefined;
    }
  }

  pin() {
    this.popupCoordinator.togglePin(this.popupId);
  }
}
