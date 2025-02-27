/* eslint-disable max-lines-per-function */
/* eslint-disable max-lines */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {IMonomerManager, INewMonomerForm} from '@datagrok-libraries/bio/src/utils/monomer-ui';
import {IMonomerLib, Monomer, RGroup} from '@datagrok-libraries/bio/src/types';
import {DUMMY_MONOMER, HELM_RGROUP_FIELDS} from '@datagrok-libraries/bio/src/utils/const';
import {ItemsGrid} from '@datagrok-libraries/utils/src/items-grid';
import {mostSimilarNaturalAnalog} from '@datagrok-libraries/bio/src/utils/macromolecule/monomers';
import {PolymerType, MonomerType} from '@datagrok-libraries/bio/src/helm/types';

import {MonomerLibManager} from '../lib-manager';
import {LIB_PATH} from '../consts';

import '../../../../css/monomer-manager.css';
import {MONOMER_RENDERER_TAGS} from '@datagrok-libraries/bio/src/utils/cell-renderer';

// columns of monomers dataframe, note that rgroups is hidden and will be displayed as separate columns
export enum MONOMER_DF_COLUMN_NAMES {
  MONOMER = 'Monomer',
  SYMBOL = 'Symbol',
  NAME = 'Name',
  R_GROUPS = '~R-Groups',
  MONOMER_TYPE = 'Monomer Type',
  POLYMER_TYPE = 'Polymer Type',
  NATURAL_ANALOG = 'Natural Analog',
  AUTHOR = 'Author',
  CREATE_DATE = 'Create Date',
  ID = 'ID',
  META = 'Meta',
  SOURCE = 'Source',
}

export const MONOMER_DF_COLUMNS = {
  [MONOMER_DF_COLUMN_NAMES.MONOMER]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.SYMBOL]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.NAME]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.R_GROUPS]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.MONOMER_TYPE]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.POLYMER_TYPE]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.NATURAL_ANALOG]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.AUTHOR]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.CREATE_DATE]: DG.COLUMN_TYPE.DATE_TIME,
  [MONOMER_DF_COLUMN_NAMES.ID]: DG.COLUMN_TYPE.INT,
  [MONOMER_DF_COLUMN_NAMES.META]: DG.COLUMN_TYPE.STRING,
  [MONOMER_DF_COLUMN_NAMES.SOURCE]: DG.COLUMN_TYPE.STRING,
} as const;


export class MonomerManager implements IMonomerManager {
  private adjustTable() {
    if (this.tv?.dataFrame) {
      grok.data.detectSemanticTypes(this.tv.dataFrame);
      this.tv.dataFrame.meta.detectSemanticTypes();
    }
    setTimeout(() => {
      if (this.tv?.grid) {
        this.tv!.grid.props.allowEdit = false;
        this.tv!.grid.col(MONOMER_DF_COLUMN_NAMES.NAME)!.width = 100;
        this.tv!.grid.col(MONOMER_DF_COLUMN_NAMES.SYMBOL)!.width = 70;
      }
    }, 200);
  }

  public static readonly VIEW_NAME = 'Manage Monomers';
  private _newMonomer: Monomer = DUMMY_MONOMER;
  private _newMonomerForm: MonomerForm;
  private monomerLib: IMonomerLib;
  private tv: DG.TableView | null = null;
  private libInput!: DG.InputBase<string | null>;
  private static instance: MonomerManager;
  private activeMonomerLib: IMonomerLib | null = null;

  protected constructor(public monomerLibManamger: MonomerLibManager) {
    this.monomerLib = monomerLibManamger.getBioLib();
    this._newMonomerForm = new MonomerForm(monomerLibManamger, () => this.activeMonomerLib, async (scrollToRowSymbol?: string) => {
      const df = await this.getMonomersDf(this.libInput.value!);
      if (this.tv?.dataFrame) {
        this.tv.dataFrame = df;
        this.adjustTable();
        if (scrollToRowSymbol != undefined) {
          setTimeout(() => {
            const col = df.col(MONOMER_DF_COLUMN_NAMES.SYMBOL)!;
            const scrollToRow = col.toList().indexOf(scrollToRowSymbol);
            if (scrollToRow === -1) return;
            this.tv?.grid.scrollToCell(df.columns.byIndex(0), scrollToRow);
            df.currentRow = df.rows.get(scrollToRow);
          }, 500);
        }
      }
    }, () => this.tv?.dataFrame);
  }

  public static async getInstance(): Promise<MonomerManager> {
    if (!this.instance) {
      const monManager = await MonomerLibManager.getInstance();
      await monManager.awaitLoaded();
      await monManager.loadLibrariesPromise;
      this.instance = new MonomerManager(monManager);
    }
    return this.instance;
  }

  public static async getNewInstance(): Promise<MonomerManager> {
    const monManager = await MonomerLibManager.getInstance();
    await monManager.awaitLoaded();
    await monManager.loadLibrariesPromise;
    return new MonomerManager(monManager);
  }

  async createNewMonomerLib(libName: string, _monomers: Monomer[]): Promise<void> {
    this.tv?.grid && ui.setUpdateIndicator(this.tv.grid.root, true);
    try {
      const monomersString = JSON.stringify(_monomers.map((m) => ({...m, lib: undefined, wem: undefined})), null, 2);
      if (!libName.endsWith('.json'))
        libName += '.json';
      await (await this.monomerLibManamger.getFileManager()).addLibraryFile(monomersString, libName);
      await grok.dapi.files.writeAsText(LIB_PATH + libName, monomersString);
      await this.monomerLibManamger.loadLibraries(false);

      //await this.monomerLibManamger.loadLibraries(true);
      grok.shell.v = await this.getViewRoot(libName);
    } catch (e) {
      grok.shell.error('Error creating library');
      console.error(e);
    } finally {
      this.tv?.grid && ui.setUpdateIndicator(this.tv.grid.root, false);
    }
  }

  async createNewLibDialog(monomers?: Monomer[]) {
    const monomerLibs = (await this.monomerLibManamger.getFileManager()).getValidLibraryPaths();
    const libNameInput = ui.input.string('Library Name', {
      placeholder: 'Enter library name',
      nullable: false,
      onValueChanged: () => {
        const res = validateInput(libNameInput.value);
        d.getButton('Create')?.classList?.toggle('d4-disabled', !!res);
      }
    });
    function getFileNameInputValue() {
      let fileName = libNameInput.value;
      if (!fileName.endsWith('.json'))
        fileName += '.json';
      return fileName;
    };
    function validateInput(v: string) {
      if (!v || !v.trim()) return 'Library name cannot be empty';
      if ((v.endsWith('.json') && monomerLibs.includes(v)) || monomerLibs.includes(v + '.json'))
        return 'Library with this name already exists';
      return null;
    }
    libNameInput.addValidator(validateInput);
    const d = ui.dialog('Create New Library')
      .add(libNameInput)
      .addButton('Create', async () => {
        const vr = validateInput(libNameInput.value);
        if (vr) {
          grok.shell.warning(vr);
          return;
        }
        try {
          await this.createNewMonomerLib(getFileNameInputValue(), monomers ?? []);
        } catch (e) {
          grok.shell.error('Error creating library');
          console.error(e);
        }
        d.close();
      })
      .show();
    d.getButton('Create')?.classList?.toggle('d4-disabled', true);
  }

