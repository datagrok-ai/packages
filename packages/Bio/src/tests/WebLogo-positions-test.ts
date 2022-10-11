import {after, before, category, test, expect, expectObject, delay} from '@datagrok-libraries/utils/src/test';

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {PositionInfo, PositionMonomerInfo, WebLogo} from '@datagrok-libraries/bio/src/viewers/web-logo';
import {Column} from 'datagrok-api/dg';
import {ALPHABET, NOTATION, UnitsHandler} from '@datagrok-libraries/bio/src/utils/units-handler';

category('WebLogo-positions', () => {
  let tvList: DG.TableView[];
  let dfList: DG.DataFrame[];
  let currentView: DG.View;

  const csvDf1 = `seq
ATC-G-TTGC--
ATC-G-TTGC--
-TC-G-TTGC--
-TC-GCTTGC--
-TC-GCTTGC--`;


  before(async () => {
    tvList = [];
    dfList = [];
    currentView = grok.shell.tv;
  });

  after(async () => {
    dfList.forEach((df: DG.DataFrame) => { grok.shell.closeTable(df);});
    tvList.forEach((tv: DG.TableView) => tv.close());
    currentView = grok.shell.tv;
  });

  test('allPositions', async () => {
    const df: DG.DataFrame = DG.DataFrame.fromCsv(csvDf1);
    const tv: DG.TableView = grok.shell.addTableView(df);

    const seqCol: DG.Column = df.getCol('seq');
    seqCol.semType = DG.SEMTYPE.MACROMOLECULE;
    seqCol.setTag(DG.TAGS.UNITS, NOTATION.FASTA);
    seqCol.setTag(UnitsHandler.TAGS.alphabet, ALPHABET.DNA);

    const wlViewer: WebLogo = (await df.plot.fromType('WebLogo')) as WebLogo;
    tv.dockManager.dock(wlViewer.root, DG.DOCK_TYPE.DOWN);

    tvList.push(tv);
    dfList.push(df);

    const positions: PositionInfo[] = wlViewer['positions'];

    const resAllDf1: PositionInfo[] = [
      new PositionInfo('1', {'A': new PositionMonomerInfo(2), '-': new PositionMonomerInfo(3)}),
      new PositionInfo('2', {'T': new PositionMonomerInfo(5)}),
      new PositionInfo('3', {'C': new PositionMonomerInfo(5)}),
      new PositionInfo('4', {'-': new PositionMonomerInfo(5)}),
      new PositionInfo('5', {'G': new PositionMonomerInfo(5)}),
      new PositionInfo('6', {'-': new PositionMonomerInfo(3), 'C': new PositionMonomerInfo(2)}),
      new PositionInfo('7', {'T': new PositionMonomerInfo(5)}),
      new PositionInfo('8', {'T': new PositionMonomerInfo(5)}),
      new PositionInfo('9', {'G': new PositionMonomerInfo(5)}),
      new PositionInfo('10', {'C': new PositionMonomerInfo(5)}),
      new PositionInfo('11', {'-': new PositionMonomerInfo(5)}),
      new PositionInfo('12', {'-': new PositionMonomerInfo(5)})
    ];

    expect(positions.length, resAllDf1.length);

    for (let i = 0; i < positions.length; i++) {
      expect(positions[i].name, resAllDf1[i].name);
      for (const key in positions[i].freq) {
        expect(positions[i].freq[key].count, resAllDf1[i].freq[key].count);
      }
    }
  });

  test('positions with shrinkEmptyTail option true (filterd)', async () => {
    let csvDf2 = `seq 
    -TC-G-TTGC--
    -TC-GCTTGC--
    -T--C-GT-
    -T--C-GT-
    -T--C-GT-
    -T--CCGT-`;
    const df: DG.DataFrame = DG.DataFrame.fromCsv(csvDf2);
    const tv: DG.TableView = grok.shell.addTableView(df);

    const seqCol: DG.Column = df.getCol('seq');
    seqCol.semType = DG.SEMTYPE.MACROMOLECULE;
    seqCol.setTag(DG.TAGS.UNITS, NOTATION.FASTA);
    seqCol.setTag(UnitsHandler.TAGS.alphabet, ALPHABET.DNA);

    df.filter.init((i) => {
      return i > 2;
    });
    df.filter.fireChanged();
    const wlViewer: WebLogo = (await df.plot.fromType('WebLogo',
      {'shrinkEmptyTail': true})) as WebLogo;
    tv.dockManager.dock(wlViewer.root, DG.DOCK_TYPE.DOWN);

    tvList.push(tv);
    dfList.push(df);

    const positions: PositionInfo[] = wlViewer['positions'];

    const resAllDf1: PositionInfo[] = [
      new PositionInfo('1', {'-': new PositionMonomerInfo(3)}),
      new PositionInfo('2', {'T': new PositionMonomerInfo(3)}),
      new PositionInfo('3', {'-': new PositionMonomerInfo(3)}),
      new PositionInfo('4', {'-': new PositionMonomerInfo(3)}),
      new PositionInfo('5', {'C': new PositionMonomerInfo(3)}),
      new PositionInfo('6', {'-': new PositionMonomerInfo(2), 'C': new PositionMonomerInfo(1)}),
      new PositionInfo('7', {'G': new PositionMonomerInfo(3)}),
      new PositionInfo('8', {'T': new PositionMonomerInfo(3)}),
      new PositionInfo('9', {'-': new PositionMonomerInfo(3)}),
    ];

    expect(positions.length, resAllDf1.length);

    for (let i = 0; i < positions.length; i++) {
      expect(positions[i].name, resAllDf1[i].name);
      for (const key in positions[i].freq) {
        expect(positions[i].freq[key].count, resAllDf1[i].freq[key].count);
      }
    }
  });

  test('positions with skipEmptyPositions option', async () => {
    const df: DG.DataFrame = DG.DataFrame.fromCsv(csvDf1);
    const tv: DG.TableView = grok.shell.addTableView(df);

    const seqCol: DG.Column = df.getCol('seq');
    seqCol.semType = DG.SEMTYPE.MACROMOLECULE;
    seqCol.setTag(DG.TAGS.UNITS, NOTATION.FASTA);
    seqCol.setTag(UnitsHandler.TAGS.alphabet, ALPHABET.DNA);

    const wlViewer: WebLogo = (await df.plot.fromType('WebLogo',
      {'skipEmptyPositions': true})) as WebLogo;
    tv.dockManager.dock(wlViewer.root, DG.DOCK_TYPE.DOWN);

    tvList.push(tv);
    dfList.push(df);

    const positions: PositionInfo[] = wlViewer['positions'];

    const resAllDf1: PositionInfo[] = [
      new PositionInfo('1', {'A': new PositionMonomerInfo(2), '-': new PositionMonomerInfo(3)}),
      new PositionInfo('2', {'T': new PositionMonomerInfo(5)}),
      new PositionInfo('3', {'C': new PositionMonomerInfo(5)}),
      new PositionInfo('5', {'G': new PositionMonomerInfo(5)}),
      new PositionInfo('6', {'-': new PositionMonomerInfo(3), 'C': new PositionMonomerInfo(2)}),
      new PositionInfo('7', {'T': new PositionMonomerInfo(5)}),
      new PositionInfo('8', {'T': new PositionMonomerInfo(5)}),
      new PositionInfo('9', {'G': new PositionMonomerInfo(5)}),
      new PositionInfo('10', {'C': new PositionMonomerInfo(5)})
    ];

    expect(positions.length, resAllDf1.length);

    for (let i = 0; i < positions.length; i++) {
      expect(positions[i].name, resAllDf1[i].name);
      for (const key in positions[i].freq) {
        expect(positions[i].freq[key].count, resAllDf1[i].freq[key].count);
      }
    }
  });
});
