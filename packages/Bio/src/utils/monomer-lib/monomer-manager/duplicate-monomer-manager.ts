/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {Monomer} from '@datagrok-libraries/bio/src/types';
import {UserLibSettings} from '@datagrok-libraries/bio/src/monomer-works/types';
import {getUserLibSettings, setUserLibSettings} from '@datagrok-libraries/bio/src/monomer-works/lib-settings';
import '../../../../css/monomer-manager.css';
import {MonomerLibManager} from '../lib-manager';

class MonomerCard {
  root: HTMLElement = ui.divV([], {classes: 'monomer-card-root'});

  private _selected: boolean = false;
  get selected(): boolean { return this._selected; }
  set selected(value: boolean) {
    this._selected = value;
    this.root.style.border = value ? '2px solid var(--green-2)' : '2px solid var(--grey-2)';
  }

  constructor(public monomer: Monomer) {}

  render() {
    ui.empty(this.root);
    const monomerMolSvg = this.monomer.smiles && grok.chem.checkSmiles(this.monomer.smiles) ?
      grok.chem.drawMolecule(this.monomer.smiles, 200, 200) : grok.chem.drawMolecule(this.monomer.molfile ?? '', 200, 200);
    this.root.appendChild(monomerMolSvg);
    const monomerName =
      ui.divH([ui.divText('Monomer Name: '), ui.divText(this.monomer.name)], {classes: 'monomer-card-info-row'});

    this.root.appendChild(monomerName);
    ui.tooltip.bind(monomerName, this.monomer.name);
    if (this.monomer.lib?.source) {
      const monomerSource =
        ui.divH([ui.divText('Source: '), ui.divText(this.monomer.lib.source)], {classes: 'monomer-card-info-row'});
      this.root.appendChild(monomerSource);
      ui.tooltip.bind(monomerSource, this.monomer.lib.source);
    }
    const monomerType = ui.divH([ui.divText('Polymer Type: '), ui.divText(this.monomer.polymerType)], {classes: 'monomer-card-info-row'});
    this.root.appendChild(monomerType);
    ui.tooltip.bind(monomerType, this.monomer.polymerType);

    ui.tooltip.bind(this.root, 'Select Monomer');
  }
}

class DuplicateSymbolRow {
  root: HTMLElement = ui.divH([],
    {style: {
      alignItems: 'center',
      width: '100%',
      overflow: 'hidden',
      visibility: 'visible',
    }, classes: 'duplicate-monomer-symbol-row'}
  );
  monomerCards: MonomerCard[];
  constructor(
    public monomerSymbol: string, private monomers: Monomer[],
    selectedMonomer: Monomer | null, onMonomerSelected: (monomer: Monomer) => void) {
    this.monomerCards = monomers.map((monomer) => new MonomerCard(monomer));
    const monomerGallery = ui.divH([], {style: {overflowX: 'auto', width: '100%'}});
    const monomerSymbolDiv = ui.h1(monomerSymbol, {style: {lineHeight: '2em', fontSize: '1.5em', marginRight: '20px', width: '100px', overflow: 'hidden', textOverflow: 'elipsis'}});
    ui.tooltip.bind(monomerSymbolDiv, monomerSymbol);
    this.root.appendChild(monomerSymbolDiv);
    this.root.appendChild(monomerGallery);
    this.monomerCards.forEach((card) => {
      card.root.onclick = () => {
        this.monomerCards.forEach((c) => c.selected = false);
        card.selected = true;
        onMonomerSelected(card.monomer);
      };
      if (selectedMonomer && card.monomer === selectedMonomer)
        card.selected = true;
      monomerGallery.appendChild(card.root);
    });
  }

  render() {
    this.monomerCards.forEach((card) => card.render());
  }
}

export class DuplicateMonomerManager {
  monomerCardRows: DuplicateSymbolRow[] = [];
  private saveSettingsPromise: Promise<void> = Promise.resolve();
  private searchInput: DG.InputBase<string>;
  private _root: HTMLElement;
  private monomers: { [polymerType: string]: { [monomerSymbol: string]: Monomer[] } };
  private settings: UserLibSettings;
  private filteredMonomerRows: DuplicateSymbolRow[] = [];
  private static _instance: DuplicateMonomerManager;
  private vv: DG.VirtualView;