  get newMonomer() { return this._newMonomer; }

  getNewMonomerForm(): INewMonomerForm {
    return this._newMonomerForm;
  }

  private async getMonomersTableView(fileName?: string, addView = true): Promise<DG.TableView> {
    const df = await this.getMonomersDf(fileName);
    this.tv = DG.TableView.create(df, addView);

    this.adjustTable();
    this.tv.subs.push(
      grok.events.onContextMenu.subscribe(({args}) => {
        if (!args || !args.menu || !args.context || args.context.type !== DG.VIEWER.GRID || !args.context.tableView ||
          args.context.tableView.id !== (this.tv!.id ?? '') || !args.item || !args.item.isTableCell || (args.item.tableRowIndex ?? -1) < 0)
          return;
        const rowIdx = args.item.tableRowIndex;
        args.menu.item('Edit Monomer', () => {
          this.cloneMonomer(this.tv!.dataFrame.rows.get(rowIdx));
        });
        if (this.tv!.dataFrame.selection.trueCount > 0) {
          args.menu.item('Remove Selected Monomers', () => {
            const monomers = Array.from(this.tv!.dataFrame.selection.getSelectedIndexes())
              .map((r) => monomerFromDfRow(this.tv!.dataFrame.rows.get(r)));
            this._newMonomerForm.removeMonomers(monomers, this.libInput.value!);
          });
          args.menu.item('Selection To New Library', () => {
            const monomers = Array.from(this.tv!.dataFrame.selection.getSelectedIndexes())
              .map((r) => monomerFromDfRow(this.tv!.dataFrame.rows.get(r)));
            this.createNewLibDialog(monomers);
          });
        } else {
          args.menu.item('Remove Monomer', () => {
            const monomer = monomerFromDfRow(this.tv!.dataFrame.rows.get(rowIdx));
            this._newMonomerForm.removeMonomers([monomer], this.libInput.value!);
          });
        }
      })
    );
    this.tv.grid && (this.tv.grid.props.allowEdit = false); // disable editing
    return this.tv;
  }

  private static closeAllMonomerManagers() {
    Array.from(grok.shell.tableViews ?? []).filter((v) => v.name === MonomerManager.VIEW_NAME).forEach((v) => v.close());
  }

  private findActiveManagerView() {
    if (!this.tv)
      return null;
    const tv = Array.from(grok.shell.tableViews ?? []).find((tv) => tv.id === this.tv!.id);
    if (tv)
      grok.shell.v = tv;
    else
      MonomerManager.closeAllMonomerManagers();

    return tv ?? null;
  }

  private _skipLibInputOnchange: boolean = false;

  async getViewRoot(libName?: string, addView = true) {
    const availableMonLibs = (await this.monomerLibManamger.getFileManager()).getValidLibraryPaths();
    this._newMonomerForm.molSketcher.resize();
    if (addView && (this.tv = this.findActiveManagerView()) && (libName ?? this.libInput.value)) {
      // get monomer library list
      try {
        this._skipLibInputOnchange = true;
        this.libInput && ((this.libInput as DG.ChoiceInput<string>).items = availableMonLibs);
        libName && (this.libInput.value = libName);
      } catch (e) {
        grok.shell.error('Error updating library list');
        console.error(e);
      } finally {
        this._skipLibInputOnchange = false;
      }
      const df = await this.getMonomersDf(libName);
      this.tv.dataFrame = df;
      this.adjustTable();
      return this.tv;
    }

    libName ??= availableMonLibs[0];
    this.tv = await this.getMonomersTableView(libName, addView);

    // remove project save button and download from ribbons
    let ribbons = this.tv.getRibbonPanels();
    ribbons.forEach((ribbonAr, i) => {
      ribbons[i] = ribbonAr
        .filter((r) => r.getElementsByClassName('grok-icon-filter').length !== 0); // remove everything except filter
    });
    ribbons = ribbons.filter((r) => r.length > 0);

    const newMonomerButton = ui.icons.add(() => {
      this._newMonomerForm.setEmptyMonomer();
    }, 'Add New Monomer');

    const editButton = ui.icons.edit(() => {
      if ((this.tv?.dataFrame?.currentRowIdx ?? -1) < 0) return;
      this.cloneMonomer(this.tv!.dataFrame.rows.get(this.tv!.dataFrame.currentRowIdx));
    }, 'Edit Monomer');

    const deleteButton = ui.icons.delete(async () => {
      const currentRowIdx = this.tv?.dataFrame?.currentRowIdx ?? -1;
      const selectedRows = Array.from(this.tv?.dataFrame?.selection?.getSelectedIndexes() ?? []);
      if (currentRowIdx < 0 && selectedRows.length === 0) return;

      if (selectedRows.length > 0) {
        const monomers = selectedRows.map((r) => monomerFromDfRow(this.tv!.dataFrame.rows.get(r)));
        await this._newMonomerForm.removeMonomers(monomers, this.libInput.value!);
        return;
      }
      const monomer = monomerFromDfRow(this.tv!.dataFrame.rows.get(currentRowIdx));
      await this._newMonomerForm.removeMonomers([monomer], this.libInput.value!);
    });

    ui.tooltip.bind(deleteButton, () =>
      `${(this.tv?.dataFrame?.selection?.getSelectedIndexes() ?? []).length > 0 ? 'Delete selected monomers' : 'Delete monomer'}`);

    const downloadButton = ui.iconFA('arrow-to-bottom', async () => {
      const libName = this.libInput.value;
      if (!libName)
        return grok.shell.error('No library selected');
      let lib: string | null = null;
      try {
        lib = await grok.dapi.files.readAsText(LIB_PATH + libName);
      } catch (e) {
        grok.shell.error(`Error reading library ${libName}`);
        return console.error(e);
      }
      if (!lib)
        return grok.shell.error(`Library ${libName} is empty`);
      DG.Utils.download(libName!, lib!, 'text/plain');
    }, 'Download Monomer Library');

    ribbons.push([newMonomerButton, editButton, deleteButton, downloadButton]);
    this.tv.setRibbonPanels(ribbons);


    this.tv.name = MonomerManager.VIEW_NAME;
    this.libInput = ui.input.choice('Monomer Library', {value: libName, items: availableMonLibs, nullable: false, onValueChanged: async () => {
      try {
        if (this._skipLibInputOnchange) return;
        const df = await this.getMonomersDf(this.libInput.value!);
          this.tv!.dataFrame = df;
          this.adjustTable();
      } catch (e) {
        console.error(e);
      }
    }});
    this.libInput.addOptions(ui.icons.add(() => { this.createNewLibDialog(); }, 'Create new monomer library...'));
    const monForm = this._newMonomerForm.form;
    monForm.prepend(this.libInput.root);
    ui.tools.waitForElementInDom(this.tv.root).then(() => {
      this.tv!.dockManager.dock(monForm, DG.DOCK_TYPE.LEFT, null, undefined, 0.4);
    });
    return this.tv;
  }

