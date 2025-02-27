/* eslint-disable max-lines-per-function */
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import $ from 'cash-dom';
import {fromEvent} from 'rxjs';

import {category, expect, test, delay, testEvent, before} from '@datagrok-libraries/utils/src/test';
import {ALIGNMENT, ALPHABET, NOTATION, TAGS as bioTAGS} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {ISeqHelper, getSeqHelper} from '@datagrok-libraries/bio/src/utils/seq-helper';
import {ISeqHandler} from '@datagrok-libraries/bio/src/utils/macromolecule/seq-handler';
import {generateLongSequence, generateManySequences} from '@datagrok-libraries/bio/src/utils/generator';

import {convertDo} from '../utils/convert';
import {performanceTest} from './utils/sequences-generators';
import {multipleSequenceAlignmentUI} from '../utils/multiple-sequence-alignment-ui';
import {awaitGrid} from './utils';
import * as C from '../utils/constants';

import {_package} from '../package-test';

category('renderers', () => {
  let seqHelper: ISeqHelper;

  before(async () => {
    seqHelper = await getSeqHelper();
  });

  test('long sequence performance ', async () => {
    await performanceTest(generateLongSequence, 'Long sequences');
  });

  test('many sequence performance', async () => {
    await performanceTest(generateManySequences, 'Many sequences');
  });

  test('rendererMacromoleculeFasta', async () => {
    await _rendererMacromoleculeFasta();
  });

  test('rendererMacromoleculeSeparator', async () => {
    await _rendererMacromoleculeSeparator();
  });

  test('rendererMacromoleculeDifference', async () => {
    await _rendererMacromoleculeDifference();
  });

  test('afterMsa', async () => {
    await _testAfterMsa();
  });

  test('afterConvert', async () => {
    await _testAfterConvert();
  });

  test('afterConvertToHelm', async () => {
    await _testAfterConvertToHelm();
  });

  test('selectRendererBySemType', async () => {
    await _selectRendererBySemType();
  });

  test('scatterPlotTooltip', async () => {
    await _testScatterPlotTooltip();
  }, {skipReason: 'GROK-17450'});

  async function _rendererMacromoleculeFasta() {
    const csv: string = await grok.dapi.files.readAsText('System:AppData/Bio/samples/FASTA.csv');
    const df: DG.DataFrame = DG.DataFrame.fromCsv(csv);

    const seqCol = df.getCol('Sequence');
    const semType: string = await grok.functions.call('Bio:detectMacromolecule', {col: seqCol});
    if (semType)
      seqCol.semType = semType;

    const tv: DG.TableView = grok.shell.addTableView(df);
    // call to calculate 'cell.renderer' tag
    await grok.data.detectSemanticTypes(df);

    await awaitGrid(tv.grid);
    expect(tv.grid.dataFrame.id, df.id);

    const resCellRenderer = seqCol.getTag(DG.TAGS.CELL_RENDERER);
    expect(resCellRenderer, 'sequence');
  }

  async function _rendererMacromoleculeSeparator() {
    const csv: string = await grok.dapi.files.readAsText('System:AppData/Bio/samples/SEPARATOR_PT.csv');
    const df: DG.DataFrame = DG.DataFrame.fromCsv(csv);

    const seqCol = df.getCol('sequence');
    const semType: string = await grok.functions.call('Bio:detectMacromolecule', {col: seqCol});
    if (semType)
      seqCol.semType = semType;

    const tv: DG.TableView = grok.shell.addTableView(df);
    // call to calculate 'cell.renderer' tag
    await grok.data.detectSemanticTypes(df);

    await awaitGrid(tv.grid);
    expect(tv.grid.dataFrame.id, df.id);

    const resCellRenderer = seqCol.getTag(DG.TAGS.CELL_RENDERER);
    expect(resCellRenderer, 'sequence');
  }

  async function _rendererMacromoleculeDifference() {
    const seqDiffCol: DG.Column = DG.Column.fromStrings('SequencesDiff',
      ['meI/hHis/Aca/N/T/dK/Thr_PO3H2/Aca#D-Tyr_Et/Tyr_ab-dehydroMe/meN/E/N/dV']);
    seqDiffCol.meta.units = NOTATION.SEPARATOR;
    seqDiffCol.setTag(bioTAGS.separator, '/');
    seqDiffCol.setTag(bioTAGS.aligned, 'SEQ');
    seqDiffCol.setTag(bioTAGS.alphabet, 'UN');
    seqDiffCol.setTag(bioTAGS.alphabetIsMultichar, 'true');
    seqDiffCol.semType = C.SEM_TYPES.MACROMOLECULE_DIFFERENCE;
    const df = DG.DataFrame.fromColumns([seqDiffCol]);

    const tv: DG.TableView = grok.shell.addTableView(df);
    // call to calculate 'cell.renderer' tag
    await grok.data.detectSemanticTypes(df);

    await awaitGrid(tv.grid);
    expect(tv.grid.dataFrame.id, df.id);

    const resCellRenderer = seqDiffCol.getTag(DG.TAGS.CELL_RENDERER);
    expect(resCellRenderer, C.SEM_TYPES.MACROMOLECULE_DIFFERENCE);
  }

  async function _testAfterMsa() {
    const fastaTxt: string = await grok.dapi.files.readAsText('System:AppData/Bio/samples/FASTA.fasta');
    const df = (await grok.functions.call('Bio:importFasta', {fileContent: fastaTxt}))[0] as DG.DataFrame;

    const srcSeqCol: DG.Column = df.getCol('sequence');
    const semType: string = await grok.functions.call('Bio:detectMacromolecule', {col: srcSeqCol});
    if (semType)
      srcSeqCol.semType = semType;

    const tv: DG.TableView = grok.shell.addTableView(df);
    // call to calculate 'cell.renderer' tag
    await grok.data.detectSemanticTypes(df);

    console.log('Bio: tests/renderers/afterMsa, table view');
    await awaitGrid(tv.grid);
    expect(tv.grid.dataFrame.id, df.id);

    console.log('Bio: tests/renderers/afterMsa, src before test ' +
      `semType="${srcSeqCol!.semType}", units="${srcSeqCol!.meta.units}", ` +
      `cell.renderer="${srcSeqCol!.getTag(DG.TAGS.CELL_RENDERER)}"`);
    expect(srcSeqCol.semType, DG.SEMTYPE.MACROMOLECULE);
    expect(srcSeqCol.meta.units, NOTATION.FASTA);
    expect(srcSeqCol.getTag(bioTAGS.aligned), ALIGNMENT.SEQ);
    expect(srcSeqCol.getTag(bioTAGS.alphabet), ALPHABET.PT);
    expect(srcSeqCol.getTag(DG.TAGS.CELL_RENDERER), 'sequence');

    const msaSeqCol = await multipleSequenceAlignmentUI({col: srcSeqCol}, seqHelper);
    await awaitGrid(tv.grid);
    expect(tv.grid.dataFrame.id, df.id);

    expect(msaSeqCol.semType, DG.SEMTYPE.MACROMOLECULE);
    expect(msaSeqCol.meta.units, NOTATION.FASTA);
    expect(msaSeqCol.getTag(bioTAGS.aligned), ALIGNMENT.SEQ_MSA);
    expect(msaSeqCol.getTag(bioTAGS.alphabet), ALPHABET.PT);
    expect(msaSeqCol.getTag(DG.TAGS.CELL_RENDERER), 'sequence');

    // check newColumn with SeqHandler constructor
    const _sh: ISeqHandler = seqHelper.getSeqHandler(msaSeqCol);
  }

  async function _testAfterConvert() {
    const csv: string = await grok.dapi.files.readAsText('System:AppData/Bio/samples/FASTA_PT.csv');
    const df: DG.DataFrame = DG.DataFrame.fromCsv(csv);

    const srcCol: DG.Column = df.getCol('sequence')!;
    const semType: string = await grok.functions.call('Bio:detectMacromolecule', {col: srcCol});
    if (semType)
      srcCol.semType = semType;

    const tv: DG.TableView = grok.shell.addTableView(df);
    // call to calculate 'cell.renderer' tag
    await grok.data.detectSemanticTypes(df);

    const tgtCol: DG.Column = await convertDo(srcCol, seqHelper, NOTATION.SEPARATOR, '/');
    await awaitGrid(tv.grid);
    expect(tv.grid.dataFrame.id, df.id);

    const resCellRenderer = tgtCol.getTag(DG.TAGS.CELL_RENDERER);
    expect(resCellRenderer, 'sequence');

    // check tgtCol with SeqHandler constructor
    const _sh: ISeqHandler = seqHelper.getSeqHandler(tgtCol);
  }

  async function _testAfterConvertToHelm() {
    const df: DG.DataFrame = await grok.dapi.files.readCsv('System:AppData/Bio/samples/FASTA_PT.csv');
    const view = grok.shell.addTableView(df);
    await awaitGrid(view.grid);
    await df.meta.detectSemanticTypes();
    await grok.data.detectSemanticTypes(df);

    const srcCol = df.getCol('sequence');
    const sh = seqHelper.getSeqHandler(srcCol);
    const tgtCol = sh.convert(NOTATION.HELM);
    df.columns.add(tgtCol);
    await awaitGrid(view.grid);
    expect(tgtCol.getTag(DG.TAGS.CELL_RENDERER), 'helm');
  }

  async function _selectRendererBySemType() {
    /* There are renderers for semType Macromolecule and MacromoleculeDifference.
       Misbehavior was by selecting Macromolecule renderers for MacromoleculeDifference semType column
    /**/
    const seqDiffCol: DG.Column = DG.Column.fromStrings('SequencesDiff',
      ['meI/hHis/Aca/N/T/dK/Thr_PO3H2/Aca#D-Tyr_Et/Tyr_ab-dehydroMe/meN/E/N/dV']);
    seqDiffCol.meta.units = NOTATION.SEPARATOR;
    seqDiffCol.setTag(bioTAGS.separator, '/');
    seqDiffCol.setTag(bioTAGS.aligned, 'SEQ');
    seqDiffCol.setTag(bioTAGS.alphabet, 'UN');
    seqDiffCol.setTag(bioTAGS.alphabetIsMultichar, 'true');
    seqDiffCol.semType = C.SEM_TYPES.MACROMOLECULE_DIFFERENCE;
    const df = DG.DataFrame.fromColumns([seqDiffCol]);
    const tv = grok.shell.addTableView(df);

    await delay(100);
    const renderer = seqDiffCol.getTag(DG.TAGS.CELL_RENDERER);
    if (renderer !== 'MacromoleculeDifference') { // this is value of MacromoleculeDifferenceCR.cellType
      throw new Error(`Units 'separator', separator '/' and semType 'MacromoleculeDifference' ` +
        `have been manually set on column but after df was added as table, ` +
        `view renderer has set to '${renderer}' instead of correct 'MacromoleculeDifference'.`);
    }
  }

  const seqCoordsCsv = `seq,x,y
ACGGTGTCGT,0,0
CGGTATCCCT,1,0
CTCGGCATGC,2,0
`;

  async function _testScatterPlotTooltip(): Promise<void> {
    const df = DG.DataFrame.fromCsv(seqCoordsCsv);
    df.currentRowIdx = 0;
    const view = grok.shell.addTableView(df);
    await df.meta.detectSemanticTypes();
    await grok.data.detectSemanticTypes(df);
    const sp: DG.ScatterPlotViewer = df.plot.scatter({x: 'x', y: 'y'});
    view.dockManager.dock(sp, DG.DOCK_TYPE.RIGHT, null);
    await Promise.all([
      testEvent(sp.onAfterDrawScene, () => {}, () => { sp.invalidateCanvas(); }, 1000),
      awaitGrid(view.grid, 500)
    ]);

    const spBcr = sp.root.getBoundingClientRect();
    const wp = sp.worldToScreen(1, 0);
    const ev = new MouseEvent('mousemove', {
      cancelable: true, bubbles: true, view: window, button: 0,
      clientX: spBcr.left + wp.x, clientY: spBcr.top + wp.y
    });
    const spCanvas = $(sp.root).find('canvas').get()[0] as HTMLCanvasElement;
    await testEvent(DG.debounce(fromEvent(spCanvas, 'mousemove'), 200), () => {
      _package.logger.debug(`Test: event, currentRowIdx=${df.currentRowIdx}`);
      expect($(ui.tooltip.root).find('div table.d4-row-tooltip-table tr td canvas').length, 1);
      expect(sp.hitTest(wp.x, wp.y), 1);
    }, () => {
      spCanvas.dispatchEvent(ev);
    }, 500);
    // TODO: Any error occurred become 'Cannot read properties of null (reading 'get$columns')' because of scatter plot
    //await testEvent(sp.onAfterDrawScene, () => {}, () => { sp.invalidateCanvas(); }, 200);
    await awaitGrid(view.grid, 500);
  }
});
