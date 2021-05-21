import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterObjectByDate',
    pure: false
})
export class FilterObjectByDatePipe implements PipeTransform {
    transform(items: any[], filter: Date): any {
        if (!items || !filter) {
            return items;
        }
        // filter items array, items which match and return true will be
        // kept, false will be filtered out.
        return items.filter(item => {
            let od = new Date(item.occurredAt);
            return od.getDate() == filter.getDate() && od.getMonth() == filter.getMonth() && od.getFullYear() == filter.getFullYear();
        }).sort(
            (a,b) => new Date(a.occurredAt).valueOf() - new Date(b.occurredAt).valueOf()
        );
    }
}