  cloneMonomer(dfRow: DG.Row): Monomer {
    this._newMonomer = monomerFromDfRow(dfRow);
    this._newMonomerForm.setMonomer(this._newMonomer);
    return this._newMonomer;
  }

  async getMonomersDf(fileName?: string) {
    this.tv?.grid && ui.setUpdateIndicator(this.tv.grid.root, true);
    try {
      fileName ??= (await this.monomerLibManamger.getFileManager()).getValidLibraryPaths()[0];
      this.activeMonomerLib = await this.monomerLibManamger.readLibrary(LIB_PATH, fileName);
      if (!this.activeMonomerLib) {
        grok.shell.error(`Library ${fileName} not found`);
        return DG.DataFrame.create();
      }
      const ploymerTypes = this.activeMonomerLib.getPolymerTypes();
      const monomers = ploymerTypes.flatMap((polymerType) => {
        return this.activeMonomerLib!.getMonomerSymbolsByType(polymerType).map((symbol) => {
          return this.activeMonomerLib!.getMonomer(polymerType, symbol)!;
        });
      });
      const df = DG.DataFrame.create(monomers.length);

      const uniqueRgroupNamesSet = new Set<string>();
      for (const monomer of monomers) {
        monomer.rgroups.forEach((rg) => {
          rg.label && uniqueRgroupNamesSet.add(rg.label);
        });
      }
      const uniqueRgroupNames = Array.from(uniqueRgroupNamesSet);
      uniqueRgroupNames.sort();
      for (const [k, v] of Object.entries(MONOMER_DF_COLUMNS)) {
        df.columns.addNew(k, v);
        if (k === MONOMER_DF_COLUMN_NAMES.R_GROUPS) {
          for (const rgroupName of uniqueRgroupNames)
            df.columns.addNew(rgroupName, DG.COLUMN_TYPE.STRING);
        }
      }
      df.col(MONOMER_DF_COLUMN_NAMES.SYMBOL)!.semType = 'Monomer';
      df.col(MONOMER_DF_COLUMN_NAMES.SYMBOL)!.setTag(MONOMER_RENDERER_TAGS.applyToBackground, 'true');


      for (let i = 0; i < monomers.length; i++) {
        let molSmiles = getCorrectedSmiles(monomers[i].rgroups, monomers[i].smiles, monomers[i].molfile);
        molSmiles = fixRGroupsAsElementsSmiles(molSmiles);
        // r-groups here might be broken, so need to make sure they are correct
        monomers[i].rgroups = resolveRGroupInfo(monomers[i].rgroups);
        const rgroupSmiles = uniqueRgroupNames.map((rgName) => {
          const rgroup = monomers[i].rgroups.find((rg) => rg.label === rgName);
          return rgroup ? getCaseInvariantValue(rgroup, HELM_RGROUP_FIELDS.CAP_GROUP_SMILES) : '';
        });
        df.rows.setValues(i, [
          molSmiles,
          monomers[i].symbol,
          monomers[i].name,
          JSON.stringify(monomers[i].rgroups ?? []),
          ...rgroupSmiles,
          monomers[i].monomerType,
          monomers[i].polymerType,
          monomers[i].naturalAnalog,
          monomers[i].author,
          monomers[i].createDate,
          monomers[i].id,
          JSON.stringify(monomers[i].meta ?? {}),
          monomers[i].lib?.source ?? '',
        ]);
      }
      df.col(MONOMER_DF_COLUMN_NAMES.MONOMER)!.semType = DG.SEMTYPE.MOLECULE;
      uniqueRgroupNames.forEach((rgName) => {
        df.col(rgName)!.semType = DG.SEMTYPE.MOLECULE;
      });
      df.currentRowIdx = -1;
      // eslint-disable-next-line rxjs/no-ignored-subscription
      df.onCurrentRowChanged.subscribe((_) => {
        try {
          if (df.currentRowIdx === -1 || this._newMonomerForm.molChanged)
            return;
          this.cloneMonomer(df.rows.get(df.currentRowIdx));
        } catch (e) {
          console.error(e);
        }
      });
      return df;
    } catch (e) {
      grok.shell.error('Error creating monomers dataframe');
      console.error(e);
      throw e;
    } finally {
      this.tv?.grid && ui.setUpdateIndicator(this.tv.grid.root, false);
    }
  }

  public resetCurrentRowFollowing() {
    this._newMonomerForm.molChanged = false;
  }
}

// some monomers might be in form of cap groups in place of r-groups (with supplied rgroups info), this function will convert them to r-groups
function substituteCapsWithRGroupsSmiles(smiles: string, rGroups: RGroup[]) {
  let newSmiles = smiles;
  // first substitute all caps with R-groups with corresponding numbers
  rGroups.forEach((rGroup) => {
    const RNum = rGroup.label[1] ?? '1';
    const capRegex = new RegExp(`\\[\\${rGroup.capGroupName}:${RNum}\\]`, 'g');
    newSmiles = newSmiles.replace(capRegex, `[*:${RNum}]`);
  });
  // during some conversions atoms can end up as isotops in smiles string like this [2O]

  // replace all [2O] with [*:2], there can be also two atoms like [2OH] -> [*:2]
  const isotopeRegex = /\[\d[A-Z]{1,2}\]/g;
  newSmiles = newSmiles.replaceAll(isotopeRegex, (match) => {
    const rGroupNum = match[1];
    return `[*:${rGroupNum}]`;
  });

  return newSmiles;
}

// some monomers might have rgroups in notations that suggest they are elements like [R1],
//this function will convert them to correct r-groups
function fixRGroupsAsElementsSmiles(smiles: string) {
  const elementRGroupRegex = /\[R[1-9]\]/g;
  // replace all [R1] with [*:1]
  let correctedSmiles = smiles.replaceAll(elementRGroupRegex, (match) => {
    const rGroupNum = match[2];
    return `[*:${rGroupNum}]`;
  });

  // in some scenarios, rgroups can be written as [2*]
  const elementRGroupRegex2 = /\[\d\*\]/g;
  correctedSmiles = correctedSmiles.replaceAll(elementRGroupRegex2, (match) => {
    const rGroupNum = match[1];
    return `[*:${rGroupNum}]`;
  });

  // in some other scenarios, rgroups can be written as [1*:1] or [1*:0]
  const elementRGroupRegex3 = /\[\d\*\:\d\]/g;
  return correctedSmiles.replaceAll(elementRGroupRegex3, (match) => {
    const rGroupNum = match[1];
    return `[*:${rGroupNum}]`;
  });
}

