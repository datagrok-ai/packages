/* eslint-disable max-lines-per-function */
import {category, test, expect, before, delay, awaitCheck} from '@datagrok-libraries/utils/src/test';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {SubstructureFilter} from '../widgets/chem-substructure-filter';
import {readDataframe} from './utils';
import {_package} from '../package-test';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import {FILTER_SCAFFOLD_TAG, SubstructureSearchType} from '../constants';
import { sketchersWarmUp } from './sketcher-tests';

type FilterPanel = {
    filter: SubstructureFilter,
    group: DG.FilterGroup
}

const molFileForCloneTest1 = `
MJ201900                      

  6  6  0  0  0  0  0  0  0  0999 V2000
   -0.6919    0.4455    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.4064    0.0330    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.4064   -0.7920    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6919   -1.2044    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0225   -0.7920    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0225    0.0330    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  6  1  0  0  0  0
  2  3  1  0  0  0  0
  3  4  1  0  0  0  0
  4  5  1  0  0  0  0
  5  6  1  0  0  0  0
M  END
`;

const molFileForCloneTest2 = `
MJ201900                      

  6  6  0  0  0  0  0  0  0  0999 V2000
   -0.1786    0.8920    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8930    0.4795    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8930   -0.3455    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.1786   -0.7580    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5358   -0.3455    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5358    0.4795    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  2  0  0  0  0
  2  3  1  0  0  0  0
  3  4  2  0  0  0  0
  4  5  1  0  0  0  0
  5  6  2  0  0  0  0
  6  1  1  0  0  0  0
M  END
`;

const molFileForCloneTest3 = `
Actelion Java MolfileCreator 1.0

  2  1  0  0  0  0  0  0  0  0999 V2000
    9.3750  -10.6250   -0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   10.6740   -9.8750   -0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
M  END
`;

