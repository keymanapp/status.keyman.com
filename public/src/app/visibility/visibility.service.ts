import { Injectable, ElementRef } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable()
export class VisibilityService {
  elementInSight(element: ElementRef):Observable<boolean> {
    const el: Element = element.nativeElement;

    return new Observable<boolean>(observer => {
      const observerCallback = () => {
        observer.next(window.getComputedStyle(el).visibility == 'visible');
      };
      el.addEventListener('transitionend', observerCallback);
      return () => { el.removeEventListener('transitionend', observerCallback); };
    }).pipe(
      distinctUntilChanged()
    );
  }
}