export const RGROUP_FIELDS = [
  HELM_RGROUP_FIELDS.ALTERNATE_ID, HELM_RGROUP_FIELDS.CAP_GROUP_NAME, HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE, HELM_RGROUP_FIELDS.LABEL
];

// just utility that makes sure fields like smiles and SMILES are treated as the same for setting
function assignObjectCaseInvariant<T extends string>(targetKeys: T[], source: { [key: string]: string }): { [key in T]: string } {
  const target = {} as { [key in T]: string };
  targetKeys.forEach((key) => {
    const sourceKey = Object.keys(source).find((k) => k.toLowerCase() === key.toLowerCase());
    if (sourceKey) target[key] = source[sourceKey];
  });
  return target;
}

// just utility that makes sure fields like smiles and SMILES are treated as the same for getting
function getCaseInvariantValue<T>(obj: { [key: string]: T }, key: string): T | undefined {
  const caseInvariantKey = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase());
  if (!caseInvariantKey) return undefined;
  return obj[caseInvariantKey];
}

// some r groups for some monomers can lack smiles, or something else :D this function will try to fix that
function resolveRGroupInfo(rgps: RGroup[]): RGroup[] {
  return (rgps.map((rg) => {
    const cp = assignObjectCaseInvariant(RGROUP_FIELDS, rg);
    const smi = getCaseInvariantValue(cp, HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE);
    const altId = getCaseInvariantValue(cp, HELM_RGROUP_FIELDS.ALTERNATE_ID);
    const capName = getCaseInvariantValue(cp, HELM_RGROUP_FIELDS.CAP_GROUP_NAME);
    const label = getCaseInvariantValue(cp, HELM_RGROUP_FIELDS.LABEL) ?? 'R1'; // just in case...
    // if all are present, everything is fine
    if ((smi && altId && capName) || label.length < 2)
      return cp;
    // we assume that label is there.. is it too much to ask?
    // from here on, we assume that only one field is present, and we will try to fix the rest
    if (altId && altId.indexOf(`${label}-`) !== -1) {
      const capAtoms = altId.replace(`${label}-`, '');
      if (!capName)
        cp[HELM_RGROUP_FIELDS.CAP_GROUP_NAME] = capAtoms;
      if (!smi)
        cp[HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE] = `[*:${label.substring(1)}][${capAtoms}]`;
    } else if (capName) {
      if (!smi)
        cp[HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE] = `[*:${label.substring(1)}][${capName}]`;
      if (!altId)
        cp[HELM_RGROUP_FIELDS.ALTERNATE_ID] = `${label}-${capName}`;
    }
    return cp;
  }) as RGroup[]).sort((a, b) => a.label?.localeCompare(b.label ?? '') ?? 0);
}