  static async getInstance() {
    if (!DuplicateMonomerManager._instance) {
      DuplicateMonomerManager._instance = new DuplicateMonomerManager();
      await DuplicateMonomerManager._instance.refresh();
      const libManager = await MonomerLibManager.getInstance();
      // reason: subscription happens only once, and is needed throught the lifetime of the app
      // eslint-disable-next-line rxjs/no-async-subscribe, rxjs/no-ignored-subscription
      libManager.getMonomerLib().onChanged.subscribe(async () => await DuplicateMonomerManager._instance.refresh());
    }
    DuplicateMonomerManager._instance.refresh();
    return DuplicateMonomerManager._instance;
  }

  public async refresh() {
    this.settings = await getUserLibSettings();
    const libManager = await MonomerLibManager.getInstance();
    await libManager.awaitLoaded();
    await libManager.loadLibrariesPromise;
    this.monomers = libManager.duplicateMonomers;
    this.monomerCardRows = [];
    for (const polymerType in this.monomers) {
      for (const monomerSymbol in this.monomers[polymerType]) {
        const selectedMonomerSource = this.settings.duplicateMonomerPreferences?.[polymerType]?.[monomerSymbol] ?? null;
        const selectedMonomer = selectedMonomerSource ? this.monomers[polymerType][monomerSymbol].find((monomer) => monomer.lib?.source === selectedMonomerSource) ?? null : null;

        this.monomerCardRows.push(new DuplicateSymbolRow(monomerSymbol, this.monomers[polymerType][monomerSymbol], selectedMonomer,
          async (monomer) => {
            this.saveSettingsPromise = this.saveSettingsPromise.then(async () => {
              if (!monomer.lib?.source)
                return;
              this.settings.duplicateMonomerPreferences = this.settings.duplicateMonomerPreferences ?? {};
              this.settings.duplicateMonomerPreferences[polymerType] = this.settings.duplicateMonomerPreferences[polymerType] ?? {};
              this.settings.duplicateMonomerPreferences[polymerType][monomerSymbol] = monomer.lib.source;
              await setUserLibSettings(this.settings);
              grok.shell.info(`Monomer '${monomer.name}' from source '${monomer.lib.source}' selected for symbol '${monomerSymbol}'.`);
              libManager.assignDuplicatePreferances(this.settings);
            });
          }));
      }
    }
    this.filteredMonomerRows = this.monomerCardRows;
    if (!this.vv) {
      this.vv = ui.virtualView(this.monomerCardRows.length, (i) => { this.monomerCardRows[i].render(); return this.monomerCardRows[i].root; });
      this.vv.root.classList.add('duplicate-monomers-virtual-view');
      this.searchInput = ui.input.string('Search', {placeholder: 'Monomer Symbol', value: '', onValueChanged: () => search(this.searchInput.value)});
      this.searchInput.root.style.justifyContent = 'center';
      this.searchInput.input.style.width = '200px';
      this._root = ui.divV([ui.h1('Manage Duplicate Monomer Symbols', {style: {textAlign: 'center'}}),
        this.searchInput.root, ui.divV([this.vv.root], {style: {overflowY: 'auto', height: '100%'}})], {style: {height: '100%'}});

      const search = (query: string) => {
        this.filteredMonomerRows = this.monomerCardRows.filter((row) => row.monomerSymbol.toLowerCase().includes(query.toLowerCase()));
        this.vv.setData(this.filteredMonomerRows.length, (i) => { this.filteredMonomerRows[i].render(); return this.filteredMonomerRows[i].root; });
      };
    } else
      this.vv.setData(this.filteredMonomerRows.length, (i) => { this.filteredMonomerRows[i].render(); return this.filteredMonomerRows[i].root; } );
  }

  private constructor() {}
  get root() {
    return this._root;
  }
}
