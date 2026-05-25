import { Provider } from '@angular/core';
import { BibleDataService } from '../app/core/services/bible-data.service';
import { ElectronBibleService } from '../app/core/services/electron-bible.service';

export const environment = {
  production: false,
  bibleProvider: { provide: BibleDataService, useClass: ElectronBibleService } as Provider,
};
