/*
 * Keyman is copyright (C) SIL Global. MIT License.
 */
import { Component, Input, OnInit } from '@angular/core';
import { PopupComponent } from '../popup/popup.component';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { VisibilityService } from '../visibility/visibility.service';
import { ServiceIdentifier, ServiceState } from '../../../../shared/services';

@Component({
  selector: 'app-service-state-popup',
  templateUrl: './service-state-popup.component.html',
  styleUrl: './service-state-popup.component.css',
  standalone: false,
})
export class ServiceStatePopupComponent extends PopupComponent implements OnInit {
  @Input() serviceState: {service: ServiceIdentifier, state: ServiceState, message?: string}[];

  constructor(popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

  ngOnInit() {
    this.popupId = 'service-state';
    this.gravityX = 'right';
    this.gravityY = 'bottom';
    super.ngOnInit();
  }

  overallStatus() {
    let icon = 'successful';
    for(const service of this.serviceState ?? []) {
      if(service.state == 'error') {
        icon = 'error';
      } else if(service.state == 'loading' && icon == 'successful') {
        icon = 'loading';
      }
    }
    return icon;
  }
}
