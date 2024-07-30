import {category, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';


category('Benchmarks: Detectors', () => {
  const df = grok.data.demo.demog(100000);
  const detectors: DG.Func[] = DG.Func.find({tags: ['semTypeDetector']});
  const cols: DG.Column[] = df.columns.byNames(['site', 'age', 'started', 'height']);
  grok.shell.closeTable(df);

  for (const d of detectors) {
    test(d.friendlyName, async () => {
      const res: any = [];
      let start: number;
      await d.package.load({ file: 'package.js'});
      await d.package.load({ file: d.options.file});
      for (const col of cols.slice()) {
        start = Date.now();
        await d.apply({col: col});
        res.push(Date.now() - start);
      }
      const maxTime = Math.max(...res);
      if (maxTime > 20) throw new Error(`time: ${maxTime} ms, expected <= 20 ms`);
      return `${maxTime} ms`;
    });
  }
});
