import { DatePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { PopupComponent } from '../popup/popup.component';
import { escapeHtml } from '../utility/escapeHtml';
import { VisibilityService } from '../visibility/visibility.service';

@Component({
  selector: 'app-community-queue',
  templateUrl: './community-queue.component.html',
  styleUrls: ['./community-queue.component.css']
})
export class CommunityQueueComponent extends PopupComponent implements OnInit {
  @Input() queue: any;

  constructor(private sanitizer: DomSanitizer, popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService)
  }

  ngOnInit(): void {
    this.popupId = 'community-contributions';
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'top';
    super.ngOnInit();
  }

  getQueueTopics() {
    const pipe = new DatePipe('en');
    const text =
      '<ul>' +
      this.queue?.reduce(
        (text, topic) => {
          let output = '';
          let created = pipe.transform(topic.created_at, 'medium');
          let last = pipe.transform(topic.last_posted_at, 'medium');
          output +=
            `<li>${created}: <b>${escapeHtml(topic.title)}</b> `+
            `(<a href="https://community.software.sil.org/t/${topic.slug}/${topic.id}/${topic.highest_post_number}">#${topic.id}</a>), `+
            `<i>last updated ${last}</i></li>\n`;
          return text + output;
        }, '') +
      '</ul>';
    return { content: text, type: 'text/html' };
  }

}