category('clone and layout tests', async () => {
  before(async () => {
    if (!chemCommonRdKit.moduleInitialized) {
      chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
      await chemCommonRdKit.initRdKitModuleLocal();
    }
    const funcs = DG.Func.find({tags: ['moleculeSketcher']});
    await sketchersWarmUp(funcs);
    DG.chem.currentSketcherType = 'OpenChemLib';
  });

  test('1_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvInitial);
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeView(tvCloned);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('2_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeView(tvCloned);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('3_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    switchToView(tvInitial);
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeView(tvCloned);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('4_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeView(tvCloned);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('5_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvCloned);
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeView(tvCloned);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('6_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeView(tvCloned);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('7_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvInitial);
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeView(tvInitial);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('8_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeView(tvInitial);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('9_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await switchToView(tvInitial);
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeView(tvInitial);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('10_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeView(tvInitial);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('11_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvCloned);
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeView(tvInitial);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('12_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeView(tvInitial);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('13_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const clonedFilterAndFilterGroup = await getFilterGroupAndFilter(tvCloned, 'Structure');
    const filter2 = clonedFilterAndFilterGroup.filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvInitial);
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeFilterGroup(clonedFilterAndFilterGroup.group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('14_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const clonedFilterAndFilterGroup = await getFilterGroupAndFilter(tvCloned, 'Structure');
    const filter2 = clonedFilterAndFilterGroup.filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeFilterGroup(clonedFilterAndFilterGroup.group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('15_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const clonedFilterAndFilterGroup = await getFilterGroupAndFilter(tvCloned, 'Structure');
    const filter2 = clonedFilterAndFilterGroup.filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    switchToView(tvInitial);
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeFilterGroup(clonedFilterAndFilterGroup.group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('16_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeFilterGroup((await getFilterGroupAndFilter(tvCloned, 'Structure')).group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('17_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvCloned);
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeFilterGroup((await getFilterGroupAndFilter(tvCloned, 'Structure')).group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('18_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeFilterGroup((await getFilterGroupAndFilter(tvCloned, 'Structure')).group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('19_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvInitial);
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeFilterGroup((await getFilterGroupAndFilter(tvInitial, 'Structure')).group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('20_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeFilterGroup((await getFilterGroupAndFilter(tvInitial, 'Structure')).group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('21_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await switchToView(tvInitial);
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layout, df, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeFilterGroup((await getFilterGroupAndFilter(tvInitial, 'Structure')).group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('22_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const initialFilterAndFilterGroup = await getFilterGroupAndFilter(tvInitial, 'Structure');
    const filter1 = initialFilterAndFilterGroup.filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeFilterGroup(initialFilterAndFilterGroup.group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('23_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const initialFilterAndFilterGroup = await getFilterGroupAndFilter(tvInitial, 'Structure');
    const filter1 = initialFilterAndFilterGroup.filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvCloned);
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeFilterGroup(initialFilterAndFilterGroup.group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('24_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const initialFilterAndFilterGroup = await getFilterGroupAndFilter(tvInitial, 'Structure');
    const filter1 = initialFilterAndFilterGroup.filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    const layout = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layout, df, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeFilterGroup(initialFilterAndFilterGroup.group);
    //check that filter is still active on df
    expect(df.filter.trueCount, 5, 'incorrect filter value');
  });

  test('25_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const clonedFilterAndFilterGroup = await getFilterGroupAndFilter(tvCloned, 'Structure');
    await closeFilterGroup(clonedFilterAndFilterGroup.group);
    await switchToView(tvInitial);
    const layoutInitial = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layoutInitial, df, 5);
    await switchToView(tvCloned);
    await getFilterGroupAndFilter(tvCloned, 'Structure');
    const layoutCloned = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    //apply layout from cloned view to initial view
    await applyLayout(tvInitial, layoutCloned, df, 5);
  });

  test('26_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const clonedFilterAndFilterGroup = await getFilterGroupAndFilter(tvCloned, 'Structure');
    const filter2 = clonedFilterAndFilterGroup.filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await closeFilterGroup(clonedFilterAndFilterGroup.group);
    const layoutInitial = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layoutInitial, df, 5);
    //after layout apply new filter has been created (previous filter is detached)
    const filter1_1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await switchToView(tvCloned);
    await getFilterGroupAndFilter(tvCloned, 'Structure');
    const layoutCloned = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layoutCloned, df, 5);
    await checkFilterSynchronized(filter1_1, 'C1CCCCC1');
  });

  test('27_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    const tvCloned = await cloneView(tvInitial, df);
    const clonedFilterAndFilterGroup = await getFilterGroupAndFilter(tvCloned, 'Structure');
    const filter2 = clonedFilterAndFilterGroup.filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await closeFilterGroup(clonedFilterAndFilterGroup.group);
    await switchToView(tvInitial);
    const layoutInitial = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layoutInitial, df, 5);
    const filter1_1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await switchToView(tvCloned);
    await getFilterGroupAndFilter(tvCloned, 'Structure');
    const layoutCloned = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvCloned, layoutCloned, df, 5);
    await checkFilterSynchronized(filter1_1, 'C1CCCCC1');
  });

  test('28_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const initialFilterAndFilterGroup = await getFilterGroupAndFilter(tvInitial, 'Structure');
    const filter1 = initialFilterAndFilterGroup.filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvInitial);
    const layoutInitial = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await closeFilterGroup(initialFilterAndFilterGroup.group);
    //check that df is still filtered after filter panel was closed
    expect(df.filter.trueCount, 3, 'incorrect filter value');
    await applyLayout(tvInitial, layoutInitial, df, 5);
    const filter1_1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvCloned);
    const layoutCloned = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layoutCloned, df, 5);
    await checkFilterSynchronized(filter1_1, 'C1CCCCC1');
  });

  test('29_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const initialFilterAndFilterGroup = await getFilterGroupAndFilter(tvInitial, 'Structure');
    const filter1 = initialFilterAndFilterGroup.filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await switchToView(tvInitial);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    const layoutInitial = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await closeFilterGroup(initialFilterAndFilterGroup.group);
    expect(df.filter.trueCount, 3, 'incorrect filter value');
    await applyLayout(tvInitial, layoutInitial, df, 5);
    const filter1_1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvCloned);
    const layoutCloned = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layoutCloned, df, 5);
    await checkFilterSynchronized(filter1_1, 'C1CCCCC1');
  });

  test('30_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const initialFilterAndFilterGroup = await getFilterGroupAndFilter(tvInitial, 'Structure');
    const filter1 = initialFilterAndFilterGroup.filter;
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await initializeFilter(filter2);
    await filterByStructure(df, filter2, molFileForCloneTest1, 5);
    await checkFilterSynchronized(filter1, 'C1CCCCC1');
    await switchToView(tvInitial);
    const layoutInitial = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Core', molFileForCloneTest3, df, 3);
    await closeFilterGroup(initialFilterAndFilterGroup.group);
    expect(df.filter.trueCount, 3, 'incorrect filter value');
    await applyLayout(tvInitial, layoutInitial, df, 5);
    const filter1_1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvCloned);
    const layoutCloned = await saveLayout(tvCloned);
    await changeFilterBeforeApplyLayout(tvCloned, 'Core', molFileForCloneTest3, df, 3);
    await applyLayout(tvInitial, layoutCloned, df, 5);
    await checkFilterSynchronized(filter1_1, 'C1CCCCC1');
  });

  test('31_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    //wait for grid to render
    await delay(50);
    await useAsFilter(tvInitial, molFileForCloneTest1, 5);
    const layoutInitial = await saveLayout(tvInitial);
    const tvCloned = await cloneView(tvInitial, df);
    const filter2 = (await getFilterGroupAndFilter(tvCloned, 'Structure')).filter;
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await switchToView(tvInitial);
    const initialFilterAndFilterGroup = await getFilterGroupAndFilter(tvInitial, 'Structure');
    const filter1 = initialFilterAndFilterGroup.filter;

    //change search type in initial filter and check that cloned filter is synchronized
    filter1.searchTypeInput.value = SubstructureSearchType.IS_SIMILAR;
    await awaitCheck(() => df.filter.trueCount === 0, 'df hasn\'t been filtered after search type changed', 3000);
    await delay(1000);
    filter1.similarityCutOffInput.value = 0.03;
    await awaitCheck(() => df.filter.trueCount === 25, 'df hasn\'t been filtered after search type changed', 3000);
    await awaitCheck(() => filter2.searchType === SubstructureSearchType.IS_SIMILAR &&
      filter2.similarityCutOff === 0.03 && filter2.sketcher.getSmiles() === 'C1CCCCC1',
    'search type hasn\'t been synchronized', 3000);

    await closeFilterGroup(initialFilterAndFilterGroup.group);
    await switchToView(tvCloned);
    await applyLayout(tvCloned, layoutInitial, df, 5);
    await closeFilterGroup((await getFilterGroupAndFilter(tvCloned, 'Structure')).group);

    //check that filter and highlight have been reset
    await awaitCheck(() => df.filter.trueCount === 100, 'filter hasn\'t been reset', 3000);
    await awaitCheck(() => df.col('Structure')!.temp[FILTER_SCAFFOLD_TAG] === null,
      'highlight hasn\'t been reset after all filter closed', 3000);
  });

  test('32_clone_layout_scenario', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const initialFilterAndFilterGroup = await getFilterGroupAndFilter(tvInitial, 'Structure');
    const filter1 = initialFilterAndFilterGroup.filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5);
    await closeFilterGroup(initialFilterAndFilterGroup.group);
    //check that filter and highlight have been reset
    await awaitCheck(() => df.filter.trueCount === 100, 'filter hasn\'t been reset', 3000);
    await awaitCheck(() => df.col('Structure')!.temp[FILTER_SCAFFOLD_TAG] === null,
      'highlight hasn\'t been reset after all filter closed', 3000);
  });

  test('simple layout apply', async () => {
    const df = await readDataframe('tests/spgi-100.csv');
    const tvInitial = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tvInitial, 'Structure')).filter;
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 5); ;
    const layout = await saveLayout(tvInitial);
    await changeFilterBeforeApplyLayout(tvInitial, 'Structure', molFileForCloneTest2, df, 32, true);
    await applyLayout(tvInitial, layout, df, 5);
  });

  test('apply_multiple_layouts_at_once', async () => {
    const df = await readDataframe('tests/smi10K.csv');
    const tv1 = await createTableView(df);
    const filter1 = (await getFilterGroupAndFilter(tv1, 'smiles')).filter;
    const tv2 = await cloneView(tv1, df);
    const filter2 = (await getFilterGroupAndFilter(tv2, 'smiles')).filter;
    const tv3 = await cloneView(tv1, df);
    const filter3 = (await getFilterGroupAndFilter(tv3, 'smiles')).filter;
    await switchToView(tv1);
    await initializeFilter(filter1);
    await filterByStructure(df, filter1, molFileForCloneTest1, 462);
    await checkFilterSynchronized(filter2, 'C1CCCCC1');
    await checkFilterSynchronized(filter3, 'C1CCCCC1');
    const layout1 = await saveLayout(tv1);
    const layout2 = await saveLayout(tv2);
    const layout3 = await saveLayout(tv3);
    await changeFilterBeforeApplyLayout(tv1, 'smiles', molFileForCloneTest2, df, 8970, true);
    await checkFilterSynchronized(filter2, 'c1ccccc1');
    await checkFilterSynchronized(filter3, 'c1ccccc1');
    tv1.loadLayout(layout1);
    tv2.loadLayout(layout2);
    tv3.loadLayout(layout3);
    await awaitCheck(() => df.filter.trueCount === 462, 'layout hasn\'t been applied', 10000);
  });
});

