import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {openDB} from 'idb';
import {computedAsync} from '@vueuse/core';

const DB_NAME = 'ComputeDB';
// should be aware of all components stores, since an upgrade in done
// on the entire db
const STORE_NAMES = ['RFV2Layouts', 'TreeWizardLayouts'];

export function useLayoutDb<S>() {
  const layoutDatabase = computedAsync(async () => {
    const db = await openDB<S>(DB_NAME, 2, {
      blocked: () => {
        grok.shell.error(`Layout database requires update. Please close all webpages with models opened.`);
      },
      upgrade: (db, oldVersion) => {
        for (const storeName of STORE_NAMES as any[]) {
          if (oldVersion === 0)
            db.createObjectStore(storeName);

          const hasStore = db.objectStoreNames.contains(storeName);
          if (!hasStore)
            db.createObjectStore(storeName);
        }
      },
    });
    return db;
  }, null);
  return {layoutDatabase};
}
