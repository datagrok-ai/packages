/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {Unsubscribable} from 'rxjs';

import {getHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {ALPHABET, NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {getSeqHelper, ISeqHelper, ToAtomicLevelRes} from '@datagrok-libraries/bio/src/utils/seq-helper';
import {MmcrTemps} from '@datagrok-libraries/bio/src/utils/cell-renderer-consts';
import {addMonomerHoverLink} from '@datagrok-libraries/bio/src/monomer-works/monomer-hover';
import {getRdKitModule} from '@datagrok-libraries/bio/src/chem/rdkit-module';
import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';

import {getRules, RuleInputs, RULES_PATH, RULES_STORAGE_NAME} from './conversion/pt-rules';
import {doPolyToolConvert} from './conversion/pt-conversion';
import {getOverriddenLibrary} from './conversion/pt-synthetic';
import {defaultErrorHandler} from '../utils/err-info';
import {getLibrariesList} from './utils';
import {getEnumerationChem, PT_CHEM_EXAMPLE} from './pt-enumeration-chem';

import {
  PT_ERROR_DATAFRAME, PT_UI_ADD_HELM, PT_UI_DIALOG_CONVERSION, PT_UI_DIALOG_ENUMERATION,
  PT_UI_GET_HELM, PT_UI_LINEARIZE, PT_UI_LINEARIZE_TT,
  PT_UI_HIGHLIGHT_MONOMERS, PT_UI_RULES_USED, PT_UI_USE_CHIRALITY
} from './const';

import {_package} from '../package';
import {IMonomerLibBase} from '@datagrok-libraries/bio/src/types/index';
import {MonomerHoverLink} from '@datagrok-libraries/bio/src/monomer-works/utils';
import {MonomerMap} from '@datagrok-libraries/bio/src/monomer-works/types';
import {ISeqMonomer} from '@datagrok-libraries/bio/src/helm/types';
import wu from 'wu';
import {PolymerTypes} from '@datagrok-libraries/js-draw-lite/src/types/org';
import {_toAtomicLevel, getMonomersDictFromLib} from '@datagrok-libraries/bio/src/monomer-works/to-atomic-level';
import {monomerSeqToMolfile} from '@datagrok-libraries/bio/src/monomer-works/to-atomic-level-utils';
import {LRUCache} from 'lru-cache';
import {addSubstructProvider, getMonomerHover, ISubstruct, setMonomerHover}
  from '@datagrok-libraries/chem-meta/src/types';
import {getMolHighlight} from '@datagrok-libraries/bio/src/monomer-works/seq-to-molfile';
import {ChemTags} from '@datagrok-libraries/chem-meta/src/consts';
import {mergeSubstructs} from '@datagrok-libraries/chem-meta/src/types';
import {getMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';
import {dealGroups, helmToMol} from './conversion/pt-atomic';

type PolyToolConvertSerialized = {
  generateHelm: boolean;
  chiralityEngine: boolean;
  rules: string[];
};

type PolyToolEnumerateChemSerialized = {
  mol: string;
  screenLibrary: string | null;
}

export async function polyToolEnumerateChemUI(cell?: DG.Cell): Promise<void> {
  await _package.initPromise;
  try {
    const dialog = await getPolyToolEnumerationChemDialog(cell);
    dialog.show({resizable: true});
  } catch (_err: any) {
    grok.shell.warning('To run PolyTool Enumeration, sketch the molecule and specify the R group to vary');
  }
}

export async function polyToolConvertUI(): Promise<void> {
  await _package.initPromise;
  let dialog: DG.Dialog | null = null;
  try {
    dialog = await getPolyToolConvertDialog();
    dialog?.show();
  } catch (err: any) {
    const [errMsg, errStack] = errInfo(err);
    grok.shell.warning('To run PolyTool Conversion, open a dataframe with macromolecules');
    _package.logger.error(errMsg, undefined, errStack);
  }
}

export async function getPolyToolConvertDialog(srcCol?: DG.Column): Promise<DG.Dialog | null> {
  const subs: Unsubscribable[] = [];
  const destroy = () => {
    for (const sub of subs) sub.unsubscribe();
  };
  try {
    let srcColVal: DG.Column<string> | undefined = srcCol;
    const srcColList = grok.shell.t.columns.bySemTypeAll(DG.SEMTYPE.MACROMOLECULE);
    const customSrcCols = srcColList.filter((col) => {
      const sh = _package.seqHelper.getSeqHandler(col);
      return sh.notation === NOTATION.CUSTOM;
    });
    if (!srcColVal) {
      if (srcColList.length < 1)
        throw new Error(PT_ERROR_DATAFRAME);
      
      if (customSrcCols.length < 1) {
        const toAtomicLevelFunc = DG.Func.find({package: 'Bio', name: 'toAtomicLevel'})[0];
        if (toAtomicLevelFunc) {
          toAtomicLevelFunc.prepare().edit();
          return null;
        }
        grok.shell.warning('Polytool requires a macromolecule column with custom notation. \n\nUse Top menu | Bio | Transform | To Atomic Level.');
        return null;
      }

      srcColVal = srcColList[0];
    }
    const srcColInput = ui.input.column('Column', {
      table: srcColVal.dataFrame, value: srcColVal,
      filter: (col: DG.Column) => {
        return customSrcCols.includes(col);
      }
    });

    const generateHelmInput = ui.input.bool(PT_UI_GET_HELM, {value: true});
    ui.tooltip.bind(generateHelmInput.root, PT_UI_ADD_HELM);

    const linearizeInput = ui.input.bool(PT_UI_LINEARIZE, {value: true});
    ui.tooltip.bind(linearizeInput.root, PT_UI_LINEARIZE_TT);

    const chiralityEngineInput = ui.input.bool(PT_UI_USE_CHIRALITY, {value: true});
    const highlightMonomersInput = ui.input.bool(PT_UI_HIGHLIGHT_MONOMERS, {value: true});
    let ruleFileList: string[];
    const ruleInputs = new RuleInputs(RULES_PATH, RULES_STORAGE_NAME, '.json', {
      onValueChanged: (value: string[]) => { ruleFileList = value; }
    });
    const rulesHeader = ui.inlineText([PT_UI_RULES_USED]);
    ui.tooltip.bind(rulesHeader, 'Add or specify rules to use');
    const rulesForm = await ruleInputs.getForm();

    const div = ui.divV([
      srcColInput,
      generateHelmInput,
      linearizeInput,
      chiralityEngineInput,
      highlightMonomersInput,
      rulesHeader,
      rulesForm
    ]);

    const exec = async (): Promise<void> => {
      try {
        const ruleFileList = await ruleInputs.getActive();
        await polyToolConvert(
          srcColInput.value!, generateHelmInput.value!, linearizeInput.value!,
          chiralityEngineInput.value!, highlightMonomersInput.value!, ruleFileList
        );
      } catch (err: any) {
        defaultErrorHandler(err);
      }
    };

    const dialog = ui.dialog(PT_UI_DIALOG_CONVERSION)
      .add(div)
      .onOK(() => { exec(); });
    subs.push(dialog.onClose.subscribe(() => {
      destroy();
    }));
    dialog.history(
      /* getInput */ (): PolyToolConvertSerialized => {
        return {
          generateHelm: generateHelmInput.value,
          chiralityEngine: chiralityEngineInput.value,
          rules: ruleFileList,
        };
      },
      /* applyInput */ (x: PolyToolConvertSerialized): void => {
        generateHelmInput.value = x.generateHelm;
        chiralityEngineInput.value = x.chiralityEngine;
        ruleInputs.setActive(x.rules);
      });
    return dialog;
  } catch (err: any) {
    destroy(); // on failing to build a dialog
    throw err;
  }
}

async function getPolyToolEnumerationChemDialog(cell?: DG.Cell): Promise<DG.Dialog> {
  const subs: Unsubscribable[] = [];
  const destroy = () => {
    for (const sub of subs) sub.unsubscribe();
  };
  try {
    const [libList, helmHelper] = await Promise.all([
      getLibrariesList(), getHelmHelper()]);

    const molStr = (cell && cell.rowIndex >= 0) ? cell.value : PT_CHEM_EXAMPLE;//cell ? cell.value : PT_CHEM_EXAMPLE;
    let molfileValue: string = await (async (): Promise<string> => {
      if (DG.chem.isMolBlock(molStr)) return molStr;
      return (await grok.functions.call('Chem:convertMolNotation', {
        molecule: molStr,
        sourceNotation: cell?.column.getTag(DG.TAGS.UNITS) ?? DG.chem.Notation.Unknown,
        targetNotation: DG.chem.Notation.MolBlock,
      }));
    })();

    const molInput = new DG.chem.Sketcher(DG.chem.SKETCHER_MODE.EXTERNAL);
    molInput.syncCurrentObject = false;
    // sketcher.setMolFile(col.tags[ALIGN_BY_SCAFFOLD_TAG]);
    molInput.onChanged.subscribe((_: any) => {
      molfileValue = molInput.getMolFile();
    });
    molInput.root.classList.add('ui-input-editor');
    molInput.root.style.marginTop = '3px';
    molInput.setMolFile(molfileValue);

    //const helmInput = helmHelper.createHelmInput('Macromolecule', {value: helmValue});
    const screenLibraryInput = ui.input.choice('Library to use', {value: null, items: libList});

    molInput.root.setAttribute('style', `min-width:250px!important;`);
    molInput.root.setAttribute('style', `max-width:250px!important;`);
    screenLibraryInput.input.setAttribute('style', `min-width:250px!important;`);

    const div = ui.div([
      molInput.root,
      screenLibraryInput.root
    ]);

    subs.push(grok.events.onCurrentCellChanged.subscribe(() => {
      const cell = grok.shell.tv.dataFrame.currentCell;

      if (cell.column.semType === DG.SEMTYPE.MOLECULE)
        molInput.setValue(cell.value);
    }));

    const exec = async (): Promise<void> => {
      try {
        const molString = molInput.getMolFile();

        if (molString === undefined || molString === '') {
          grok.shell.warning('PolyTool: no molecule was provided');
        } else if (!molString.includes('R#')) {
          grok.shell.warning('PolyTool: no R group was provided');
        } else {
          const molecules = await getEnumerationChem(molString, screenLibraryInput.value!);
          const molCol = DG.Column.fromStrings('Enumerated', molecules);
          const df = DG.DataFrame.fromColumns([molCol]);
          grok.shell.addTableView(df);
        }
      } catch (err: any) {
        defaultErrorHandler(err);
      }
    };

    // Displays the molecule from a current cell (monitors changes)
    const dialog = ui.dialog(PT_UI_DIALOG_ENUMERATION)
      .add(div)
      .onOK(() => {
        exec().finally(() => { destroy(); });
      })
      .onCancel(() => {
        destroy();
      });
    subs.push(dialog.onClose.subscribe(() => {
      destroy();
    }));
    dialog.history(
      /* getInput */ (): PolyToolEnumerateChemSerialized => {
        return {
          mol: molInput.getMolFile(),
          screenLibrary: screenLibraryInput.value,
        };
      },
      /* applyInput */ (x: PolyToolEnumerateChemSerialized): void => {
        molInput.setMolFile(x.mol);
        screenLibraryInput.value = x.screenLibrary;
      });
    return dialog;
  } catch (err: any) {
    destroy();
    throw err;
  }
}

/** Returns Helm and molfile columns.  */
export async function polyToolConvert(seqCol: DG.Column<string>,
  generateHelm: boolean, linearize: boolean, chiralityEngine: boolean, highlight: boolean, ruleFiles: string[]
): Promise<[DG.Column, DG.Column]> {
  const pi = DG.TaskBarProgressIndicator.create('PolyTool converting...');
  try {
    const getUnusedName = (df: DG.DataFrame | undefined, colName: string): string => {
      if (!df) return colName;
      return df.columns.getUnusedName(colName);
    };
    const helmHelper = await getHelmHelper(); // initializes JSDraw and org

    const table = seqCol.dataFrame;
    const rules = await getRules(ruleFiles);
    const [resList, isLinear, positionMaps] = doPolyToolConvert(seqCol.toList(), rules, helmHelper);

    const resHelmColName = getUnusedName(table, `transformed(${seqCol.name})`);
    const resHelmCol = DG.Column.fromType(DG.COLUMN_TYPE.STRING, resHelmColName, resList.length)
      .init((rowIdx: number) => { return resList[rowIdx]; });
    resHelmCol.semType = DG.SEMTYPE.MACROMOLECULE;
    resHelmCol.meta.units = NOTATION.HELM;
    resHelmCol.setTag(DG.TAGS.CELL_RENDERER, 'helm');
    if (generateHelm && table) table.columns.add(resHelmCol, true);


    const rdKitModule: RDModule = await getRdKitModule();
    const seqHelper: ISeqHelper = await getSeqHelper();

    const lib = await getOverriddenLibrary(rules);
    const resHelmColTemp = resHelmCol.temp;
    resHelmColTemp[MmcrTemps.overriddenLibrary] = lib;
    resHelmCol.temp = resHelmColTemp;

    const resMolCol = await helmToMol(resHelmCol, resList,
      isLinear, chiralityEngine, highlight, linearize, lib, rdKitModule, seqHelper);
    resMolCol.name = getUnusedName(table, `molfile(${seqCol.name})`);
    resMolCol.semType = DG.SEMTYPE.MOLECULE;

    if (table) {
      table.columns.add(resMolCol, true);
      await grok.data.detectSemanticTypes(table);
    }

    //buildMonomerHoverLink(resHelmCol, resMolCol, lib, seqHelper, rdKitModule);
    buildCyclizedMonomerHoverLink(seqCol, resHelmCol, resMolCol, lib, seqHelper, rdKitModule, positionMaps);

    return [resHelmCol, resMolCol];
  } finally {
    pi.close();
  }
}

function buildCyclizedMonomerHoverLink(
  cyclizedCol: DG.Column<string>, seqCol: DG.Column<string>, molCol: DG.Column<string>,
  monomerLib: IMonomerLibBase, seqHelper: ISeqHelper, rdKitModule: RDModule,
  positionMaps: number[][][]
): MonomerHoverLink {
  function buildMonomerMap(seqCol: DG.Column<string>, tableRowIdx: number): MonomerMap {
    const seqSH = seqHelper.getSeqHandler(seqCol);
    const seqSS = seqSH.getSplitted(tableRowIdx);
    const biotype = seqSH.defaultBiotype;
    const seqMList: ISeqMonomer[] = wu.count(0).take(seqSS.length)
      .map((posIdx) => {
        return {position: posIdx, symbol: seqSS.getCanonical(posIdx), biotype: biotype} as ISeqMonomer;
      })
      .toArray();

    const alphabet = seqSH.alphabet as ALPHABET;
    const polymerType = alphabet == ALPHABET.RNA || alphabet == ALPHABET.DNA ? PolymerTypes.RNA : PolymerTypes.PEPTIDE;
    const monomersDict = getMonomersDictFromLib([seqMList], polymerType, alphabet, monomerLib, rdKitModule);
    // Call seq-to-molfile worker core directly
    const molWM = monomerSeqToMolfile(seqMList, monomersDict, alphabet, polymerType);
    return molWM.monomers;
  }

  const monomerMapLruCache = new LRUCache<string, MonomerMap>({max: 100});

  function getMonomerMap(seqCol: DG.Column<string>, tableRowIdx: number): MonomerMap | null {
    const seq = seqCol.get(tableRowIdx);
    if (seq == null) return null;

    let resMonomerMap = monomerMapLruCache.get(seq);
    if (!resMonomerMap)
      monomerMapLruCache.set(seq, resMonomerMap = buildMonomerMap(seqCol, tableRowIdx));

    return resMonomerMap;
  }

  const resLink: MonomerHoverLink = {
    targetCol: molCol,
    handler: (seqGridCell: DG.GridCell, cyclizedMonomer: ISeqMonomer | null, targetGridCol: DG.GridColumn): boolean => {
      if (!seqGridCell || !targetGridCol.grid || !seqCol.dataFrame)
        return true;
      const grid = targetGridCol.grid;
      const tableRowIdx = seqGridCell.tableRowIndex!;
      const gridRowIdx = seqGridCell.gridRow;
      const targetGridCell = grid.cell(targetGridCol.name, gridRowIdx);
      const positionMap = positionMaps[gridRowIdx];

      const prev = getMonomerHover();
      if (!prev || (prev && (prev.dataFrameId != seqCol.dataFrame?.id || prev.gridRowIdx != gridRowIdx ||
        prev.seqColName != seqCol.name || prev.seqPosition != cyclizedMonomer?.position))
      ) {
        if (prev) {
          setMonomerHover(null);
          //prev.gridCell.grid?.invalidate();
          prev.gridCell.render();
        }
        if (!cyclizedMonomer) {
          setMonomerHover(null);
          return true;
        }

        setMonomerHover({
          gridCell: targetGridCell,
          dataFrameId: seqCol.dataFrame.id,
          gridRowIdx: gridRowIdx,
          seqColName: seqCol.name,
          seqPosition: cyclizedMonomer ? cyclizedMonomer.position : -1,
          getSubstruct: (): ISubstruct | undefined => { // Gets monomer highlight
            if (!cyclizedMonomer || cyclizedMonomer.symbol === '*')
              return undefined;

            const molMonomerMap = getMonomerMap(seqCol, tableRowIdx);
            if (!molMonomerMap)
              return undefined;

            const resSubstructList: ISubstruct[] = [];
            const seqMonomerList: number[] = positionMap[cyclizedMonomer.position];
            for (const seqMonomer of seqMonomerList) {
              const monomerMap = molMonomerMap.get(seqMonomer); // single monomer
              if (!monomerMap) return {atoms: [], bonds: [], highlightAtomColors: [], highlightBondColors: []};
              resSubstructList.push(getMolHighlight([monomerMap], monomerLib));
            }
            //TODO: refine merge substract
            const res: ISubstruct = mergeSubstructs(resSubstructList);
            return res;
          }
        });

        // TODO: Invalidate targetGridCell
        //grid.invalidate();
        targetGridCell.render();
      }

      return true;
    },
    /* ISubstructProvider.*/getSubstruct: (tableRowIdx: number | null): ISubstruct | undefined =>{
      // Gets whole molecule highlight
      if (molCol.getTag(ChemTags.SEQUENCE_SRC_HL_MONOMERS) != 'true') return undefined;
      if (tableRowIdx == null) return undefined;
      const seq = seqCol.get(tableRowIdx);
      if (!seq) return undefined;

      const molMonomerMap = getMonomerMap(seqCol, tableRowIdx);
      if (!molMonomerMap) return undefined;
      const res: ISubstruct = getMolHighlight(molMonomerMap.values(), monomerLib);
      return res;
    }
  };

  addMonomerHoverLink(cyclizedCol.temp, resLink);
  addSubstructProvider(molCol.temp, resLink);

  return resLink;
}