async function createTableView(df: DG.DataFrame): Promise<DG.TableView> {
  await grok.data.detectSemanticTypes(df);
  const tvInitial = grok.shell.addTableView(df);
  return tvInitial;
}

async function getFilterGroupAndFilter(tv: DG.TableView, colName: string): Promise<FilterPanel> {
  //open filter panel
  const fg = tv.getFiltersGroup();
  //wait for filters added to filter panel
  await awaitCheck(() => fg.filters.length !== 0, 'filter panel hasn\'t been created', 3000);
  //get required filter from filter panel
  const filter = fg.filters.filter((it: any) => it?.columnName === colName)[0] as SubstructureFilter;
  return {group: fg, filter: filter};
}


async function initializeFilter(filter: SubstructureFilter, withMolecule?: boolean): Promise<void> {
  //open sketcher to initialize sketcher (need for sketcher to send onChanged events)
  await ui.tools.waitForElementInDom(withMolecule ? filter.sketcher.extSketcherCanvas :
    filter.sketcher.emptySketcherLink); //need to wait for Sketch button to appear in DOM to click it
  withMolecule ? filter.sketcher.extSketcherCanvas.click() : filter.sketcher.emptySketcherLink.click();
  await awaitCheck(() => filter.sketcher.sketcher?.isInitialized === true,
    `${DG.chem.currentSketcherType} sketcher hasn't been initialized`, 3000);
  //close sketcher
  const sketcherDlg = document.getElementsByClassName('d4-dialog')[0];
  Array.from(sketcherDlg!.getElementsByTagName('span')).find((el) => el.textContent === 'OK')?.click();
}