class MonomerForm implements INewMonomerForm {
  molSketcher: grok.chem.Sketcher;
  monomerTypeInput: DG.ChoiceInput<string | null>;
  polymerTypeInput: DG.ChoiceInput<string | null>;
  monomerSymbolInput: DG.InputBase<string>;
  monomerNameInput: DG.InputBase<string>;
  monomerIdInput: DG.InputBase<number | null>;
  monomerNaturalAnalogInput: DG.InputBase<string | null>;
  rgroupsGrid: ItemsGrid;
  metaGrid: ItemsGrid;
  colors: {
    line: string,
    background: string,
    text: string
  };
  colorsEditor: ColorsEditor;
  saveButton: HTMLButtonElement;
  rgroupsGridRoot: HTMLElement;
  private _molChanged: boolean = false;
  get molChanged() { return this._molChanged; }
  set molChanged(v: boolean) { this._molChanged = v; }
  private saveValidationResult?: string | null = null;
  private triggerMolChange: boolean = true; // makes sure that change is not triggered by copying the molecule from grid
  inputsTabControl: DG.TabControl;
  constructor(public monomerLibManager: MonomerLibManager,
    private getMonomerLib: () => IMonomerLib | null, private refreshTable: (scrollToRowSymbol?: string) => Promise<void | undefined>,
    private getMonomersDataFrame: () => DG.DataFrame | undefined) {
    const monomerTypes = ['PEPTIDE', 'RNA', 'CHEM', 'BLOB', 'G'];
    this.colors = {
      line: '#000000',
      background: '#000000',
      text: '#000000',
    };
    this.colorsEditor = new ColorsEditor(this.colors);
    this.molSketcher = new DG.chem.Sketcher();
    this.molSketcher.root.classList.add('monomer-manager-sketcher');
    this.polymerTypeInput = ui.input.choice('Polymer Type', {value: 'PEPTIDE', items: monomerTypes,
      onValueChanged: () => this.onMonomerInputChanged(), nullable: false});

    this.monomerTypeInput = ui.input.choice('Monomer Type', {value: 'Backbone', items: ['Backbone', 'Branch', 'Terminal'],
      onValueChanged: () => this.onMonomerInputChanged(), nullable: false});
    this.monomerSymbolInput = ui.input.string('Monomer Symbol', {nullable: false, onValueChanged: () => this.onMonomerInputChanged()});
    this.monomerNameInput = ui.input.string('Monomer Name', {nullable: false, onValueChanged: () => this.onMonomerInputChanged()});
    this.monomerNameInput.nullable = false;
    this.monomerIdInput = ui.input.int('Monomer ID', {nullable: true, value: 0, onValueChanged: () => this.onMonomerInputChanged()});
    this.monomerNaturalAnalogInput = ui.input.string('Natural Analog', {nullable: true, onValueChanged: () => this.onMonomerInputChanged()});
    this.saveButton = ui.bigButton('Save', async () => {
      const validatorRes = this.validateInputs();
      if (validatorRes) {
        grok.shell.warning(validatorRes);
        return;
      }
      await this.saveMonomer();
    });
    // this.saveButton.style.pointerEvents = 'revert';
    // eslint-disable-next-line rxjs/no-async-subscribe
    this.molSketcher.subs.push(this.molSketcher.onChanged.subscribe(async () => {
      if (!this.triggerMolChange) {
        this.triggerMolChange = true;
        return;
      }
      try {
        this.rgroupsGridRoot.style.display = 'none';
        const rGroupsPane = this.inputsTabControl.panes.find((p) => p.name?.toLowerCase() === 'r-groups');
        rGroupsPane && (rGroupsPane.header.style.removeProperty('background-color'));
        let smiles = this.molSketcher.getSmiles();
        if (!smiles) {
          this.rgroupsGrid.items = [];
          this.rgroupsGrid.render();
          this.saveValidationResult = 'Monomer molecule is required';
          this.invalidateSaveButton();
          return;
        }
        smiles = getCorrectedSmiles([], smiles);

        const rGroupMatches = this.findRgroupsInSmiles(smiles);
        if (rGroupMatches.length === 0) {
          this.rgroupsGrid.items = [];
          this.rgroupsGrid.render();
          this.saveValidationResult = 'At least one R-group is required';
          rGroupsPane && (rGroupsPane.header.style.setProperty('background-color', '#ff000030'));
          this.invalidateSaveButton();
          return;
        }

        // check for duplicate r-groups
        const rGroupsSet = new Set(rGroupMatches.map((match) => match[0]));
        if (rGroupsSet.size !== rGroupMatches.length) {
          this.saveValidationResult = 'Duplicate R-groups are not allowed';
          this.rgroupsGridRoot.style.display = 'flex';
          rGroupsPane && (rGroupsPane.header.style.setProperty('background-color', '#ff000030'));
          this.invalidateSaveButton();
          return;
        }

        const rGroupNums = rGroupMatches.map((match) => Number.parseInt(match[0].match(/[1-9]/g)![0]));
        const rGroupItems: RGroup[] = rGroupNums.map((num) => {
          const existingRGroup = this.rgroupsGrid.items.find((rg) => rg[HELM_RGROUP_FIELDS.LABEL] === `R${num}`) as RGroup | undefined;
          return existingRGroup ?? {
            [HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE]: `[*:${num}][H]`,
            [HELM_RGROUP_FIELDS.ALTERNATE_ID]: `R${num}-H`,
            [HELM_RGROUP_FIELDS.CAP_GROUP_NAME]: 'H',
            [HELM_RGROUP_FIELDS.LABEL]: `R${num}`,
          } as unknown as RGroup;
        });
        // if (this.rgroupsGrid.items.length !== rGroupItems.length)
        this.rgroupsGrid.items = rGroupItems.sort((a, b) => a.label?.localeCompare(b.label ?? '') ?? 0);
        this.rgroupsGrid.render();
        this.rgroupsGridRoot.style.display = 'flex';
        const mostSimilar = await mostSimilarNaturalAnalog(capSmiles(smiles, rGroupItems), this.polymerTypeInput.value ?? '');
        if (mostSimilar)
          this.monomerNaturalAnalogInput.value = mostSimilar;
      } catch (e) {
        console.error(e);
      }
      this.onMonomerInputChanged();
      this._molChanged = true;
    }));


    const rgropProps = [
      DG.Property.js(HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE, DG.TYPE.STRING, {caption: 'R-group SMILES', nullable: false}),
      DG.Property.js(HELM_RGROUP_FIELDS.ALTERNATE_ID, DG.TYPE.STRING, {caption: 'Alternate ID', nullable: false}),
      DG.Property.js(HELM_RGROUP_FIELDS.CAP_GROUP_NAME, DG.TYPE.STRING, {caption: 'R-group name', nullable: false}),
      DG.Property.js(HELM_RGROUP_FIELDS.LABEL, DG.TYPE.STRING, {fieldName: 'R-group Label', nullable: false, userEditable: false}),
    ];
    this.rgroupsGrid = new ItemsGrid(rgropProps, [], {allowAdd: false, allowRemove: false,
      validators: {
        [HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE]: (smi) => !smi ? 'Cap group smiles is required' : !grok.chem.checkSmiles(smi) ? 'Invalid SMILES' : null,
        [HELM_RGROUP_FIELDS.ALTERNATE_ID]: (id) => !id ? 'Alternate ID is required' : null,
        [HELM_RGROUP_FIELDS.CAP_GROUP_NAME]: (name) => !name ? 'Cap group name is required' : null,
        [HELM_RGROUP_FIELDS.LABEL]: (label) => !label ? 'R-group label is required' : null,
      },
      customLabels: {
        [HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE]: 'R-group SMILES',
        [HELM_RGROUP_FIELDS.ALTERNATE_ID]: 'Alternate ID',
        [HELM_RGROUP_FIELDS.CAP_GROUP_NAME]: 'Cap Group Name',
        [HELM_RGROUP_FIELDS.LABEL]: 'Label',
      },
    });
    // eslint-disable-next-line rxjs/no-ignored-subscription
    this.rgroupsGrid.onItemChanged.subscribe(() => this.onMonomerInputChanged());

    this.rgroupsGridRoot = ui.divV([this.rgroupsGrid.root]);
    this.rgroupsGridRoot.style.display = 'none';
    const metaProps = [
      DG.Property.js('Property', DG.TYPE.STRING, {caption: 'Property', nullable: true}),
      DG.Property.js('Value', DG.TYPE.STRING, {caption: 'Value', nullable: true}),
    ];
    this.metaGrid = new ItemsGrid(metaProps, []);
    this.onMonomerInputChanged();


    const mainInputsDiv = ui.divV([
      this.polymerTypeInput,
      this.monomerTypeInput,
      this.monomerSymbolInput,
      this.monomerNameInput,
      this.monomerIdInput,
      this.monomerNaturalAnalogInput,
    ]);

    this.inputsTabControl = ui.tabControl({
      'Monomer': mainInputsDiv,
      'R-groups': this.rgroupsGridRoot,
      'Meta': ui.divV([this.metaGrid.root]),
      'Colors': this.colorsEditor.form,
    }, false);
  }

  invalidateSaveButton() {
    if (this.saveValidationResult)
      this.saveButton.classList.add('d4-disabled');
    else
      this.saveButton.classList.remove('d4-disabled');
  }

  onMonomerInputChanged() {
    setTimeout(() => {
      this.saveValidationResult = this.validateInputs();
      this.invalidateSaveButton();
      const monomerExists = this.polymerTypeInput.value && this.polymerTypeInput.value &&
        !!this.getMonomerLib()?.getMonomer(this.polymerTypeInput.value as PolymerType, this.monomerSymbolInput.value);

      this.saveButton.textContent = monomerExists ? 'Save Monomer' : 'Add Monomer';
    }, 200);
  }

  setEmptyMonomer() {
    this.triggerMolChange = false;
    this.molSketcher.setSmiles('');
    // leave polymer and monomer type as is
    this.monomerSymbolInput.value = '';
    this.monomerNameInput.value = '';
    this.monomerIdInput.value = null;
    this.monomerNaturalAnalogInput.value = null;
    this.rgroupsGrid.items = [];
    this.metaGrid.items = [];
    this.rgroupsGrid.render();
    this.metaGrid.render();
    this.rgroupsGridRoot.style.display = 'none';
    this.onMonomerInputChanged();
    this.colorsEditor.colors = {
      line: '#000000',
      background: '#000000',
      text: '#000000',
    };
  }

