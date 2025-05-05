/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapptestbot implementation
 */

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';

@Component({
    selector: 'app-manual-test',
    templateUrl: './manual-test.component.html',
    styleUrls: ['./manual-test.component.css'],
    standalone: false
})
export class ManualTestComponent implements OnInit {
  prNumber: number;

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.prNumber = Number(params.get('id'));
        return null;
      })
    );
  }

  constructor(private route: ActivatedRoute) { }

}
