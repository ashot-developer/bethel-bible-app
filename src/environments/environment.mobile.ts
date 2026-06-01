import { Provider } from '@angular/core';
import { BibleDataService } from '../app/core/services/bible-data.service';
import { CapacitorBibleService } from '../app/core/services/capacitor-bible.service';

export const environment = {
  production: true,
  bibleProvider: { provide: BibleDataService, useClass: CapacitorBibleService } as Provider,
};
