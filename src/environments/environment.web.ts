import { Provider } from '@angular/core';
import { BibleDataService } from '../app/core/services/bible-data.service';
import { WebBibleService } from '../app/core/services/web-bible.service';

export const environment = {
  production: true,
  bibleProvider: { provide: BibleDataService, useClass: WebBibleService } as Provider,
};
