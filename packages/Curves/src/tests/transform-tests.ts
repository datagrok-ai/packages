import * as DG from 'datagrok-api/dg';

import {Viewport} from '@datagrok-libraries/utils/src/transform';
import {layoutChart, INFLATE_SIZE} from '../fit/fit-renderer';

import {category, expect, test} from '@datagrok-libraries/utils/src/test';


category('viewport', () => {
  test('viewportMethods', async () => {
    const screenBounds = new DG.Rect(120, 20, 160, 100).inflate(INFLATE_SIZE / 2, INFLATE_SIZE / 2);
    const [dataBox] = layoutChart(screenBounds, false, false);
    const dataBounds = new DG.Rect(0.1, 0.06, 7, 5.94);
    const viewport = new Viewport(dataBounds, dataBox, false, false);

		expect(viewport.xToScreen(1.5), 182.4);
		expect(viewport.yToScreen(2.33), 58.803030303030305);
		expect(viewport.xToWorld(150), -0.9652173913043479);
		expect(viewport.yToWorld(67), 1.2479999999999998);
  });
});
