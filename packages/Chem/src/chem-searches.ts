import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {getRdKitModule, getRdKitService} from './utils/chem-common-rdkit';
import {
  chemBeginCriticalSection,
  chemEndCriticalSection,
  defaultMorganFpLength,
  defaultMorganFpRadius,
  Fingerprint,
  rdKitFingerprintToBitArray,
} from './utils/chem-common';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {getDiverseSubset} from '@datagrok-libraries/utils/src/similarity-metrics';
import {assure} from '@datagrok-libraries/utils/src/test';
import {ArrayUtils} from '@datagrok-libraries/utils/src/array-utils';
import {tanimotoSimilarity} from '@datagrok-libraries/ml/src/distance-metrics-methods';
import { getMolSafe, getQueryMolSafe } from './utils/mol-creation_rdkit';
import { _package } from './package';
import { IFpResult } from './rdkit-service/rdkit-service-worker-similarity';
import {getSearchProgressEventName, getTerminateEventName} from './constants';
import {IParallelBatchesRes, SubstructureSearchWithFpResult} from './rdkit-service/rdkit-service';

const enum FING_COL_TAGS {
  molsCreatedForVersion = '.mols.created.for.version',
}

let lastColumnInvalidated: string = '';
const canonicalSmilesColName = 'canonicalSmiles';

let currentSearchSmiles: {[key: string]: string} = {};

function _chemFindSimilar(molStringsColumn: DG.Column, fingerprints: (BitArray | null)[],
  queryMolString: string, settings: { [name: string]: any }): DG.DataFrame {
  const len = molStringsColumn.length;
  const distances = _chemGetSimilarities(queryMolString, fingerprints);
  const limit = Math.min((settings.hasOwnProperty('limit') ? settings.limit : len), len);
  const minScore = settings.hasOwnProperty('minScore') ? settings.minScore : 0.0;
  const sortedIndices = Array.from(Array(len).keys()).sort((i1, i2) => {
    const a1 = distances[i1];
    const a2 = distances[i2];
    if (a2 < a1) return -1;
    if (a2 > a1) return +1;
    return 0;
  });
  const sortedMolStringsArr: string[] = [];
  const sortedMolIndArr: number[] = [];
  const sortedScoresArr: number[] = [];
  for (let n = 0; n < limit; n++) {
    const idx = sortedIndices[n];
    const score = distances[idx];
    if (score < minScore) {
      break;
    }
    sortedMolStringsArr.push(molStringsColumn.get(idx));
    sortedScoresArr.push(score);
    sortedMolIndArr.push(idx);
  }
  const length = sortedMolStringsArr.length;
  const sortedMolStrings = DG.Column.fromType(DG.TYPE.STRING, 'molecule', length).init((i) => sortedMolStringsArr[i]);
  const sortedMolInd = DG.Column.fromType(DG.TYPE.INT, 'index', length).init((i) => sortedMolIndArr[i]);
  sortedMolStrings.semType = DG.SEMTYPE.MOLECULE;
  const sortedScores = DG.Column.fromType(DG.TYPE.FLOAT, 'score', length).init((i) => sortedScoresArr[i]);;
  return DG.DataFrame.fromColumns([sortedMolStrings, sortedScores, sortedMolInd]);
}

// Only this function receives {sorted} in settings
export function _chemGetSimilarities(queryMolString: string, fingerprints: (BitArray | null)[]): number[] {
  const distances = new Array(fingerprints.length).fill(0.0);
  try {
    const sample = chemGetFingerprint(queryMolString, Fingerprint.Morgan);
    for (let i = 0; i < fingerprints.length; ++i)
      distances[i] = tanimotoSimilarity(fingerprints[i] ?? BitArray.fromBytes(new Uint8Array()), sample);
  } catch {
    return distances;
  }
  return distances;
}

