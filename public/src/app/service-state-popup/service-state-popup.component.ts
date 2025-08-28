/*
 * Keyman is copyright (C) SIL Global. MIT License.
 */
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PopupComponent } from '../popup/popup.component';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { VisibilityService } from '../visibility/visibility.service';
import { ServiceIdentifier, ServiceState, ServiceStateRecord } from '../../../../shared/services';

@Component({
  selector: 'app-service-state-popup',
  templateUrl: './service-state-popup.component.html',
  styleUrl: './service-state-popup.component.css',
  standalone: false,
})
export class ServiceStatePopupComponent extends PopupComponent implements OnInit, OnDestroy {
  @Input() serviceState: (ServiceStateRecord & {service: ServiceIdentifier})[];

  private timerId = null;
  private currentTime: number = new Date().valueOf();

  constructor(popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

  ngOnInit() {
    this.timerId = setInterval(() => this.refresh(), 1000);
    this.popupId = 'service-state';
    this.gravityX = 'right';
    this.gravityY = 'bottom';
    super.ngOnInit();
  }

  ngOnDestroy() {
    if(this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
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

  refresh() {
    this.currentTime = new Date().valueOf();
  }

  lastChange(service: ServiceStateRecord): string {
    const value = Math.round((this.currentTime - service.lastStateChange)/1000);
    if(service.state == ServiceState.successful) {
      // Infrequent updates for 'loaded' state
      return value > 60 ? Math.round(value/60) + ' min' : '';
    } else if(service.state == ServiceState.loading) {
      // While loading, show the counter after 5 seconds
      return value > 5 ? value.toString() + ' sec' : '';
    }
    return value + ' sec';
  }
}
