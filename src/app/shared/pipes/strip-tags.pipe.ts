import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'stripTags', standalone: true, pure: true })
export class StripTagsPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value
      .replace(/<S>\d+<\/S>/g, '')
      .replace(/<pb\/>/g, '')
      .replace(/<f>[^<]*<\/f>/g, '')
      .replace(/<i>(.*?)<\/i>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