  setMonomer(monomer: Monomer) {
    this.triggerMolChange = false;
    this.molSketcher.setSmiles(monomer.smiles);
    this.polymerTypeInput.value = monomer.polymerType;
    this.monomerTypeInput.value = monomer.monomerType;
    this.monomerSymbolInput.value = monomer.symbol;
    this.monomerNameInput.value = monomer.name;
    this.monomerIdInput.value = monomer.id;
    this.monomerNaturalAnalogInput.value = monomer.naturalAnalog ?? null;
    this.rgroupsGrid.items = resolveRGroupInfo(monomer.rgroups);
    this.metaGrid.items = Object.entries(monomer.meta ?? {}).filter(([k, _v]) => k?.toLowerCase() !== 'colors').map(([k, v]) => {
      return {Property: k, Value: v};
    });
    this.rgroupsGrid.render();
    this.metaGrid.render();
    this.rgroupsGridRoot.style.display = 'flex';
    this.onMonomerInputChanged();
    if (!monomer.naturalAnalog) {
      mostSimilarNaturalAnalog(capSmiles(monomer.smiles, this.rgroupsGrid.items as RGroup[]), monomer.polymerType).then((mostSimilar) => {
        if (mostSimilar)
          this.monomerNaturalAnalogInput.value = mostSimilar;
      });
    }
    const colorsString = monomer.meta?.colors ?? '';
    let colorsObj: Partial<typeof this.colors> = {};
    try {
      colorsObj = colorsString ? JSON.parse(colorsString)?.default : {};
    } catch (e) {
      console.error(e);
    }

    this.colorsEditor.colors = {
      line: colorsObj.line ?? '#000000',
      background: colorsObj.background ?? '#000000',
      text: colorsObj.text ?? '#000000',
    };
  }

  validateInputs(): string | null | undefined {
    const rGroupsPane = this.inputsTabControl.panes.find((p) => p.name?.toLowerCase() === 'r-groups');
    rGroupsPane && (rGroupsPane.header.style.removeProperty('background-color'));
    if (!this.molSketcher.getSmiles()) return 'Monomer Molecule field is required';
    for (const i of [this.polymerTypeInput, this.monomerTypeInput, this.monomerSymbolInput, this.monomerNameInput]) {
      if (i.value == null || i.value === '')
        return `${i.caption} field is required`;
    }
    let rgroupError: string | null | undefined = null;
    if (this.rgroupsGrid.items.length < 1)
      rgroupError = 'At least one R-group is required';
    if (!rgroupError) {
      outerFor:
      for (const item of this.rgroupsGrid.items) {
        for (const [k, v] of Object.entries(item)) {
          if (!v) {
            rgroupError = `R-group ${k} field is required for ${item[HELM_RGROUP_FIELDS.LABEL]}`;
            break outerFor;
          }
        }
      }
    }

    if (!rgroupError && this.rgroupsGrid.hasErrors())
      rgroupError = 'R-group fields contain errors';

    if (rgroupError) {
      rGroupsPane && (rGroupsPane.header.style.setProperty('background-color', '#ff000030'));
      return rgroupError;
    }
    return null;
  }

  findRgroupsInSmiles(smiles: string): RegExpMatchArray[] {
    const regexVar1 = /\[[1-9]\*\]/g;
    const regexVar2 = /\[\*\:[1-9]\]/g;
    const matchesAr1 = Array.from(smiles.matchAll(regexVar1));
    const matchesAr2 = Array.from(smiles.matchAll(regexVar2));
    return [...matchesAr1, ...matchesAr2];
  }

  get form() {
    this.inputsTabControl.root.classList.add('monomer-manager-form-tab-control');
    this.inputsTabControl.header.style.marginBottom = '10px';
    const saveB = ui.buttonsInput([this.saveButton]);
    ui.tooltip.bind(saveB, () => this.saveValidationResult ?? 'Save monomer to library');
    return ui.divV([
      this.molSketcher.root,
      this.inputsTabControl.root,
      saveB,
    ], {classes: 'ui-form', style: {paddingLeft: '10px', overflow: 'scroll'}});
  }

  get fieldInputs() {
    return {
      'molecule': this.molSketcher,
      'polymerType': this.polymerTypeInput,
      'monomerType': this.monomerTypeInput,
      'symbol': this.monomerSymbolInput,
      'name': this.monomerNameInput,
      'id': this.monomerIdInput,
      'naturalAnalog': this.monomerNaturalAnalogInput,
    };
  }

  get metaInputs() { return [] as any; } //TODO: add meta inputs
  get rgroupInputs() { return [] as any; } //TODO: add rGroup inputs


  private getMonomerInfoTable(monomer: Monomer) {
    const molSmiles = getCorrectedSmiles(monomer.rgroups, monomer.smiles, monomer.molfile);
    const molImage = grok.chem.drawMolecule(molSmiles, 150, 150);
    const infoTable = ui.tableFromMap({name: monomer.name, author: monomer.author, createDate: monomer.createDate});
    return ui.divH([molImage, infoTable], {style: {alignItems: 'center'}});
  }

  async removeMonomers(monomers: Monomer[], libName: string, notify = true) {
    let libJSON: Monomer[] = [];
    try {
      const libTXT = await grok.dapi.files.readAsText(LIB_PATH + libName);
      libJSON = JSON.parse(libTXT);
    } catch (e) {
      grok.shell.error(`Error reading library ${libName}`);
      return console.error(e);
    }
    const monomerIdxs = monomers.map((monomer) => findLastIndex(libJSON, (m) => m.symbol === monomer.symbol && m.polymerType === monomer.polymerType));
    for (let i = 0; i < monomerIdxs.length; i++) {
      const monomerIdx = monomerIdxs[i];
      if (monomerIdx === -1) {
        grok.shell.error(`Monomer ${monomers[i].symbol} not found in library ${libName}`);
        return;
      }
    }

    const removingMonomers = monomerIdxs.map((idx) => libJSON[idx]);
    const infoTables = ui.divV(removingMonomers.map((m) => this.getMonomerInfoTable(m)), {style: {maxHeight: '500px', overflow: 'scroll'}});
    const isPlural = removingMonomers.length > 1;
    const promptText = isPlural ?
      `Are you sure you want to remove monomers ${removingMonomers.map((m) => m.symbol).join(', ')} from ${libName} library?` :
      `Are you sure you want to remove monomer with symbol ${removingMonomers[0].symbol} from ${libName} library?`;


    const dlg = ui.dialog('Remove Monomer' + (isPlural ? 's' : ''))
      .add(ui.h1(promptText))
      .add(infoTables)
      .addButton('Remove', async () => {
        libJSON = libJSON.filter((m) => !removingMonomers.includes(m));
        await grok.dapi.files.writeAsText(LIB_PATH + libName, JSON.stringify(libJSON, null, 2));
        await (await MonomerLibManager.getInstance()).loadLibraries(true);
        await this.refreshTable();

        if (notify)
          grok.shell.info(`Monomer${isPlural ? 's' : ''} ${removingMonomers.map((m) => m.symbol).join(', ')} ${isPlural ? 'were' : 'was'} successfully removed from ${libName} library`);
        dlg.close();
      })
      .show();
  }