async function filterByStructure(df: DG.DataFrame, filter: SubstructureFilter, molfile: string, trueCount: number) {
  //setting structure and wait for results
  filter.sketcher.setMolFile(molfile);
  await awaitCheck(() => df.filter.trueCount === trueCount, 'df hasn\'t been filtered', 10000);
}

async function useAsFilter(tv: DG.TableView, molfile: string, trueCount: number) {
  tv.getFiltersGroup({createDefaultFilters: false}).updateOrAdd({
    type: DG.FILTER_TYPE.SUBSTRUCTURE,
    column: 'Structure',
    columnName: 'Structure',
    molBlock: molfile,
  }, false);
  await awaitCheck(() => tv.dataFrame.filter.trueCount === trueCount, 'df hasn\'t been filtered', 3000);
}

async function checkFilterSynchronized(filter: SubstructureFilter, smiles: string) {
  //check that structure in filter has been updated
  await awaitCheck(() => filter.sketcher.getSmiles() === smiles,
    'structure in filter in cloned view hasn\'t been updated', 3000);
}

async function cloneView(viewToClone: DG.TableView, df: DG.DataFrame) {
  //cloning view
  const l = viewToClone.saveLayout();
  const tvCloned = grok.shell.addTableView(df);
  await delay(50);
  tvCloned.loadLayout(l);
  await delay(50);
  return tvCloned;
}

async function changeFilterBeforeApplyLayout(tv: DG.TableView, colName: string,
  molfile: string, df: DG.DataFrame, expectedRows: number, filterInitialized = false, sketcherWithMolecule = false) {
  const panel = await getFilterGroupAndFilter(tv, colName);
  const filter3 = panel.filter;
  if (!filterInitialized)
    await initializeFilter(filter3, sketcherWithMolecule);
  await filterByStructure(df, filter3, molfile, expectedRows);
}

async function switchToView(tableView: DG.TableView) {
  grok.shell.v = tableView;
  await delay(50);
}

async function saveLayout(tableView: DG.TableView): Promise<DG.ViewLayout> {
  const layout = tableView.saveLayout();
  return layout;
}

async function applyLayout(tv: DG.TableView, layout: DG.ViewLayout, df: DG.DataFrame, trueCount: number) {
  //apply saved layout
  tv.loadLayout(layout);
  //waiting for layout to be applied
  await awaitCheck(() => df.filter.trueCount === trueCount, 'layout hasn\'t been applied', 3000);
}

async function closeView(tv: DG.TableView) {
  const name = tv.name;
  tv.close();
  //wait for view to close
  await awaitCheck(() => {
    for (const i of grok.shell.tableViews) {
      if (i.name === name)
        return false;
    }
    return true;
  }, 'cloned view hasn\'t been closed', 3000);
}

async function closeFilterGroup(fg: DG.FilterGroup) {
  fg.close();
  await delay(50);
}


