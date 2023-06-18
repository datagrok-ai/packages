import * as DG from 'datagrok-api/dg';

import {Viewport} from '@datagrok-libraries/utils/src/transform';
import {layoutChart} from '../fit/fit-renderer';

import {category, expect, test} from '@datagrok-libraries/utils/src/test';


category('viewport', () => {
  test('viewportMethods', async () => {
    const screenBounds = new DG.Rect(120, 20, 160, 100).inflate(-6, -6);
    const [dataBox] = layoutChart(screenBounds);
    const dataBounds = new DG.Rect(0.1, 0.06, 7, 5.94);
    const viewport = new Viewport(dataBounds, dataBox, false, false);

		expect(viewport.xToScreen(1.5), 155.6);
		expect(viewport.yToScreen(2.33), 80.37037037037038);
		expect(viewport.xToWorld(150), 1.2351351351351352);
		expect(viewport.yToWorld(67), 3.232500000000001);
  });
});
