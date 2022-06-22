import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterIssueByLabel',
    pure: false
})
export class FilterIssueByLabelPipe implements PipeTransform {
    transform(items: any[], labelName: string): any {
        if (!items || !labelName) {
            return items;
        }
        // filter items array, items which match and return true will be
        // kept, false will be filtered out.
        return items.filter(item => item.labels.nodes.find(label => label.name == labelName));
    }
}
