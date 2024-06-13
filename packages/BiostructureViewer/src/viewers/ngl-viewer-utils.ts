import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {Subject} from 'rxjs';
import * as ngl from 'NGL';

import {delay, testEvent} from '@datagrok-libraries/utils/src/test';

import {_package} from '../package';


export async function awaitNgl(ngl: ngl.Stage, callLogPrefix: string): Promise<void> {
  const onRendered = new Subject<void>();
  const onRenderedBnd = ngl.viewer.signals.rendered.add(() => { onRendered.next(); });
  const t1 = window.performance.now();
  await testEvent(onRendered,
    () => {
      onRenderedBnd.detach();
      const t2 = window.performance.now();
      _package.logger.debug(`${callLogPrefix}, creating NGL stage await ${t2 - t1} ms.`);
    },
    () => {
      ngl!.viewer.requestRender();
    }, 1000, 'timeout creating NGL stage await');
  await delay(50);
}
