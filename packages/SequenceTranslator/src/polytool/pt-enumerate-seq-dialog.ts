/* eslint-disable max-lines-per-function */
/* eslint-disable max-len */
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import wu from 'wu';
import {Unsubscribable} from 'rxjs';

import {GetMonomerResType, HelmAtom, MonomerNumberingTypes} from '@datagrok-libraries/helm-web-editor/src/types/org-helm';
import {getHelmHelper, HelmInputBase, IHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {getMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';
import {HelmType, PolymerType} from '@datagrok-libraries/bio/src/helm/types';
import {helmTypeToPolymerType} from '@datagrok-libraries/bio/src/monomer-works/monomer-works';
import {getSeqHelper} from '@datagrok-libraries/bio/src/utils/seq-helper';
import '@datagrok-libraries/bio/src/types/input';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {InputColumnBase} from '@datagrok-libraries/bio/src/types/input';
import {SeqValueBase} from '@datagrok-libraries/bio/src/utils/macromolecule/seq-handler';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';

import {PolyToolEnumeratorParams, PolyToolEnumeratorType, PolyToolEnumeratorTypes} from './types';
import {getLibrariesList, LIB_PATH} from './utils';
import {doPolyToolEnumerateHelm, PT_HELM_EXAMPLE} from './pt-enumeration-helm';
import {PolyToolPlaceholdersInput} from './pt-placeholders-input';
import {defaultErrorHandler} from '../utils/err-info';
import {PolyToolPlaceholdersBreadthInput} from './pt-placeholders-breadth-input';
import {PT_UI_DIALOG_ENUMERATION, PT_UI_GET_HELM, PT_UI_HIGHLIGHT_MONOMERS, PT_UI_RULES_USED, PT_UI_USE_CHIRALITY} from './const';
import {PolyToolDataRole, PolyToolTags} from '../consts';
import {RuleInputs, RULES_PATH, RULES_STORAGE_NAME} from './conversion/pt-rules';
import {Chain} from './conversion/pt-chain';
import {polyToolConvert} from './pt-dialog';

import {_package, applyNotationProviderForCyclized} from '../package';
import {buildMonomerHoverLink} from '@datagrok-libraries/bio/src/monomer-works/monomer-hover';
import {getRdKitModule} from '@datagrok-libraries/bio/src/chem/rdkit-module';

import {PolymerTypes} from '@datagrok-libraries/js-draw-lite/src/types/org';

type PolyToolEnumerateInputs = {
  macromolecule: HelmInputBase;
  placeholders: PolyToolPlaceholdersInput;
  placeholdersBreadth: PolyToolPlaceholdersBreadthInput;
  enumeratorType: DG.ChoiceInput<PolyToolEnumeratorType>
  trivialNameCol: InputColumnBase,
  keepOriginal: DG.InputBase<boolean>;
  toAtomicLevel: DG.InputBase<boolean>;
  generateHelm: DG.InputBase<boolean>;
  chiralityEngine: DG.InputBase<boolean>;
  highlightMonomers: DG.InputBase<boolean>;
  library: DG.InputBase<string>;
  rules: { header: HTMLElement, form: HTMLDivElement },
};

type PolyToolEnumerateHelmSerialized = {
  // macromolecule: string;
  description?: string;
  placeholders: string;
  placeholdersBreadth: string;
  enumeratorType: PolyToolEnumeratorType;
  trivialNameCol: string;
  keepOriginal: boolean;
  toAtomicLevel: boolean;
  generateHelm: boolean;
  chiralityEngine: boolean;
  highlightMonomers: boolean;
  rules: string[],
  library: string;
};

export async function polyToolEnumerateHelmUI(cell?: DG.Cell): Promise<void> {
  await _package.initPromise;

  const maxWidth = window.innerWidth;
  const maxHeight = window.innerHeight;

  try {
    // eslint-disable-next-line prefer-const
    let dialog: DG.Dialog;
    function resizeInputs() {
      if (dialog == null) return;

      const dialogContentEl = $(dialog.root).find('div.d4-dialog-contents').get(0)! as HTMLElement;
      const contentHeight = dialogContentEl.clientHeight;

      const fitInputs: { [idx: number]: number } = {0: 1 /*, 3: 0.5*/};
      const fitInputsSumHeight = Object.values(fitInputs).reduce((sum, h) => sum + h, 0);

      const otherInputsHeight: number = wu.count(0).take(dialogContentEl.children.length)
        .filter((i) => !(i in fitInputs))
        .map((idx) => dialogContentEl.children[idx])
        .filter((el) => el instanceof HTMLElement)
        .map((el) => (el as HTMLElement).offsetHeight).reduce((sum, h) => sum + h, 0);
      const remainFitHeight = contentHeight - otherInputsHeight - 38;
      for (const idx of wu.count(0).take(dialogContentEl.children.length)) {
        if (idx in fitInputs) {
          const el = dialogContentEl.children[idx] as HTMLElement;
          const inputFitHeight = remainFitHeight * fitInputs[idx] / fitInputsSumHeight;
          el.style.height = `${inputFitHeight}px`;
        }
      }
    };
    dialog = await getPolyToolEnumerateDialog(cell, resizeInputs);

    let isFirstShow = true;
    ui.onSizeChanged(dialog.root).subscribe(() => {
      if (isFirstShow) {
        // const dialogRootCash = $(dialog.root);
        // const contentMaxHeight = maxHeight -
        //   dialogRootCash.find('div.d4-dialog-header').get(0)!.offsetHeight -
        //   dialogRootCash.find('div.d4-dialog-footer').get(0)!.offsetHeight;

        const dialogWidth = maxWidth * 0.7;
        const dialogHeight = maxHeight * 0.7;

        // Centered, but resizable dialog
        dialog.root.style.width = `${Math.min(maxWidth, dialogWidth)}px`;
        dialog.root.style.height = `${Math.min(maxHeight, dialogHeight)}px`;
        dialog.root.style.left = `${Math.floor((maxWidth - dialog.root.offsetWidth) / 2)}px`;
        dialog.root.style.top = `${Math.floor((maxHeight - dialog.root.offsetHeight) / 2)}px`;

        isFirstShow = false;
      }

      resizeInputs();
    });
    resizeInputs();

    _package.logger.debug('PolyToolEnumerateHelmUI: dialog before show');
    const _res = dialog.show({width: Math.max(350, maxWidth * 0.7), /* center: true,*/ resizable: true});
    _package.logger.debug('PolyToolEnumerateHelmUI: dialog after show');
  } catch (err: any) {
    const [errMsg, errStack] = errInfo(err);
    //grok.shell.warning('To run PolyTool Enumeration, sketch the macromolecule and select monomers to vary');
    _package.logger.error(errMsg, undefined, errStack);
  }
}

async function getPolyToolEnumerateDialog(
  cell?: DG.Cell, resizeInputs?: () => void
): Promise<DG.Dialog> {
  const logPrefix = `ST: PT: HelmDialog()`;
  let inputs: PolyToolEnumerateInputs;
  const subs: Unsubscribable[] = [];
  // will store previous enumeration type to support logic of cleanups
  let prevEnumerationType: PolyToolEnumeratorType = PolyToolEnumeratorTypes.Single;
  const destroy = () => {
    for (const sub of subs) sub.unsubscribe();
    inputs.placeholders.detach();
  };
  try {
    const libHelper = await getMonomerLibHelper();
    const monomerLib = libHelper.getMonomerLib();
    const seqHelper = await getSeqHelper();
    const emptyDf: DG.DataFrame = DG.DataFrame.fromColumns([]);

    const [_libList, helmHelper] = await Promise.all([getLibrariesList(), getHelmHelper()]);
    const monomerLibFuncs = helmHelper.buildMonomersFuncsFromLib(monomerLib);

    const getValue = (cell?: DG.Cell): [SeqValueBase, PolyToolDataRole] => {
      let resSeqValue: SeqValueBase;
      let resDataRole: PolyToolDataRole;
      if (cell && cell.rowIndex >= 0 && cell?.column.semType == DG.SEMTYPE.MACROMOLECULE) {
        const sh = seqHelper.getSeqHandler(cell.column);
        resSeqValue = sh.getValue(cell.rowIndex);
        resDataRole = (resSeqValue.tags[PolyToolTags.dataRole] as PolyToolDataRole.template) ?? PolyToolDataRole.macromolecule;
      } else {
        const seqCol = DG.Column.fromList(DG.COLUMN_TYPE.STRING, 'seq', [PT_HELM_EXAMPLE]);
        seqCol.semType = DG.SEMTYPE.MACROMOLECULE;
        const _tempDf = DG.DataFrame.fromColumns([seqCol]);
        
        seqCol.meta.units = NOTATION.HELM;
        const sh = seqHelper.getSeqHandler(seqCol);
        resSeqValue = sh.getValue(0);
        resDataRole = PolyToolDataRole.macromolecule;
      }
      return [resSeqValue, resDataRole];
    };

    let [seqValue, dataRole]: [SeqValueBase, PolyToolDataRole] = getValue(cell);

    let srcId: { value: string, colName: string } | null = null;
    let ruleFileList: string[];
    let ruleInputs: RuleInputs;
    const trivialNameSampleDiv = ui.divText('', {style: {marginLeft: '8px', marginTop: '2px'}});
    const warningsTextDiv = ui.divText('', {style: {color: 'red'}});
    // #### Inputs
    inputs = {
      macromolecule: helmHelper.createHelmInput(                                                     
        'Macromolecule', {
          editable: false,
          editorOptions: {
            drawOptions: {
              monomerNumbering: MonomerNumberingTypes.continuous,
              getMonomer: (a: HelmAtom | HelmType, name?: string): GetMonomerResType => {
                const aa: HelmAtom = a as HelmAtom;


                if (aa.T === 'ATOM') {
                  try {
                    if (!seqValue.isDna() && !seqValue.isRna()) {
                      const canonicalSymbol = seqValue.getSplitted().getCanonical(aa.bio!.continuousId - 1);
                      return monomerLibFuncs.getMonomer(aa.bio!.type, canonicalSymbol);
                    } else {
                      const canonicalSymbol = seqValue.getSplittedWithSugarsAndPhosphates().getCanonical(aa.bio!.continuousId - 1);
                      return monomerLibFuncs.getMonomer(aa.bio!.type, canonicalSymbol);
                    }
                  } catch (_) {
                    return monomerLibFuncs.getMonomer(a, name);
                  }
                } else { return monomerLibFuncs.getMonomer(a, name); }
              },
            },
          }
        }),
      placeholders: await PolyToolPlaceholdersInput.create(
        'Placeholders', {
          showAddNewRowIcon: true,
          showRemoveRowIcon: true,
          showRowHeader: false,
          showCellTooltip: false,
        }),
      enumeratorType: ui.input.choice<PolyToolEnumeratorType>(
        'Enumerator type', {
          value: prevEnumerationType,
          items: Object.values(PolyToolEnumeratorTypes)
        }) as DG.ChoiceInput<PolyToolEnumeratorType>,
      placeholdersBreadth: await PolyToolPlaceholdersBreadthInput.create(
        'Breadth', {
          showAddNewRowIcon: true,
          showRemoveRowIcon: true,
          showRowHeader: false,
          showCellTooltip: false,
        }),
      keepOriginal: ui.input.bool(
        'Keep original', {value: false}),
      toAtomicLevel: ui.input.bool(
        'To atomic level', {
          value: false,
          onValueChanged: (value, input) => { updateViewRules(); }
        }),
      generateHelm: ui.input.bool(PT_UI_GET_HELM, {value: true}),
      chiralityEngine: ui.input.bool(PT_UI_USE_CHIRALITY, {value: false}),
      highlightMonomers: ui.input.bool(PT_UI_HIGHLIGHT_MONOMERS, {value: false}),
      rules: {
        header: ui.inlineText([PT_UI_RULES_USED]),
        form: await (ruleInputs = new RuleInputs(RULES_PATH, RULES_STORAGE_NAME, '.json', {
          onValueChanged: (value: string[]) => { ruleFileList = value; }
        })).getForm()
      },
      trivialNameCol: ui.input.column2(
        'Trivial name', {
          table: cell?.dataFrame,
          filter: (col: DG.Column): boolean => {
            return col.type === DG.COLUMN_TYPE.STRING && col != cell?.column; /* id */
          },
          onValueChanged: (): void => {
            const valueCol = inputs.trivialNameCol.value;
            let newSrcId: typeof srcId = null;
            if (cell && valueCol) {
              const originalId = valueCol.get(cell.rowIndex)!;
              newSrcId = {value: originalId, colName: valueCol.name};
            }
            srcId = newSrcId;
            trivialNameSampleDiv.textContent = srcId ? `Original ID: ${srcId.value}` : '';
          },
          nullable: true,
        }),
      library: ui.input.choice('Monomer Library', {items: _libList, value: _libList[0], nullable: true}) as DG.InputBase<string>,
    };
    // #### Inputs END
    inputs.library.root.style.setProperty('display', 'none');
    inputs.trivialNameCol.addOptions(trivialNameSampleDiv);

    let placeholdersValidity: string | null = null;
    inputs.placeholders.addValidator((value: string): string | null => {
      const errors: string[] = [];
      try {
        // for library, ony one placeholder is allowed
        if (inputs.enumeratorType.value === PolyToolEnumeratorTypes.Library) {
          setTimeout(() => { updateWarnings(); }, 10);
          const pcs = inputs.placeholders.placeholdersValue;
          if (pcs.length > 1)
            return 'Only one placeholder is allowed for Library mode';
          if (pcs.length === 1) {
            if (pcs[0].position == null)
              return 'Position is required for Library mode';
            if (pcs[0].position > inputs.macromolecule.molValue.atoms.length)
              return `There is no monomer at position ${pcs[0].position + 1}.`;
          }
          return null;
        }

        if (dataRole !== PolyToolDataRole.macromolecule)
          return null;

        const missedMonomerList: { polymerType: PolymerType, symbol: string }[] = [];
        for (const ph of inputs.placeholders.placeholdersValue) {
          const pos = ph.position;
          if (pos == null)
            continue;
          if (pos >= inputs.macromolecule.molValue.atoms.length) {
            errors.push(`There is no monomer at position ${pos + 1}.`);
            continue;
          }
          const a = inputs.macromolecule.molValue.atoms[pos];
          if (a) {
            const helmType: HelmType = a.biotype()!;
            const polymerType = helmTypeToPolymerType(helmType);
            for (const symbol of ph.monomers) {
              const substituteMonomer = monomerLib.getMonomer(polymerType, symbol)!;
              if (!substituteMonomer || !substituteMonomer.lib)
                missedMonomerList.push({polymerType, symbol});
            }
          }
        }

        const byType: { [polymerType: string]: string[] } = {};
        for (const sm of missedMonomerList) {
          let byTypeList = byType[sm.polymerType];
          if (!byTypeList) byTypeList = byType[sm.polymerType] = [];
          byTypeList.push(sm.symbol);
        }
        const byTypeStr: string = Object.entries(byType)
          .map(([polymerType, symbolList]) => `${polymerType}: ${symbolList.join(', ')}`)
          .join('\n');
        if (Object.keys(byTypeStr).length > 0)
          errors.push(`Placeholders contain missed monomers: ${byTypeStr}`);
        placeholdersValidity = errors.length > 0 ? errors.join('\n') : null;
      } catch (err: any) {
        const [errMsg, errStack] = defaultErrorHandler(err, false);
        placeholdersValidity = errMsg;
      }
      setTimeout(() => { updateWarnings(); }, 0);
      return placeholdersValidity;
    });

    // inputs.placeholdersBreadth.addValidator((value: string): string | null => {
    //   const errors: string[] = [];
    //   try {
    //     if (dataRole !== PolyToolDataRole.macromolecule)
    //       return null;
    //
    //     const missedMonomerList: { polymerType: PolymerType, symbol: string }[] = [];
    //     for (const ph of inputs.placeholdersBreadth.placeholdersBreadthValue) {
    //       const posErrors = [];
    //       if (ph.start == null || ph.end == null)
    //         continue;
    //       if (ph.start < 0)
    //         posErrors.push(`There is no monomer at start position ${ph.start + 1}.`);
    //       if (ph.start >= inputs.macromolecule.molValue.atoms.length)
    //         posErrors.push(`There is no monomer at start position ${ph.start + 1}.`);
    //       if (ph.end < 0)
    //         posErrors.push(`There is no monomer at end position ${ph.end + 1}.`);
    //       if (ph.end >= inputs.macromolecule.molValue.atoms.length)
    //         posErrors.push(`There is no monomer at end position ${ph.end + 1}.`);
    //       errors.push(...posErrors);
    //       if (posErrors.length > 0)
    //         continue;
    //
    //       const polymerType = PolymerTypes.PEPTIDE;
    //       for (const symbol of ph.monomers) {
    //         const substituteMonomer = monomerLib.getMonomer(null, symbol)!;
    //         if (!substituteMonomer || !substituteMonomer.lib)
    //           missedMonomerList.push({polymerType, symbol});
    //       }
    //
    //       const byType: { [polymerType: string]: string[] } = {};
    //       for (const sm of missedMonomerList) {
    //         let byTypeList = byType[sm.polymerType];
    //         if (!byTypeList) byTypeList = byType[sm.polymerType] = [];
    //         byTypeList.push(sm.symbol);
    //       }
    //       const byTypeStr: string = Object.entries(byType)
    //         .map(([polymerType, symbolList]) => `${polymerType}: ${symbolList.join(', ')}`)
    //         .join('\n');
    //       if (Object.keys(byTypeStr).length > 0)
    //         errors.push(`Placeholders contain missed monomers: ${byTypeStr}`);
    //       placeholdersValidity = errors.length > 0 ? errors.join('\n') : null;
    //     }
    //   } catch (err: any) {
    //     const [errMsg, errStack] = defaultErrorHandler(err, false);
    //     placeholdersValidity = errMsg;
    //   }
    //   setTimeout(() => { updateWarnings(); }, 0);
    //   return placeholdersValidity;
    // });

    inputs.library.addValidator((_value) => {
      if (inputs.enumeratorType.value === PolyToolEnumeratorTypes.Library && !inputs.library.value)
        return 'Monomer Library is required for this enumerator type';
      return null;
    });

    inputs.library.onChanged.subscribe(() => {
      if (inputs.enumeratorType.value === PolyToolEnumeratorTypes.Library)
        inputs.placeholders.setMonomersValue(0, inputs.library.value ?? '');
    });

    inputs.enumeratorType.onChanged.subscribe((_) => {
      const isLibraryModeChosen = inputs.enumeratorType.value === PolyToolEnumeratorTypes.Library;
      inputs.library.root.style.setProperty('display', isLibraryModeChosen ? 'flex' : 'none');
      try {
        if ((prevEnumerationType !== PolyToolEnumeratorTypes.Library && isLibraryModeChosen) || (prevEnumerationType === PolyToolEnumeratorTypes.Library && !isLibraryModeChosen)) {
          const prevSinglePosition = inputs.placeholders.placeholdersValue.length === 1 ? inputs.placeholders.placeholdersValue[0].position : null;
          // clear the placeHolders input and helm inputs if switching happened to/from Library mode
          inputs.placeholders.clearInput();
          inputs.placeholdersBreadth.clearInput();
          if (isLibraryModeChosen && prevSinglePosition != null)
            inputs.placeholders.addPosition(prevSinglePosition, inputs.library.value ?? '');
        }
      } catch (err: any) {
        defaultErrorHandler(err, false);
      }
      prevEnumerationType = inputs.enumeratorType.value;
    });

    subs.push(inputs.macromolecule.onMouseMove.subscribe((e: MouseEvent) => {
      try {
        _package.logger.debug(`${logPrefix}, placeholdersInput.onMouseMove()`);

        const argsX = e.offsetX;
        const argsY = e.offsetY;
        const mol = inputs.macromolecule.molValue;
        const hoveredAtom = helmHelper.getHoveredAtom(argsX, argsY, mol, inputs.macromolecule.root.clientHeight);
        if (hoveredAtom) {
          const hoveredAtomContIdx = hoveredAtom._parent.atoms.indexOf(hoveredAtom);
          const substitutingMonomers = inputs.placeholders.placeholdersValue
            .find((ph) => ph.position === hoveredAtomContIdx)?.monomers;

          if (substitutingMonomers) {
            const cnt = ui.divText(substitutingMonomers.join(', '));
            inputs.macromolecule.showTooltip(cnt, hoveredAtom);
            e.preventDefault();
            e.stopPropagation();
          }
        }
      } catch (err: any) {
        defaultErrorHandler(err, false);
      }
    }));
    subs.push(inputs.macromolecule.onClick.subscribe((e: MouseEvent) => {
      try {
        _package.logger.debug(`${logPrefix}, placeholdersInput.onClick()`);

        const argsX = e.offsetX;
        const argsY = e.offsetY;
        const mol = inputs.macromolecule.molValue;
        const clickedAtom = helmHelper.getHoveredAtom(argsX, argsY, mol, inputs.macromolecule.root.clientHeight);
        if (clickedAtom) {
          const clickedAtomContIdx = clickedAtom._parent.atoms.indexOf(clickedAtom);
          const clickedAtomContIdxStr = String(clickedAtomContIdx + 1);
          let monomerValue = '';
          if (inputs.enumeratorType.value === PolyToolEnumeratorTypes.Library) {
            inputs.placeholders.clearInput();
            monomerValue = inputs.library.value ?? '';
          }
          inputs.placeholders.addPosition(clickedAtomContIdx, monomerValue);
        }
      } catch (err: any) {
        defaultErrorHandler(err);
      }
    }));
    subs.push(inputs.placeholders.onChanged.subscribe(() => { updateViewMol(); }));

    // TODO: suspect
    subs.push(ui.onSizeChanged(inputs.placeholders.root).subscribe(() => {
      if (resizeInputs)
        resizeInputs();
    }));

    // Displays the molecule from a current cell (monitors changes)
    subs.push(grok.events.onCurrentCellChanged.subscribe(() => {
      const cell = grok.shell.tv.dataFrame.currentCell;
      if (cell.column.semType !== DG.SEMTYPE.MACROMOLECULE) return;

      [seqValue, dataRole] = getValue();
      fillForCurrentCell(seqValue, dataRole, cell);
    }));

    inputs.macromolecule.root.style.setProperty('min-width', '250px', 'important');
    // inputs.macromolecule.root.style.setProperty('max-height', '300px', 'important');

    const updateViewMol = () => {
      const phPosSet = new Set<number>(inputs.placeholders.placeholdersValue.map((ph) => ph.position));
      const mol = inputs.macromolecule.molValue;
      for (let aI = 0; aI < mol.atoms.length; aI++) {
        const a = mol.atoms[aI];
        a.highlighted = phPosSet.has(aI);
      }
      inputs.macromolecule.redraw();
    };

    const updateViewRules = () => {
      if (inputs.toAtomicLevel.value && dataRole === PolyToolDataRole.template) {
        inputs.generateHelm.root.style.removeProperty('display');
        inputs.chiralityEngine.root.style.removeProperty('display');
        inputs.highlightMonomers.root.style.removeProperty('display');
        inputs.rules.header.style.removeProperty('display');
        inputs.rules.form.style.removeProperty('display');
      } else {
        inputs.generateHelm.root.style.display = inputs.chiralityEngine.root.style.display =
          inputs.highlightMonomers.root.style.display = 'none';
        inputs.rules.header.style.display = inputs.rules.form.style.display = 'none';
      }
      if (resizeInputs)
        resizeInputs();
    };

    const updateWarnings = () => {
      const warnings = placeholdersValidity;
      // const iw = inputs.warnings;
      const w = warningsTextDiv;
      if (!!warnings) {
        // iw.value = warnings; // <- breaks dialog resize
        // iw.enabled = true;
        // iw.root.style.removeProperty('display');

        w.innerText = warnings;
        w.style.removeProperty('display');
      } else {
        // iw.value = ''; // <- breaks dialog resize
        // iw.enabled = false;
        // iw.root.style.setProperty('display', 'none');

        w.innerText = '';
        w.style.setProperty('display', 'none');
      }
      //resizeInputs();
    };

    const fillTrivialNameList = (table?: DG.DataFrame) => {
      if (table) {
        inputs.trivialNameCol.setColumnInputTable(table);
        inputs.trivialNameCol.root.style.removeProperty('display');
      } else {
        inputs.trivialNameCol.setColumnInputTable(emptyDf);
        inputs.trivialNameCol.root.style.setProperty('display', 'none');
      }
      if (resizeInputs)
        resizeInputs();
    };

    const fillForCurrentCell = (mmValue: SeqValueBase, dataRole: PolyToolDataRole, cell?: DG.Cell): void => {
      inputs.macromolecule.value = mmValue;
      const table: DG.DataFrame | undefined = cell?.dataFrame;
      fillTrivialNameList(table);
    };

    fillForCurrentCell(seqValue, dataRole, cell);
    updateViewRules();

    const exec = async (): Promise<void> => {
      try {
        const srcHelm = inputs.macromolecule.stringValue;
        const helmSelections: number[] = wu.enumerate<HelmAtom>(inputs.macromolecule.molValue.atoms)
          .filter(([a, aI]) => a.highlighted)
          .map(([a, aI]) => aI).toArray();
        if (inputs.enumeratorType.value === PolyToolEnumeratorTypes.Library) {
          if (helmSelections.length === 0) {
            grok.shell.warning('PolyTool: position for enumeration was not selected');
            return;
          }
          if (!inputs.library.value) {
            grok.shell.warning('PolyTool: No monomer library was selected');
            return;
          }
        }
        if (srcHelm === undefined || srcHelm === '') {
          grok.shell.warning('PolyTool: no molecule was provided');
        } else {
          if (Object.keys(inputs.placeholders.placeholdersValue).length === 0 &&
            Object.keys(inputs.placeholdersBreadth.placeholdersBreadthValue).length === 0
          ) {
            grok.shell.warning(`${PT_UI_DIALOG_ENUMERATION}: placeholders are empty`);
            return;
          }
          await getHelmHelper(); // initializes JSDraw and org

          const placeHoldersValue = inputs.placeholders.placeholdersValue;
          let enumerationType = inputs.enumeratorType.value;
          if (enumerationType === PolyToolEnumeratorTypes.Library) {
            if (placeHoldersValue.length !== 1) {
              grok.shell.warning('Only one placeholder is allowed for Library mode');
              return;
            }
            if (!placeHoldersValue[0].monomers || !_libList.includes(placeHoldersValue[0].monomers[0])) {
              grok.shell.warning('Valid Monomer Library is required for this enumerator type');
              return;
            }
            const monLibName = placeHoldersValue[0].monomers[0];
            const monLib = await libHelper.readLibrary(LIB_PATH, monLibName);
            const peptideMonomers = monLib.getMonomerSymbolsByType(PolymerTypes.PEPTIDE);
            placeHoldersValue[0].monomers = peptideMonomers;
            enumerationType = PolyToolEnumeratorTypes.Single;
          }

          const params: PolyToolEnumeratorParams = {
            placeholders: placeHoldersValue,
            type: enumerationType,
            breadthPlaceholders: inputs.placeholdersBreadth.placeholdersBreadthValue,
            keepOriginal: inputs.keepOriginal.value,
          };
          const toAtomicLevelV: boolean = inputs.toAtomicLevel.value;
          const enumeratorResDf = await polyToolEnumerateSeq(srcHelm, dataRole, srcId, params,
            toAtomicLevelV ? {
              generateHelm: inputs.generateHelm.value,
              chiralityEngine: inputs.chiralityEngine.value,
              highlightMonomers: inputs.highlightMonomers.value,
              rules: await ruleInputs.getActive()
            } : false,
            helmHelper);
          grok.shell.addTableView(enumeratorResDf);
        }
      } catch (err: any) {
        defaultErrorHandler(err);
      }
    };

    const dialog = ui.dialog({title: PT_UI_DIALOG_ENUMERATION, showFooter: true})
      .add(inputs.macromolecule.root)
      .add(ui.divH([
        ui.divV([
          inputs.placeholders.root,
          inputs.enumeratorType.root, inputs.library.root],
        {style: {width: '50%'}}
        ),
        ui.divV([
          inputs.placeholdersBreadth.root],
        {style: {width: '50%'}})],
      {style: {width: '100%'}}))
      .add(ui.divH([
        ui.divV([
          inputs.trivialNameCol.root,
          inputs.keepOriginal.root],
        {style: {width: '50%'}}),
        ui.divV([
          ui.divH([inputs.toAtomicLevel.root, inputs.generateHelm.root]),
          ui.divH([inputs.chiralityEngine.root, inputs.highlightMonomers.root]),
          inputs.rules.header, inputs.rules.form],
        {style: {width: '50%'}})],
      {style: {width: '100%'}}))
      .add(warningsTextDiv)
      // .addButton('Enumerate', () => {
      //   execDialog()
      //     .then(() => {});
      // }, 0, 'Keeps the dialog open')
      .onOK(() => { exec(); });
    subs.push(dialog.onClose.subscribe(() => {
      destroy();
    }));
    dialog.history(
      /* getInput */ (): PolyToolEnumerateHelmSerialized => {
        return {
          // macromolecule: inputs.macromolecule.stringValue,
          description: `${inputs.enumeratorType.value} ${inputs.placeholders.placeholdersValue?.map((v) => (v.position?.toString() ?? '') + ': ' + v.monomers?.join(', ')).join('; ')}`,
          placeholders: inputs.placeholders.stringValue,
          enumeratorType: inputs.enumeratorType.value,
          placeholdersBreadth: inputs.placeholdersBreadth.stringValue,
          trivialNameCol: inputs.trivialNameCol.stringValue,
          keepOriginal: inputs.keepOriginal.value,
          toAtomicLevel: inputs.toAtomicLevel.value,
          generateHelm: inputs.generateHelm.value,
          chiralityEngine: inputs.chiralityEngine.value,
          highlightMonomers: inputs.highlightMonomers.value,
          rules: ruleFileList,
          library: inputs.library.value,
        };
      },
      /* applyInput */ (x: PolyToolEnumerateHelmSerialized): void => {
        //inputs.macromolecule.stringValue = x.macromolecule;
        inputs.enumeratorType.value = x.enumeratorType ?? PolyToolEnumeratorTypes.Single;
        inputs.placeholders.stringValue = x.placeholders;
        inputs.placeholdersBreadth.stringValue = x.placeholdersBreadth;
        inputs.trivialNameCol.stringValue = x.trivialNameCol;
        inputs.keepOriginal.value = x.keepOriginal ?? false;
        inputs.toAtomicLevel.value = x.toAtomicLevel ?? true;
        inputs.generateHelm.value = x.generateHelm ?? true;
        inputs.chiralityEngine.value = x.chiralityEngine ?? false;
        inputs.highlightMonomers.value = x.highlightMonomers ?? false;
        ruleInputs.setActive(x.rules);
        inputs.library.value = x.library;
      });
    return dialog;
  } catch (err: any) {
    destroy(); // on failing to build a dialog
    throw err;
  }
}

/**
 * @param {DG.SemanticValue} srcValue Source value to enumerate, either of data role
 *                                    {@link PolyToolDataRole.template} or {@link PolyToolDataRole.macromolecule}
 * */
async function polyToolEnumerateSeq(
  srcHelm: string, dataRole: PolyToolDataRole, srcId: { value: string, colName: string } | null,
  params: PolyToolEnumeratorParams,
  toAtomicLevel: { generateHelm: boolean, chiralityEngine: boolean, highlightMonomers: boolean, rules: string[] } | false,
  helmHelper: IHelmHelper
): Promise<DG.DataFrame> {
  const pi = DG.TaskBarProgressIndicator.create('PolyTool enumerating...');
  try {
    const libHelper = await getMonomerLibHelper();
    const rdKitModule = await getRdKitModule();
    const monomerLib = libHelper.getMonomerLib(); // TODO: Get monomer lib from src SeqValueBase

    const resList = doPolyToolEnumerateHelm(srcHelm, srcId?.value ?? '', params);
    let enumCol: DG.Column<string>;
    switch (dataRole) {
    case PolyToolDataRole.macromolecule: {
      enumCol = DG.Column.fromType(DG.COLUMN_TYPE.STRING, 'Enumerated', resList.length)
        .init((rowIdx: number) => resList[rowIdx][0]);
      break;
    }
    case PolyToolDataRole.template: {
      const templateList: string[] = new Array<string>(resList.length);
      for (let rowIdx = 0; rowIdx < resList.length; rowIdx++) {
        const pseudoHelm = resList[rowIdx][0];
        const chain = Chain.fromHelm(pseudoHelm, helmHelper);
        templateList[rowIdx] = chain.getNotation();
      }
      enumCol = DG.Column.fromList(DG.COLUMN_TYPE.STRING, 'Enumerated', templateList);
      enumCol.semType = DG.SEMTYPE.MACROMOLECULE;
      enumCol.setTag(PolyToolTags.dataRole, PolyToolDataRole.template);
      applyNotationProviderForCyclized(enumCol, '-');
      break;
    }
    }
    const enumeratorResDf = DG.DataFrame.fromColumns([enumCol]);
    await grok.data.detectSemanticTypes(enumeratorResDf);
    if (dataRole == PolyToolDataRole.template)
      applyNotationProviderForCyclized(enumCol, '-');


    if (toAtomicLevel) {
      let resHelmCol: DG.Column<string>;
      if (dataRole === PolyToolDataRole.macromolecule) {
        resHelmCol = enumCol;
        const talRes = await helmHelper.seqHelper.helmToAtomicLevel(resHelmCol,
          toAtomicLevel.chiralityEngine, toAtomicLevel.highlightMonomers);
        enumeratorResDf.columns.add(talRes.molCol!, false);
        const resMolCol = talRes.molCol!;
        await buildMonomerHoverLink(resHelmCol, resMolCol, monomerLib, helmHelper.seqHelper, rdKitModule, true);
      } else if (dataRole === PolyToolDataRole.template) {
        const talRes = await polyToolConvert(enumCol,
          toAtomicLevel.generateHelm, false, toAtomicLevel.chiralityEngine, false, toAtomicLevel.rules);
        resHelmCol = talRes[0];
      }
    }

    if (srcId) {
      const enumIdCol = DG.Column.fromType(DG.COLUMN_TYPE.STRING, srcId.colName, resList.length)
        .init((rowIdx: number) => resList[rowIdx][1]);
      enumeratorResDf.columns.add(enumIdCol);
    }

    return enumeratorResDf;
  } finally {
    pi.close();
  }
}