function _chemGetDiversities(limit: number, molStringsColumn: DG.Column, fingerprints: (BitArray | null)[]): string[] {
  limit = Math.min(limit, fingerprints.length);
  const indexes = ArrayUtils.indexesOf(fingerprints, (f) => f != null);
  const diverseIndexes = getDiverseSubset(indexes.length, limit,
    (i1: number, i2: number) => 1 - tanimotoSimilarity(fingerprints[indexes[i1]]!, fingerprints[indexes[i2]]!));

  const diversities = new Array(limit).fill('');

  for (let i = 0; i < limit; i++)
    diversities[i] = molStringsColumn.get(indexes[diverseIndexes[i]]);

  return diversities;
}


function invalidatedColumnKey(col: DG.Column): string {
  return col.dataFrame?.name + '.' + col.name;
}

function colInvalidated(col: DG.Column): Boolean {
  return (lastColumnInvalidated == invalidatedColumnKey(col) &&
    col.getTag(FING_COL_TAGS.molsCreatedForVersion) == String(col.version));
}

//updates array of RDMols in case column has been changed
async function _invalidate(molCol: DG.Column) {
  if (!colInvalidated(molCol)) {
    await (await getRdKitService()).initMoleculesStructures(molCol.toList());
    molCol.setTag(FING_COL_TAGS.molsCreatedForVersion, String(molCol.version + 1));
    lastColumnInvalidated = invalidatedColumnKey(molCol);
  }
}


function checkForSavedColumn(col: DG.Column, colTag: Fingerprint | string): DG.Column<any> | null{
  const savedColName = '~' + col.name + '.' + colTag;
  const colVerTag = '.' + colTag + '.Version';

  if (col.dataFrame && col.dataFrame?.col(savedColName) &&
      col.getTag(colVerTag) == String(col.version)) {
    const savedCol = col.dataFrame.columns.byName(savedColName);
    return savedCol;
  }
  return null;
}

function saveColumns(col: DG.Column, data: ((Uint8Array | null)[] | (string | null)[])[],
  tags: string[], colTypes: DG.COLUMN_TYPE[]): void {
  
  for (let i = 0; i < data.length; i++)
    saveColumn(col, data[i], tags[i], colTypes[i]);

  const colVersion = col.version + data.length;
  for (let i = 0; i < data.length; i++)
    col.setTag('.' + tags[i] + '.Version', String(colVersion));
}


function saveColumn(col: DG.Column, data: (Uint8Array | null)[] | (string | null)[],
  tagName: string, colType: DG.COLUMN_TYPE): void {
  if (!col.dataFrame)
    throw new Error('Column has no parent dataframe');

  const savedColumnName = '~' + col.name + '.' + tagName;
  const newCol: DG.Column<Uint8Array> = col.dataFrame.columns.getOrCreate(savedColumnName, colType, data.length);

  newCol.init((i) => data[i]);
}

async function invalidateAndSaveColumns(molCol: DG.Column, fingerprintsType: Fingerprint,
  returnSmiles?: boolean): Promise<IFpResult> {
  const fpRes = await (await getRdKitService()).getFingerprints(fingerprintsType,  molCol.toList(), returnSmiles);
  returnSmiles ?
    saveColumns(molCol, [fpRes.fps, fpRes.smiles!], [fingerprintsType, canonicalSmilesColName],
      [DG.COLUMN_TYPE.BYTE_ARRAY, DG.COLUMN_TYPE.STRING]):
    saveColumns(molCol, [fpRes.fps], [fingerprintsType], [DG.COLUMN_TYPE.BYTE_ARRAY]);
  chemEndCriticalSection();
  return fpRes;
}

async function getUint8ArrayFingerprints(
  molCol: DG.Column, fingerprintsType: Fingerprint = Fingerprint.Morgan,
  useSection = true, returnSmiles = false): Promise<IFpResult> {
  if (useSection)
    await chemBeginCriticalSection();
  try {
    const fgsCheck = checkForSavedColumn(molCol, fingerprintsType);
    if (returnSmiles) {
      const smilesCheck = checkForSavedColumn(molCol, canonicalSmilesColName);
      if (fgsCheck && smilesCheck)
        return {fps: fgsCheck.toList(), smiles: smilesCheck.toList()};
      else {
        const fpResult = await invalidateAndSaveColumns(molCol, fingerprintsType, returnSmiles);
        return {fps: fpResult.fps, smiles: fpResult.smiles};
      }
    } else {
      if (fgsCheck)
        return {fps: fgsCheck.toList(), smiles: null};
      else {
        const fpResult = await invalidateAndSaveColumns(molCol, fingerprintsType);
        return {fps: fpResult.fps, smiles: null};
      }
    }
  } finally {
    if (useSection)
      chemEndCriticalSection();
  }
}

