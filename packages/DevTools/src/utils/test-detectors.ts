/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export async function _testDetectorsStandard(detectorsArray: DG.Func[])
  : Promise<DG.DataFrame> {
  const pi = DG.TaskBarProgressIndicator.create('Test detectors...');

  // TODO: specify the correct path
  const path = 'System:AppData/DevTools/test_detectors/';

  const csvList = await grok.dapi.files.list(path, true, '');
  const cols = [];
  cols.push(
    DG.Column.fromStrings(
      'files',
      csvList.map((fi) => fi.fileName),
    ),
  );

  let readyCount = 0;

  for (const detector of detectorsArray) {
    const hits: string[] = [];
    for (const fileInfo of csvList) {
      try {
        const csv = await grok.dapi.files.readAsText(path + fileInfo.fileName);
        const df = DG.DataFrame.fromCsv(csv);
        // df.columns[1][0] should contain the name of the appropriate detector
        const col = df.getCol('data');
        const semType: string | null = await detector.apply({col: col});
        if (
          detector.name === df.get('detectorName', 0) &&
          ((semType !== null) && fileInfo.name.includes(semType.toLowerCase()))
        )
          hits.push(''); // True Positive
        else if (
          detector.name === df.get('detectorName', 0) &&
          ((semType === null) || !fileInfo.name.includes(semType.toLowerCase()))
        )
          hits.push('FN'); // False Negative
        else if (
          detector.name !== df.get('detectorName', 0) &&
          ((semType !== null) && fileInfo.name.includes(semType.toLowerCase()))
        )
          hits.push('FP'); // False Positive
        else
          hits.push(''); // True Negative
      } catch (err: unknown) {
        hits.push(err instanceof Error ? err.message : (err as Object).toString()); // Error
      } finally {
        readyCount += 1;
        pi.update(100 * readyCount / csvList.length, `Test ${fileInfo.fileName}`);
      }
    }
    cols.push(
      DG.Column.fromStrings(detector.name, hits),
    );
  }

  // grok.shell.info(`Test for detectors finished`);
  pi.close();
  const resDf = DG.DataFrame.fromColumns(cols);
  resDf.name = `test_detectors`;
  return resDf;
}

/**
 * Function to test detectors from all available packages against all .csv files
 * from Demo and AppData
 *
 * @param {string} path   Path to the directory with .csv datasets
 * @param {DG.Func} detector   A particular detector we want to test
 * @return {Promise<DG.DataFrame>} Table containing the information about the
 * test run
 */
export async function _testDetectorsComprehensive(path: string, detector: DG.Func): Promise<DG.DataFrame> {
  const pi = DG.TaskBarProgressIndicator.create('Test detectors...');

  const fileList = await grok.dapi.files.list(path, true, '');
  const csvList = fileList.filter((fi) => fi.fileName.endsWith('.csv'));


  let readyCount = 0;
  const res = [];

  for (const fileInfo of csvList) {
    try {
      const csv = await grok.dapi.files.readAsText(path + fileInfo.fullPath);
      const df = DG.DataFrame.fromCsv(csv);
      for (const col of df.columns) {
        const semType: string | null = await detector.apply({col: col});
        if (semType !== null) {
          res.push({
            file: fileInfo.path, result: 'detected', column: col.name,
            message: `semType is ${semType}`,
          });
        }
      }
    } catch (err: unknown) {
      res.push({
        file: fileInfo.path, result: 'error', column: null,
        message: err instanceof Error ? err.message : (err as Object).toString(),
      });
    } finally {
      readyCount += 1;
      pi.update(100 * readyCount / csvList.length, `Test ${fileInfo.fileName}`);
    }
  }
  grok.shell.info(`Test ${path} for ${detector.name} finished.`);
  pi.close();
  const resDf = DG.DataFrame.fromObjects(res)!;
  resDf.name = `datasets_${detector.name}_${path}`;
  return resDf;
}

/** UI for _testDetectorsComprehensive function */
export function _testDetectorsDialog(): void {
  const funcArray = DG.Func.find({tags: ['semTypeDetector']});
  // TODO: consider automatic choice of connections
  const dirsArray = ['Demo:Files/', 'System:AppData/'];

  const pathInput = ui.choiceInput('Path', dirsArray[0], dirsArray);
  const detectorInput = ui.choiceInput('Detector', funcArray[0], funcArray);

  ui.dialog('Test semType detectors')
    .add(ui.div([
      pathInput.root,
      detectorInput.root,
    ]))
    .onOK(async () => {
      const path = pathInput.value;
      const detector: DG.Func = detectorInput.value;
      const df = await _testDetectorsComprehensive(path, detector);
      grok.shell.addTableView(df);
    })
    .show({x: 350, y: 100});
}
