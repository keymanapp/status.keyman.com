import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { getAuthorAvatarUrl } from '../../../../shared/users';

@Component({
    selector: 'app-box-pr-author',
    templateUrl: './box-pr-author.component.html',
    styleUrls: ['./box-pr-author.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class BoxPrAuthorComponent implements OnInit {
  @Input() pullsByAuthor: any;
  @Input() changeCounter: number;
  @Input() status: any;

  constructor() { }

  ngOnInit(): void {
  }

  getAuthorAvatar(author, size) {
    return getAuthorAvatarUrl(author, size);
  }

}