export async function chemGetFingerprints(...args: [DG.Column, Fingerprint?, boolean?, boolean?]):
  Promise<(BitArray | null)[]> {
  return (await getUint8ArrayFingerprints(...args)).fps.map((el) => el ? rdKitFingerprintToBitArray(el) : null);
}

export async function chemGetSimilarities(molStringsColumn: DG.Column, queryMolString = '')
      : Promise<DG.Column | null> {
  assure.notNull(molStringsColumn, 'molStringsColumn');
  assure.notNull(queryMolString, 'queryMolString');

  const fingerprints = await chemGetFingerprints(molStringsColumn, Fingerprint.Morgan, true, false)!;

  return queryMolString.length != 0 ?
    DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'distances',
      _chemGetSimilarities(queryMolString, fingerprints)) : null;
}

export async function chemGetDiversities(molStringsColumn: DG.Column, limit: number)
      : Promise<DG.Column | null> {
  assure.notNull(molStringsColumn, 'molStringsColumn');
  assure.notNull(limit, 'queryMolString');

  const fingerprints = await chemGetFingerprints(molStringsColumn, Fingerprint.Morgan, true, false)!;

  return DG.Column.fromList(DG.COLUMN_TYPE.STRING, 'molecule',
    _chemGetDiversities(limit, molStringsColumn, fingerprints));
}

export async function chemFindSimilar(molStringsColumn: DG.Column, queryMolString = '',
  settings: { [name: string]: any } = {}) : Promise<DG.DataFrame | null> {
  assure.notNull(molStringsColumn, 'molStringsColumn');
  assure.notNull(queryMolString, 'queryMolString');

  const fingerprints = await chemGetFingerprints(molStringsColumn, Fingerprint.Morgan, true, false)!;
  return queryMolString.length != 0 ?
    _chemFindSimilar(molStringsColumn, fingerprints, queryMolString, settings) : null;
}