  private async addMonomerToLib(monomer: Monomer, libName: string) {
    // TODO: permissions logic;
    let libJSON: Monomer[] = [];
    try {
      const libTXT = await grok.dapi.files.readAsText(LIB_PATH + libName);
      libJSON = JSON.parse(libTXT);
    } catch (e) {
      grok.shell.error(`Error reading library ${libName}`);
      return console.error(e);
    }
    // check if monomer with given symbol exists in library. search from the end to get the last monomer with that symbol (there can be duplicates)
    const existingMonomerIdx = findLastIndex(libJSON, (m) => m.symbol === monomer.symbol && m.polymerType === monomer.polymerType);
    // check if the same structure already exists in the library. as everything is in canonical smiles, we can directly do string matching
    const existingStructureIdx = this.getMonomersDataFrame()?.col(MONOMER_DF_COLUMN_NAMES.MONOMER)?.toList()?.findIndex((smi) => smi === monomer.smiles);

    const saveLib = async () => {
      try {
        // first remove the existing monomer with that symbol
        const monomerIdx = libJSON.findIndex((m) => m.symbol === monomer.symbol && m.polymerType === monomer.polymerType);
        if (monomerIdx >= 0)
          libJSON[monomerIdx] = {...monomer, lib: undefined, wem: undefined};
        else
          libJSON.push({...monomer, lib: undefined, wem: undefined});

        await grok.dapi.files.writeAsText(LIB_PATH + libName, JSON.stringify(libJSON, null, 2));
        await (await MonomerLibManager.getInstance()).loadLibraries(true);
        await this.refreshTable(monomer.symbol);
        this._molChanged = false; // reset the flag
        grok.shell.info(`Monomer ${monomer.symbol} was successfully saved in library ${libName}`);
      } catch (e) {
        grok.shell.error('Error saving monomer');
        console.error(e);
      }
      this.onMonomerInputChanged();
    };
    let infoTable: HTMLDivElement | null = null;
    let promptMessage = '';
    if (existingMonomerIdx >= 0) {
      infoTable = this.getMonomerInfoTable(libJSON[existingMonomerIdx]);
      promptMessage = `Monomer with symbol '${monomer.symbol}' already exists in library ${libName}.\nAre you sure you want to overwrite it?`;
    } else if ((existingStructureIdx ?? -1) >= 0) {
      const m = monomerFromDfRow(this.getMonomersDataFrame()!.rows.get(existingStructureIdx!));
      infoTable = this.getMonomerInfoTable(m);
      promptMessage = `Monomer with the same structure already exists in library ${libName} with different symbol (${m.symbol}).\nAre you sure you want to duplicate it?`;
    }

    if (infoTable) {
      const dlg = ui.dialog('Save Monomer')
        .add(ui.divText(promptMessage))
        .add(infoTable)
        .addButton('Save', () => {
          dlg.close();
          saveLib();
        })
        .show();
    } else
      await saveLib();
  }

  private async saveMonomer() {
    // TODO: handle some r group logic here
    // const molFile = this.molSketcher.getMolFile();
    let smiles = this.molSketcher.getSmiles();
    if (!smiles || !grok.chem.checkSmiles(smiles)) {
      grok.shell.warning('Invalid SMILES');
      return;
    }
    // correct smiles with correct r-group notation
    smiles = getCorrectedSmiles([], smiles);
    let molFile = grok.chem.convert(smiles, DG.chem.Notation.Smiles, DG.chem.Notation.MolBlock);
    molFile = getCorrectedMolBlock(molFile);

    const meta: any = {};
    this.metaGrid.items.filter((item) => (!!item['Property']) && (!!item['Value'])).forEach((item) => {
      meta[item['Property']] = item['Value'];
    });
    const addingItem = this.metaGrid.addingItem;
    if (addingItem && addingItem['Property'] && addingItem['Value'])
      meta[addingItem['Property']] = addingItem['Value'];

    //console.log(this.metaGrid.addingItem);
    if (this.colorsEditor.colors.line !== '#000000' || this.colorsEditor.colors.background !== '#000000' || this.colorsEditor.colors.text !== '#000000')
      meta.colors = {default: this.colorsEditor.colors};
    const monomer: Monomer = {
      symbol: this.monomerSymbolInput.value,
      name: this.monomerNameInput.value,
      molfile: molFile,
      smiles: smiles,
      polymerType: this.polymerTypeInput.value as PolymerType,
      monomerType: this.monomerTypeInput.value as MonomerType,
      naturalAnalog: this.monomerNaturalAnalogInput.value ? this.monomerNaturalAnalogInput.value : undefined,
      id: this.monomerIdInput.value ?? 0,
      rgroups: this.rgroupsGrid.items as RGroup[], // TODO
      author: DG.User.current().friendlyName,
      createDate: new Date().toISOString(),
      meta
    };
    const source = this.getMonomerLib()?.source;
    if (!source) {
      grok.shell.warning('Monomer library source is not specified');
      return;
    }
    await this.addMonomerToLib(monomer, source);
  }
}

function findLastIndex<T>(ar: ArrayLike<T>, pred: (el: T) => boolean): number {
  let foundIdx = -1;
  for (let i = ar.length - 1; i >= 0; i--) {
    if (pred(ar[i])) {
      foundIdx = i;
      break;
    }
  }
  return foundIdx;
}

/**NB! Can throw error */
function getCorrectedSmiles(rgroups: RGroup[], smiles?: string, molBlock?: string): string {
  const isSmilesMalformed = !smiles || !grok.chem.checkSmiles(smiles);
  if ((isSmilesMalformed) && !molBlock) throw new Error('Both SMILES and MOL block are empty or malformed');

  let canonical = isSmilesMalformed ? grok.chem.convert(molBlock!, DG.chem.Notation.Unknown, DG.chem.Notation.Smiles) : smiles;

  canonical = substituteCapsWithRGroupsSmiles(canonical, rgroups);
  canonical = fixRGroupsAsElementsSmiles(canonical);
  // if the source was smiles, canonicalize it before returning
  return isSmilesMalformed ? canonical : grok.chem.convert(canonical, DG.chem.Notation.Unknown, DG.chem.Notation.Smiles);
}

