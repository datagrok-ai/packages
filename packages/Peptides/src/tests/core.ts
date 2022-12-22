import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {category, test, expect, delay} from '@datagrok-libraries/utils/src/test';

import {_package} from '../package-test';
import {startAnalysis} from '../widgets/peptides';
import {PeptidesModel} from '../model';
import * as C from '../utils/constants';
import {scaleActivity} from '../utils/misc';
import * as bio from '@datagrok-libraries/bio';

category('Core', () => {
  let simpleTable: DG.DataFrame;
  let simpleActivityCol: DG.Column<number>;
  let simpleAlignedSeqCol: DG.Column<string>;
  let simpleScaledCol: DG.Column<number>;

  let complexTable: DG.DataFrame;
  let complexActivityCol: DG.Column<number>;
  let complexAlignedSeqCol: DG.Column<string>;
  let complexScaledCol: DG.Column<number>;
  const alignedSequenceCol = 'AlignedSequence';

  let model: PeptidesModel | null = null;

  test('Start analysis: simple', async () => {
    const simpleActivityColName = 'IC50';
    simpleTable = DG.DataFrame.fromCsv(await _package.files.readAsText('aligned.csv'));
    simpleActivityCol = simpleTable.getCol(simpleActivityColName);
    simpleAlignedSeqCol = simpleTable.getCol(alignedSequenceCol);
    simpleAlignedSeqCol.semType = DG.SEMTYPE.MACROMOLECULE;
    simpleAlignedSeqCol.setTag(C.TAGS.ALPHABET, bio.ALPHABET.PT);
    simpleAlignedSeqCol.setTag(DG.TAGS.UNITS, bio.NOTATION.FASTA);
    simpleAlignedSeqCol.setTag(bio.TAGS.aligned, bio.ALIGNMENT.SEQ_MSA);
    simpleScaledCol = scaleActivity(simpleActivityCol, '-lg');

    model = await startAnalysis(simpleActivityCol, simpleAlignedSeqCol, null, simpleTable, simpleScaledCol, '-lg');
    expect(model instanceof PeptidesModel, true);

    if (model != null) {
      model.mutationCliffsSelection = {'11': ['D']};
      grok.shell.closeTable(model.df);
    }
  });

  test('Start analysis: сomplex', async () => {
    const complexActivityColName = 'Activity';
    complexTable = DG.DataFrame.fromCsv(await _package.files.readAsText('aligned_2.csv'));
    complexActivityCol = complexTable.getCol(complexActivityColName);
    complexAlignedSeqCol = complexTable.getCol('MSA');
    complexAlignedSeqCol.semType = DG.SEMTYPE.MACROMOLECULE;
    complexAlignedSeqCol.setTag(C.TAGS.ALPHABET, bio.ALPHABET.UN);
    complexAlignedSeqCol.setTag(DG.TAGS.UNITS, bio.NOTATION.SEPARATOR);
    complexAlignedSeqCol.setTag(bio.TAGS.aligned, bio.ALIGNMENT.SEQ_MSA);
    complexAlignedSeqCol.tags[C.TAGS.SEPARATOR] = '/';
    complexScaledCol = scaleActivity(complexActivityCol, '-lg');

    model = await startAnalysis(
      complexActivityCol, complexAlignedSeqCol, null, complexTable, complexScaledCol, '-lg');
    expect(model instanceof PeptidesModel, true);

    if (model != null) {
      model.mutationCliffsSelection = {'13': ['-']};
      grok.shell.closeTable(model.df);
    }
  });

  test('Save and load project', async () => {
    const simpleActivityColName = 'IC50';
    simpleTable = DG.DataFrame.fromCsv(await _package.files.readAsText('aligned.csv'));
    simpleActivityCol = simpleTable.getCol(simpleActivityColName);
    simpleAlignedSeqCol = simpleTable.getCol(alignedSequenceCol);
    simpleAlignedSeqCol.semType = DG.SEMTYPE.MACROMOLECULE;
    simpleAlignedSeqCol.setTag(C.TAGS.ALPHABET, bio.ALPHABET.PT);
    simpleAlignedSeqCol.setTag(DG.TAGS.UNITS, bio.NOTATION.FASTA);
    simpleAlignedSeqCol.setTag(bio.TAGS.aligned, bio.ALIGNMENT.SEQ_MSA);
    simpleScaledCol = scaleActivity(simpleActivityCol, '-lg');

    model = await startAnalysis(simpleActivityCol, simpleAlignedSeqCol, null, simpleTable, simpleScaledCol, '-lg');
    let v = grok.shell.getTableView('Peptides analysis');
    const d = v.dataFrame;
    const layout = v.saveLayout();
    const tableInfo = d.getTableInfo();

    const project = DG.Project.create();
    project.name = 'Peptides project unique test';
    project.addChild(tableInfo);
    project.addChild(layout);
    const sl = await grok.dapi.layouts.save(layout);
    await grok.dapi.tables.uploadDataFrame(d);
    const sti = await grok.dapi.tables.save(tableInfo);
    const sp = await grok.dapi.projects.save(project);

    grok.shell.closeTable(d);
    await delay(500);

    await grok.dapi.projects.open('Peptides project unique test');
    v = grok.shell.getTableView('Peptides analysis');
    grok.shell.closeTable(v.dataFrame);

    await grok.dapi.layouts.delete(sl);
    await grok.dapi.tables.delete(sti);
    await grok.dapi.projects.delete(sp);
  });

  test('Cluster stats - Benchmark 5k', async () => {
    const df = (await _package.files.readBinaryDataFrames('tests/aligned_5k_2.d42'))[0];
    const activityCol = df.getCol('Activity');
    const scaledActivityCol = scaleActivity(activityCol, 'none');
    const clustersCol = df.getCol('Cluster');
    const sequenceCol = df.getCol('HELM');
    sequenceCol.semType = DG.SEMTYPE.MACROMOLECULE;
    sequenceCol.setTag(DG.TAGS.UNITS, bio.NOTATION.HELM);
    const model = await startAnalysis(activityCol, sequenceCol, clustersCol, df, scaledActivityCol, 'none');

    for (let i = 0; i < 5; ++i)
      DG.time('Cluster stats', () => model?.calculateClusterStatistics());
    
  }, {skipReason: 'Benchmark'});

  test('Monomer Position stats - Benchmark 5k', async () => {
    const df = (await _package.files.readBinaryDataFrames('tests/aligned_5k.d42'))[0];
    const activityCol = df.getCol('Activity');
    const scaledActivityCol = scaleActivity(activityCol, 'none');
    const clustersCol = df.getCol('Cluster');
    const sequenceCol = df.getCol('HELM');
    sequenceCol.semType = DG.SEMTYPE.MACROMOLECULE;
    sequenceCol.setTag(DG.TAGS.UNITS, bio.NOTATION.HELM);
    const model = await startAnalysis(activityCol, sequenceCol, clustersCol, df, scaledActivityCol, 'none');

    for (let i = 0; i < 5; ++i)
      DG.time('Monomer position stats', () => model?.calculateMonomerPositionStatistics());
    
  }, {skipReason: 'Benchmark'});
});