export async function chemSubstructureSearchLibrary(
  molStringsColumn: DG.Column, molString: string, molBlockFailover: string, columnIsCanonicalSmiles = false, awaitAll = true
) {
  const searchKey = `${molStringsColumn?.dataFrame?.name ?? ''}-${molStringsColumn?.name??''}`;
  currentSearchSmiles[searchKey] = molBlockFailover;
  await chemBeginCriticalSection();
  if (currentSearchSmiles[searchKey] !== molBlockFailover) {
    chemEndCriticalSection();
    return new BitArray(molStringsColumn.length);
  }

  try {
    let invalidateCacheFlag = false;
    const rdKitService = await getRdKitService();
    const currentCol = invalidatedColumnKey(molStringsColumn);
    if (lastColumnInvalidated !== currentCol) {
      invalidateCacheFlag = true;
      lastColumnInvalidated = currentCol;
    }

    const matchesBitArray = new BitArray(molStringsColumn.length);
    // if (molString.length === 0) {
    //   chemEndCriticalSection();
    //   return matchesBitArray;
    // }
    
    const terminateEventName = getTerminateEventName(molStringsColumn.dataFrame?.name ?? '', molStringsColumn.name);
    const searchProgressEventName = getSearchProgressEventName(molStringsColumn.dataFrame?.name ?? '', molStringsColumn.name);
    const updateFilterFunc = (progress: number) => {
      grok.events.fireCustomEvent(searchProgressEventName, progress * 100);
    };

    const getSavedCol = (colName: string) => {
      let savedCol = checkForSavedColumn(molStringsColumn, colName);
      if (!savedCol)
        invalidateCacheFlag = true;
      return savedCol;
    }

    const canonicalSmilesList = getSavedCol(canonicalSmilesColName)?.toList() ?? new Array<string | null>(molStringsColumn.length).fill(null);
    const fgsList = getSavedCol(Fingerprint.Pattern)?.toList() ?? new Array<Uint8Array | null>(molStringsColumn.length).fill(null);

    if (invalidateCacheFlag) //invalidating cache in case column has been changed
      await rdKitService.invalidateCache();

    const result: SubstructureSearchWithFpResult = {
      bitArray: matchesBitArray,
      fpsRes: {
        fps: fgsList,
        smiles: !columnIsCanonicalSmiles ? canonicalSmilesList : null
      }

    }
    const subFuncs = await rdKitService.
      searchSubstructureWithFps(molString, molBlockFailover, result, updateFilterFunc, molStringsColumn.toList(), !columnIsCanonicalSmiles);
    

    const saveProcessedColumns = () => {
      !columnIsCanonicalSmiles ?
      saveColumns(molStringsColumn, [result.fpsRes!.fps, result.fpsRes!.smiles!], [Fingerprint.Pattern, canonicalSmilesColName],
        [DG.COLUMN_TYPE.BYTE_ARRAY, DG.COLUMN_TYPE.STRING]):
      saveColumns(molStringsColumn, [result.fpsRes!.fps], [Fingerprint.Pattern], [DG.COLUMN_TYPE.BYTE_ARRAY]);
      chemEndCriticalSection();
    };
    const fireFinishEvents = () => {
        grok.events.fireCustomEvent(searchProgressEventName, 100);
        grok.events.fireCustomEvent(terminateEventName, molBlockFailover);
        saveProcessedColumns();
    }
    if(awaitAll) {
      await Promise.all(subFuncs.promises);
      fireFinishEvents();
    }
    else {
      const sub = grok.events.onCustomEvent(terminateEventName).subscribe(async (mol: string) => {
        if (mol === molBlockFailover) {
          subFuncs!.setTerminateFlag();
          await Promise.allSettled(subFuncs.promises);
          saveProcessedColumns();
          sub.unsubscribe();
        }
      });

      subFuncs?.promises && (Promise.allSettled(subFuncs?.promises).then(() => {
        if (!subFuncs!.getTerminateFlag()) {
          fireFinishEvents();
        }
      }));
    }
    return result.bitArray;
  } catch (e: any) {
    grok.shell.error(e.message);
    chemEndCriticalSection();
    throw e;
  }
}

export function chemGetFingerprint(molString: string, fingerprint: Fingerprint): BitArray {
  let mol = null;
  try {
    mol = getMolSafe(molString, {}, getRdKitModule()).mol;
    if (mol) {
      let fp;
      if (fingerprint == Fingerprint.Morgan) {
        fp = mol.get_morgan_fp_as_uint8array(JSON.stringify({
          radius: defaultMorganFpRadius,
          nBits: defaultMorganFpLength,
        }));
      } else if (fingerprint == Fingerprint.Pattern)
        fp = mol.get_pattern_fp_as_uint8array();
      else
        throw new Error(`${fingerprint} does not match any fingerprint`);  
      return rdKitFingerprintToBitArray(fp) as BitArray;
    } else
      throw new Error(`Chem | Possibly a malformed molString: ${molString}`);
  } catch {
    throw new Error(`Chem | Possibly a malformed molString: ${molString}`);
  } finally {
    mol?.delete();
  }
}

export async function geMolNotationConversions(molCol: DG.Column, targetNotation: string): Promise<string[]> {
  await chemBeginCriticalSection();
  try {
    await _invalidate(molCol);
    const conversions = await (await getRdKitService()).convertMolNotation(targetNotation);
    //saveFingerprintsToCol(molCol, fingerprints, fingerprintsType);
    chemEndCriticalSection();
    return conversions;
  } finally {
    chemEndCriticalSection();
  }
}
