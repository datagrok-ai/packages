import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {
  category,
  test,
  expect
} from '@datagrok-libraries/utils/src/test';

category('Files: OpenFile', () => {
  test('Open big csv', async () => {
    const df: DG.DataFrame = await grok.functions.call('OpenFile', {'fullPath': 'System:DemoFiles/chem/zbb/99_p0_ph7.csv'});
    expect(df.name, '99_p0_ph7', 'Table name differs');
    expect(df.rowCount, 574356);
  }, {stressTest: true});

  test('Open small csv', async () => {
    const df: DG.DataFrame = await grok.functions.call('OpenFile', {'fullPath': 'System:DemoFiles/cars.csv'});
    expect(df.name, 'cars', 'Table name differs');
    expect(df.rowCount, 30);
  }, {stressTest: true});

  test('Project with big table csv', async () => {
    const projectName = 'Test tables > 20mb';
    try {
      const df: DG.DataFrame = await grok.functions.call('OpenFile', {'fullPath': 'System:DemoFiles/chem/zbb/99_p0_ph7.csv'});
      const v = grok.shell.addTableView(df);
      const ti = df.getTableInfo();
      const layout = v.saveLayout();
      let project = DG.Project.create();
      project.name = projectName;
      project.addChild(ti);
      project.addChild(layout);
      await grok.dapi.layouts.save(layout);
      await grok.dapi.tables.uploadDataFrame(df);
      await grok.dapi.tables.save(ti);
      await grok.dapi.projects.save(project);
      grok.shell.closeAll();
      await grok.dapi.projects.open((await grok.dapi.projects.filter(project.name).first()).name);
      expect(grok.shell.t?.name, df.name);
      expect(grok.shell.t?.rowCount, df.rowCount);
      expect(grok.shell.project?.name, project.name);
      grok.shell.closeAll();
    } finally {
      try {
        await grok.dapi.projects.delete(await grok.dapi.projects.filter(projectName).first());
      } catch (_) {}
    }
  }, {timeout: 120000, stressTest: true});
});