function getCorrectedMolBlock(molBlock: string) {
  // to correct molblock, we should make sure that
  // 1. RGP field is present at the end, before the M END line
  // 2. RGP field is present in the correct format
  // 3. R group labels are written as R# and not just R
  // 4. there is no ISO field in the molblock. if there is, it needs to be substituted with RGP field and thats it.
  // 5. make sure that R groups have no metadata in the atomblocks

  const lines = molBlock.split('\n');

  const isoLineIdx = lines.findIndex((line) => line.startsWith('M') && line.includes('ISO'));
  if (isoLineIdx !== -1) {
    const isoIndex = lines[isoLineIdx].indexOf('ISO');
    lines[isoLineIdx] = lines[isoLineIdx].substring(0, isoIndex) + 'RGP' + lines[isoLineIdx].substring(isoIndex + 3);
  }

  const molStartIdx = lines.findIndex((line) => line.includes('V2000') || line.includes('V3000'));

  const atomCount = Number.parseInt(lines[molStartIdx].trim().split(' ')[0]);
  const rgroupLineNumbers: { [atomLine: number]: number } = {};
  for (let atomI = molStartIdx + 1; atomI < molStartIdx + 1 + atomCount; atomI++) {
    const rIdx = lines[atomI].indexOf('R ');
    if (rIdx === -1) continue;
    if (lines[atomI][rIdx + 1] !== '#')
      lines[atomI] = lines[atomI].replace('R ', 'R#');
    const splitLine = lines[atomI].trim().split(' ').map((s) => s.trim()).filter(Boolean);
    rgroupLineNumbers[atomI - molStartIdx] = 1;
    if (splitLine.length < 14) // rgroup number can be at 13th index as well
      continue;
    const rgroupNum = Number.parseInt(splitLine[13]);
    if (!Number.isNaN(rgroupNum))
      rgroupLineNumbers[atomI - molStartIdx] = rgroupNum;
  }

  const rgroupLineNums = Object.keys(rgroupLineNumbers);
  // find and possibly add rgp field

  const rgpLineIdx = lines.findIndex((line) => line.startsWith('M') && line.includes('RGP'));

  if (rgpLineIdx === -1) {
    // number of r groups has 3 empty slots before it, atom numbers have 4 empty slots before them
    const rgpLine = `M  RGP${rgroupLineNums.length.toString().padStart(3, ' ')}${Object.entries(rgroupLineNumbers).map(([atomLine, rGroupNum]) => `${atomLine.toString().padStart(4, ' ')}${rGroupNum.toString().padStart(4, ' ')}`).join('')}`;
    const mEndIdx = lines.findIndex((line) => line.startsWith('M') && line.includes('END'));
    lines.splice(mEndIdx, 0, rgpLine);
  }

  //make sure that R# lines do not have any metadata that can be interpreted as isotopes or anything else
  //for example, following line could be interpreted as isotope with mass 2 in some cases
  //"    3.9970    0.3462    0.0000 R#  0  0  0  0  0  1  0  0  0  0  2  0"
  const rGroupActualLines = rgroupLineNums.filter((rLine) => !!Number.parseInt(rLine)).map((atomLine) => Number.parseInt(atomLine) + molStartIdx);
  rGroupActualLines.forEach((lineIdx) => {
    const splitLine = lines[lineIdx].split(' ');
    const rIdx = splitLine.findIndex((s) => s === 'R#');
    if (rIdx === -1)
      return;
    for (let i = rIdx + 1; i < splitLine.length; i++) {
      if (!!splitLine[i] && splitLine[i].length == 1 && (Number.parseInt(splitLine[i]) ?? 0) > 0)
        splitLine[i] = '0';
    }
    lines[lineIdx] = splitLine.join(' ');
  });

  return lines.join('\n');
}

// reverse of r-group substitution, will substitute rgroups with cap groups
function capSmiles(smiles: string, rgroups: RGroup[]) {
  let newSmiles = smiles;
  rgroups.forEach((rg) => {
    const rgroupNum = rg.label[1] ?? '1';
    const capGroupName = getCaseInvariantValue(rg, HELM_RGROUP_FIELDS.CAP_GROUP_NAME);
    newSmiles = newSmiles.replace(`[*:${rgroupNum}]`, `[${capGroupName}]`);
  });
  return newSmiles;
}

function monomerFromDfRow(dfRow: DG.Row): Monomer {
  // hacky way for now, but meta object for now only supports key value pairs and not nested objects
  const metaJSON = JSON.parse(dfRow.get(MONOMER_DF_COLUMN_NAMES.META) ?? '{}');
  for (const key in metaJSON) {
    if (typeof metaJSON[key] === 'object')
      metaJSON[key] = JSON.stringify(metaJSON[key]);
  }
  const smiles = dfRow.get(MONOMER_DF_COLUMN_NAMES.MONOMER);
  if (!smiles)
    throw new Error('Monomer SMILES is empty');
  let molfile = '';

  try {
    molfile = grok.chem.convert(smiles, DG.chem.Notation.Smiles, DG.chem.Notation.MolBlock);
    molfile = getCorrectedMolBlock(molfile);
  } catch (e) {
    grok.shell.error(`Error converting SMILES to molfile, \n ${smiles}`);
    console.error(e);
  }

  return {
    symbol: dfRow.get(MONOMER_DF_COLUMN_NAMES.SYMBOL),
    name: dfRow.get(MONOMER_DF_COLUMN_NAMES.NAME),
    molfile: molfile,
    smiles: smiles,
    polymerType: dfRow.get(MONOMER_DF_COLUMN_NAMES.POLYMER_TYPE),
    monomerType: dfRow.get(MONOMER_DF_COLUMN_NAMES.MONOMER_TYPE),
    naturalAnalog: dfRow.get(MONOMER_DF_COLUMN_NAMES.NATURAL_ANALOG),
    id: dfRow.get(MONOMER_DF_COLUMN_NAMES.ID),
    rgroups: JSON.parse(dfRow.get(MONOMER_DF_COLUMN_NAMES.R_GROUPS) ?? '[]'),
    meta: metaJSON,
    author: dfRow.get(MONOMER_DF_COLUMN_NAMES.AUTHOR),
    createDate: dfRow.get(MONOMER_DF_COLUMN_NAMES.CREATE_DATE),
  };
}

class ColorsEditor {
  private _colors: { line: string, background: string, text: string };
  private _colorInputs: { [key in keyof ColorsEditor['_colors']]: DG.InputBase<string> };
  constructor(colors: { line: string, background: string, text: string }) {
    this._colors = colors;
    this._colorInputs = {
      line: ui.input.color('Line', {value: colors.line, onValueChanged: (v) => this._colors.line = v}),
      background: ui.input.color('Background', {value: colors.background, onValueChanged: (v) => this._colors.background = v}),
      text: ui.input.color('Text', {value: colors.text, onValueChanged: (v) => this._colors.text = v}),
    };
  }

  get colors() {
    return this._colors;
  }

  set colors(cols: { line: string, background: string, text: string }) {
    //need to convert to hex as the input accepts only hex
    const colsHex = {
      line: DG.Color.toHtml(DG.Color.fromHtml(cols.line ?? '#000000')),
      background: DG.Color.toHtml(DG.Color.fromHtml(cols.background ?? '#000000')),
      text: DG.Color.toHtml(DG.Color.fromHtml(cols.text ?? '#000000')),
    };

    this._colors = colsHex;
    for (const key in this._colorInputs)
      this._colorInputs[key as keyof ColorsEditor['_colors']].value = colsHex[key as keyof ColorsEditor['_colors']];
  }

  get colorsMetaFormat() {
    return {colors: {default: this._colors}};
  }

  get form() {
    return ui.form(Object.values(this._colorInputs));
  }
}
