/**
 * Cheminformatics support
 * @module chem
 * */
import {BitSet, Column, DataFrame} from './dataframe';
import {SEMTYPE, UNITS} from './const';
import {Subject, Subscription} from 'rxjs';
import {InputBase, Menu, Widget} from './widgets';
import {Func} from './entities';
import * as ui from '../ui';
import {SemanticValue} from './grid';
import $ from 'cash-dom';
import { FuncCall } from '../dg';
import '../css/styles.css';
import { MolfileHandler } from "@datagrok-libraries/chem-meta/src/parsing-utils/molfile-handler";
import {IDartApi} from "./api/grok_api.g";

const api: IDartApi = <any>window;

declare let grok: any;

export const DEFAULT_SKETCHER = 'OpenChemLib';
export const WHITE_MOLBLOCK = `
  Datagrok empty molecule

  0  0  0  0  0  0  0  0  0  0999 V2000
M  END
`;
export const WHITE_MOLBLOCK_V_3000 = `Datagrok macromolecule handler
0  0  0  0  0  0            999 V3000
M  V30 BEGIN CTAB
M  V30 COUNTS 0 0 0 0 0
M  V30 END CTAB
M  END
$$$$`

let extractors: Func[];  // id => molecule


/** Cheminformatics-related routines */
export namespace chem {

  export let SKETCHER_LOCAL_STORAGE = 'sketcher';
  export const STORAGE_NAME = 'sketcher';
  export const KEY = 'selected';
  export const FILTER_KEY = 'chem-filter';
  export const CHEM_FILTER_ALIGN = 'align';
  export const CHEM_FILTER_HIGHLIGHT = 'highlight';

  export enum Notation {
    Smiles = 'smiles',
    Smarts = 'smarts',
    MolBlock = 'molblock', // molblock V2000
    V3KMolBlock = 'v3Kmolblock', // molblock V3000
    Unknown = 'unknown',
  }

  export enum SKETCHER_MODE {
    INPLACE = 'Inplace',
    EXTERNAL = 'External'
  }

  export let currentSketcherType = DEFAULT_SKETCHER;

  export const sketcherTypeChangedOutsideSketcher = new Subject();

  export function isMolBlock(s: string | null) {
    return s != null && s.includes('M  END');
  }

  /** A common interface that all sketchers should implement */
  export abstract class SketcherBase extends Widget {

    onChanged: Subject<any> = new Subject<any>();
    host?: Sketcher;
    _name: string = '';

    constructor() {
      super(ui.box());
    }

    /** SMILES representation of the molecule */
    abstract get smiles(): string;

    abstract set smiles(s: string);

    /** MolFile representation of the molecule */
    abstract get molFile(): string;

    abstract get molV3000(): string;

    abstract set molV3000(s: string);

    abstract set molFile(s: string);

    /** SMARTS query */
    async getSmarts(): Promise<string> {
      return '';
    }

    abstract set smarts(s: string);

    abstract get isInitialized(): boolean;

    get supportedExportFormats(): string[] {
      return [];
    }

    get width(): number {
      return 500;
    }

    get height(): number {
      return 400;
    }

    /** Override to provide custom initialization. At this point, the root is already in the DOM. */
    async init(host: Sketcher) {
      this.host = host;
    }

    refresh(): void {}

    resize(): void {}
  }


  /**
   * Molecule sketcher that supports multiple dynamically initialized implementations.
   * */
  export class Sketcher extends Widget {

    molInput: HTMLInputElement = ui.element('input');
    invalidMoleculeWarning = ui.div('', 'chem-invalid-molecule-warning');
    host: HTMLDivElement = ui.box(null, 'grok-sketcher chem-sketcher-host');
    changedSub: Subscription | null = null;
    sketcher: SketcherBase | null = null;
    onChanged: Subject<any> = new Subject<any>();
    onAlignedChanged: Subject<boolean> = new Subject<boolean>();
    onHighlightChanged: Subject<boolean> = new Subject<boolean>();
    sketcherFunctions: Func[] = [];
    sketcherDialogOpened = false;

    /** Whether the currently drawn molecule becomes the current object as you sketch it */
    syncCurrentObject: boolean = true;

    listeners: Function[] = [];
    _mode = SKETCHER_MODE.INPLACE;
    _smiles: string | null = null;
    _molfile: string | null = null;
    _smarts: string | null = null;
    molFileUnits = Notation.MolBlock;

    loader: HTMLDivElement = ui.loader();
    extSketcherDiv = ui.div([], {style: {cursor: 'pointer'}});
    extSketcherCanvas = ui.canvas();
    filterOptionsDiv = ui.divH([], 'chem-sketcher-filter-options');
    inplaceSketcherDiv: HTMLDivElement | null = null;
    clearSketcherButton: HTMLButtonElement;
    emptySketcherLink: HTMLDivElement;
    resized = false;
    _sketcherTypeChanged = false;
    _autoResized = true;
    _validationFunc: ((molecule: string) => string | null) = (s) => null;
    _isSubstructureFilter = false;
    _align = true;
    _highlight = true;
    error: string | null = null;
    errorDiv = ui.divText('Malformed molecule');
    alighInput: InputBase;
    highlightInput: InputBase;

    set sketcherType(type: string) {
      this._setSketcherType(type);
    }

    get width(): number {
      return this.sketcher ? this.sketcher.width : 500;
    }

    get height(): number {
      return this.sketcher ? this.sketcher.height : 400;
    }

    get isResizing(): boolean {
      return this.resized;
    }

    get autoResized(): boolean {
      return this._autoResized;
    }

    get sketcherTypeChanged(): boolean {
      return this._sketcherTypeChanged;
    }

    get calculating(): boolean {return this.loader.classList.contains('chem-sketcher-loader-show');}
    set calculating(value: boolean) {
      if (value) {
        this.loader.classList.add('chem-sketcher-loader-show');
        this.loader.classList.remove('chem-sketcher-loader-hide');
      } else {
        this.loader.classList.add('chem-sketcher-loader-hide');
        this.loader.classList.remove('chem-sketcher-loader-show');
      }
    }

    get isSubstructureFilter(): boolean {return this._isSubstructureFilter;}
    set isSubstructureFilter(value: boolean) {
      this._isSubstructureFilter = value;
      if (value) {
        this.filterOptionsDiv.append(this.alighInput!.root);
        this.filterOptionsDiv.append(this.highlightInput!.root);
      } else
        ui.empty(this.filterOptionsDiv);
    }
    get align(): boolean {return this.alighInput!.value!;}
    set align(value: boolean) {this.alighInput!.value = value;}
    get highlight(): boolean {return this.highlightInput!.value!;}
    set highlight(value: boolean) {this.highlightInput!.value = value;}
    get filterOptions(): HTMLElement {return this.filterOptionsDiv;}

    getSmiles(): string {
      return this.sketcher?.isInitialized ? this.sketcher.smiles : this._smiles === null ?
        this._molfile !== null ? convert(this._molfile, Notation.MolBlock, Notation.Smiles) :
        this._smarts !== null ? smilesFromSmartsWarning() : '' : this._smiles;
    }

    setSmiles(x: string): void {
      this.validate(x);
      this._smiles = x;
      this._molfile = null;
      this._smarts = null;
      if (this.sketcher?.isInitialized)
        this.sketcher!.smiles = x;
    }

    getMolFile(): string {
      if (this.sketcher?.isInitialized) {
        return this.molFileUnits === Notation.MolBlock ? this.sketcher.molFile : this.sketcher.molV3000;
      } else {
        if (this._molfile === null) {
          return this._smiles !== null ? convert(this._smiles, Notation.Smiles, Notation.MolBlock) :
            this._smarts !== null ? convert(this._smarts, Notation.Smarts, Notation.MolBlock) : '';
        } else
          return this._molfile;
      }
    }

    setMolFile(x: string): void {
      this.validate(x);
      this._molfile = x;
      this._smiles = null;
      this._smarts = null;
      this.molFileUnits = x && x.includes('V3000') ? Notation.V3KMolBlock : Notation.MolBlock;
      if (this.sketcher?.isInitialized) {
        this.molFileUnits === Notation.MolBlock ? this.sketcher!.molFile = x : this.sketcher!.molV3000 = x;
      }
    }

    async getSmarts(): Promise<string | null> {
      return this.sketcher?.isInitialized ? await this.sketcher.getSmarts() : this._smarts === null ?
        this._smiles !== null ? convert(this._smiles, Notation.Smiles, Notation.Smarts) :
        this._molfile !== null ? convert(this._molfile, Notation.MolBlock, Notation.Smarts) : '' : this._smarts;
    }

    setSmarts(x: string): void {
      this.validate(x);
      this._smarts = x;
      this._molfile = null;
      this._smiles = null;
      if (this.sketcher?.isInitialized)
        this.sketcher!.smarts = x;
    }

    get supportedExportFormats(): string[] {
      return this.sketcher ? this.sketcher.supportedExportFormats : [];
    }

    isEmpty(): boolean {
      const molFile = this.getMolFile();
      return Sketcher.isEmptyMolfile(molFile);
    }

    /** Sets the molecule, supports either SMILES, SMARTS or MOLBLOCK formats */
    setMolecule(molString: string, substructure: boolean = false): void {
      if (substructure || isSmarts(molString))
        this.setSmarts(molString);
      else if (isMolBlock(molString))
        this.setMolFile(molString);
      else {
        this.setSmiles(molString);
      }
    }

    setChangeListenerCallback(callback: () => void) {
      this.changedSub?.unsubscribe();
      this.listeners.push(callback);
      if (this.sketcher)
        this.changedSub = this.sketcher.onChanged.subscribe((_: any) => callback());
    }

    /** Sets SMILES, MOLBLOCK, or any other molecule representation */
    setValue(x: string) {
      const index = extractors.map(it => it.name.toLowerCase()).indexOf('nametosmiles');
      const el = extractors.splice(index, 1)[0];
      extractors.splice(extractors.length, 0, el);

      const extractor = extractors
        .find((f) => new RegExp(f.options['inputRegexp']).test(x));

          if (extractor != null && !checkSmiles(x) && !isMolBlock(x)) {
            this.calculating = true;
            extractor
              .apply([new RegExp(extractor.options['inputRegexp']).exec(x)![1]])
              .then((mol) => {
                mol ? this.setMolecule(mol) : this.setMolecule('');
              }).catch(() => {
                this.setMolecule('');
              }).finally(() => {
                this.calculating = false;
              });
          }
          else
            this.setMolecule(x);
    }

    validate(x: string): void {
      if (Sketcher.isEmptyMolfile(x))
        this.molInput.value = '';
      this.error = this._validationFunc(x);
      this.updateInvalidMoleculeWarning();
    }

    constructor(mode?: SKETCHER_MODE, validationFunc?: (s: string) => string | null) {
      super(ui.div());
      if (mode)
        this._mode = mode;
      this.root.style.height = '100%';
      this.extSketcherCanvas.classList.add('chem-external-sketcher-canvas');
      this.clearSketcherButton = this.createClearSketcherButton(this.extSketcherCanvas);
      this.emptySketcherLink = ui.divText('Sketch', 'chem-sketch-link sketch-link');
      this.calculating = false;
      ui.tooltip.bind(this.emptySketcherLink, 'Click to edit');
      ui.tooltip.bind(this.errorDiv, () => this.error);
      if (validationFunc)
        this._validationFunc = validationFunc;
      this.alighInput = this.createAlignHighlightInputs(CHEM_FILTER_ALIGN, 'Align', () => {
        grok.userSettings.add(FILTER_KEY, CHEM_FILTER_ALIGN, this.alighInput!.value ? 'true' : 'false');
        this.onAlignedChanged.next(this.alighInput!.value);
      });
      this.highlightInput = this.createAlignHighlightInputs(CHEM_FILTER_HIGHLIGHT, 'Highlight', () => {
        grok.userSettings.add(FILTER_KEY, CHEM_FILTER_HIGHLIGHT, this.highlightInput!.value ? 'true' : 'false');
        this.onHighlightChanged.next(this.highlightInput!.value);
      });
      this.subs.push(sketcherTypeChangedOutsideSketcher.subscribe(() => this.sketcherType = currentSketcherType));
      setTimeout(() => this.createSketcher(), 100);
    }

    createAlignHighlightInputs(key: string, inputName: string, callback: () => void) {
      const value: string = grok.userSettings.getValue(FILTER_KEY, key);
      return ui.input.bool(inputName, {value: !value || value === 'true', onValueChanged: callback});
    }

    /** In case sketcher is opened in filter panel use EXTERNAL mode*/
    setExternalModeForSubstrFilter() {
      if (this.root.closest('.d4-filter'))
        this._mode = SKETCHER_MODE.EXTERNAL;
    }

    resize() {
      if (this.sketcher?.isInitialized) {
        this.sketcher?.resize();
        this.resized = true;
      }
    }

    createSketcher() {
      this.sketcherFunctions = Func.find({ tags: ['moleculeSketcher'] });
      this.setExternalModeForSubstrFilter();
      if (this._mode === SKETCHER_MODE.INPLACE)
        this.root.appendChild(this.createInplaceModeSketcher());
      else
        this.root.appendChild(this.createExternalModeSketcher());
    }

    updateExtSketcherContent() {
      ui.tools.waitForElementInDom(this.extSketcherDiv).then((_) => {
        const width = this.extSketcherDiv.parentElement!.clientWidth < 100 ? 100 : this.extSketcherDiv.parentElement!.clientWidth;
        const height = width / 2;
        if (!(this.isEmpty()) && this.extSketcherDiv.parentElement) {
          ui.empty(this.extSketcherDiv);
          const currentMolfile = this.getMolFile();
          ui.tooltip.bind(this.extSketcherCanvas, () => this.createMoleculeTooltip(currentMolfile));
          const r = window.devicePixelRatio;
          canvasMol(0, 0, width * r, height * r, this.extSketcherCanvas, this.getMolFile()!, null, { normalizeDepiction: true, straightenDepiction: true })
            .then((_) => {
              ui.empty(this.extSketcherDiv);
              this.extSketcherDiv.append(this.extSketcherCanvas);
              this.extSketcherDiv.append(this.clearSketcherButton);
            });
        } else {
          ui.empty(this.extSketcherDiv);
          this.extSketcherDiv.append(this.emptySketcherLink);
        }
      });
    };

    createMoleculeTooltip(currentMolfile: string): HTMLElement{
      const molfileHandler = MolfileHandler.getInstance(currentMolfile);
      const maxDelta = 10; // in case deltaX or deltaY exceeds maxDelata we assume molecule is large one and draw it in a tooltip
      const zoom = 20; // coefficient we use to calculate size of canvas to feet molecule
      const xCoords = molfileHandler.x;
      const yCoords = molfileHandler.y;
      const bondedAtoms = molfileHandler.pairsOfBondedAtoms;
      let tooltip: HTMLElement;
      if (xCoords.length > 1 && yCoords.length > 1 && bondedAtoms.length) {
        const distance = Math.sqrt(Math.pow((xCoords[bondedAtoms[0][0] - 1] - xCoords[bondedAtoms[0][1] - 1]), 2) +
          Math.pow((yCoords[bondedAtoms[0][0] - 1] - yCoords[bondedAtoms[0][1] - 1]), 2));
        const deltaX = (Math.max(...xCoords) - Math.min(...xCoords))/distance;
        const deltaY = (Math.max(...yCoords) - Math.min(...yCoords))/distance;
        tooltip = (deltaX > maxDelta || deltaY > maxDelta) ? this.drawToCanvas(deltaX*zoom, deltaY*zoom, currentMolfile) : ui.divText('Click to edit');
      } else {
        tooltip = ui.divText('Click to edit');
      }
      return tooltip;
    }

    createClearSketcherButton(canvas: HTMLCanvasElement): HTMLButtonElement {
      const clearButton = ui.button('Clear', () => {
        this.setMolecule('');
        if (!this.sketcher) {
          this.onChanged.next(null);
        }
        this.updateExtSketcherContent();
      });
      ui.tooltip.bind(clearButton, 'Clear sketcher');
      clearButton.classList.add('chem-clear-sketcher-button');
      clearButton.onmouseover = () => {clearButton.style.visibility = 'visible';};
      canvas.onmouseenter = () => {clearButton.style.visibility = 'visible';};
      canvas.onmouseout = () => {clearButton.style.visibility = 'hidden';};
      return clearButton;
    }

    updateInvalidMoleculeWarning() {
      ui.empty(this.invalidMoleculeWarning);
      if (this.error) {
        this.invalidMoleculeWarning.append(this.errorDiv);
      }
    }

    createExternalModeSketcher(): HTMLElement {
      const closeDlg = () => {
        this.sketcherDialogOpened = false;
        this.resized = false;
        this._autoResized = true;
      }

      this.extSketcherDiv = ui.div([], {style: {cursor: 'pointer'}});

      this.extSketcherDiv.onclick = () => {
        if (!this.sketcherDialogOpened) {
          this.sketcherDialogOpened = true;
          let savedMolFile = this.getMolFile();

          const hostDlg = ui.dialog();
          hostDlg.add(this.createInplaceModeSketcher())
            .onOK(() => {
              this.updateExtSketcherContent();
              Sketcher.addToCollection(Sketcher.RECENT_KEY, this.getMolFile());
              closeDlg();
            })
            .onCancel(() => {
              this.setMolFile(savedMolFile!);
              closeDlg();
            })
            .show({ resizable: true }); 
          hostDlg.root.append(this.filterOptionsDiv);
          ui.onSizeChanged(hostDlg.root).subscribe((_) => {
            if (this.sketcherDialogOpened)
              if (!this.sketcher?.isInitialized)
                return;
              else
                //for some sketchers onSizeChanged is called once after dialog is just opened. We call resize() only when resized manually
                this._autoResized ? this._autoResized = false : this.resize();
          });
        }
      };


      this.updateExtSketcherContent();
      return this.extSketcherDiv;
    }

    createInplaceModeSketcher(): HTMLElement {
      const molInputDiv = ui.div();
      $(this.molInput).attr('placeholder', 'SMILES, MOLBLOCK, Inchi, ChEMBL id, etc');

      if (extractors == null) {
        try {
          extractors = Func.find({meta: {role: 'converter'}}).filter(it => it.outputs.filter(o => o.semType == SEMTYPE.MOLECULE).length);
        } catch {
          extractors = [];
        }
      }
      const applyInput = (e: any) => {
        const newSmilesValue: string = (e?.target as HTMLTextAreaElement).value;

        if (this.getSmiles() !== newSmilesValue)
          this.setValue(newSmilesValue);
      };

      this.molInput.addEventListener('keydown', (e) => {
        if (e.key == 'Enter') {
          applyInput(e);
          e.stopImmediatePropagation();
        }
      });

      this.molInput.addEventListener('paste', (e) => {
        const text = e.clipboardData?.getData('text/plain');
        if (text != null && (isMolBlock(text) || checkSmiles(text))) {
          if (isMolBlock(text))
            e.preventDefault();
          this.setValue(text);
        }
      });

      let optionsIcon = ui.iconFA('bars', () => {
        const menuHost = ui.div([], {style: {position: 'fixed', zIndex: '100'}});
        this.host.parentElement?.prepend(menuHost);
        Menu.popup()
          .item('Copy as SMILES', () => navigator.clipboard.writeText(this.getSmiles()))
          .item('Copy as MOLBLOCK', () => navigator.clipboard.writeText(this.getMolFile()))
          .group('Recent')
          .items(Sketcher.getCollection(Sketcher.RECENT_KEY).map((m) => ui.tools.click(this.drawToCanvas(150, 60, m), () => this.setMolecule(m))), () => { })
          .endGroup()
          .group('Favorites')
          .item('Add to Favorites', () => Sketcher.addToCollection(Sketcher.FAVORITES_KEY, this.getMolFile()))
          .separator()
          .items(Sketcher.getCollection(Sketcher.FAVORITES_KEY).map((m) => ui.tools.click(this.drawToCanvas(150, 60, m), () => this.setMolecule(m))), () => { })
          .endGroup()
          .separator()
          .items(this.sketcherFunctions.map((f) => f.friendlyName), (friendlyName: string) => {
            if (currentSketcherType === friendlyName)
              return;
            currentSketcherType = friendlyName;
            grok.userSettings.add(STORAGE_NAME, KEY, friendlyName);
            this.sketcherType = currentSketcherType;
            if (!this.resized)
              this._autoResized = true;
          },
            {
              isChecked: (item) => item === currentSketcherType, toString: item => item,
              radioGroup: 'sketcher type'
            })
          .show({element: menuHost, x: (this.host.parentElement?.offsetWidth ?? 0) + 10, y: 10});
      });
      $(optionsIcon).addClass('d4-input-options');
      molInputDiv.append(ui.div([this.molInput, optionsIcon], 'grok-sketcher-input'));
      this.calculating = false;
      this.sketcherType = currentSketcherType;

      this.inplaceSketcherDiv = ui.div([
        molInputDiv,
        this.loader,
        this.host,
        this.invalidMoleculeWarning], {style: {height: '90%'}});

      return this.inplaceSketcherDiv;
    }


    private _setSketcherType(sketcherType: string): void {
      const getMolecule = async () => {
        return this._smiles === null ? this._molfile === null ? this._smarts === null ? this.getMolFile() :
          await this.getSmarts() : this.getMolFile() : this.getSmiles();
      };
      getMolecule().then(async (molecule) => {
        this._sketcherTypeChanged = true; //variable to check if refresh should be called on filter
        this._setSketcherSize(); //set default size to show update indicator
        ui.setUpdateIndicator(this.host, true);
        this.changedSub?.unsubscribe();
        const sketcherFunc = this.sketcherFunctions.find(e => e.friendlyName == sketcherType|| e.name === sketcherType) ?? this.sketcherFunctions.find(e => e.friendlyName == DEFAULT_SKETCHER);
        const sketcher = await sketcherFunc!.apply();
        await ui.tools.waitForElementInDom(this.root);
        if(currentSketcherType !== sketcherType) //in case sketcher type has been changed while previous sketcher was loading
          return;
        this.sketcher = sketcher; //setting this.sketcher only after ensuring that this is last selected sketcher
        ui.empty(this.host);
        this.host.appendChild(this.sketcher!.root);
        this._setSketcherSize(); //update sketcher size according to base sketcher width and height
        await this.sketcher!.init(this);
        ui.setUpdateIndicator(this.host, false);
        this._sketcherTypeChanged = false;
        this.changedSub = this.sketcher!.onChanged.subscribe((_: any) => {
          const molFile = this.getMolFile();
          this.validate(molFile);
          this.onChanged.next(null);
          for (let callback of this.listeners)
            callback();
          if (this.syncCurrentObject) {
            if (!Sketcher.isEmptyMolfile(molFile))
              grok.shell.o = SemanticValue.fromValueType(molFile, SEMTYPE.MOLECULE, UNITS.Molecule.MOLBLOCK);
          }
        });
        if (molecule)
          this.setMolecule(molecule!, this._smarts !== null);
      });
    }

    private _setSketcherSize() {
      this.host.style.minWidth = `${this.width}px`;
      this.host.style.minHeight = `${this.height}px`;
    }

    static readonly FAVORITES_KEY = 'chem-molecule-favorites';
    static readonly RECENT_KEY = 'chem-molecule-recent';

    static getCollection(key: string): string[] {
      return JSON.parse(localStorage.getItem(key) ?? '[]');
    }

    static addToCollection(key: string, molecule: string) {
      const molecules = Sketcher.getCollection(key);
      Sketcher.checkDuplicatesAndAddToStorage(molecules, molecule, key);
    }

    static checkDuplicatesAndAddToStorage(storage: string[], molecule: string, localStorageKey: string) {
      if (!Sketcher.isEmptyMolfile(molecule)) {
        storage.length ?
        grok.functions
          .call('Chem:removeDuplicates', { molecules: storage, molecule: molecule })
          .then((array: any) => localStorage.setItem(localStorageKey, JSON.stringify([molecule, ...array.slice(0, 9)]))) :
        localStorage.setItem(localStorageKey, JSON.stringify([molecule]));
      }
    }

    static isEmptyMolfile(molFile: string): boolean {
      const rowWithAtomsAndNotation = molFile && molFile.split("\n").length >= 4 ? molFile.split("\n")[3] : '';
      return (molFile == null || molFile == '' ||
       (rowWithAtomsAndNotation.trimStart()[0] === '0' && rowWithAtomsAndNotation.trimEnd().endsWith('V2000')) ||
       (rowWithAtomsAndNotation.trimEnd().endsWith('V3000') && molFile.includes('COUNTS 0')));
    }


    detach() {
      this.changedSub?.unsubscribe();
      this.sketcher?.detach();
      super.detach();
    }

    drawToCanvas(w: number, h: number, molecule: string): HTMLElement{
      const imageHost = ui.canvas();
      canvasMol(0, 0, w, h, imageHost, molecule, null, {normalizeDepiction: true, straightenDepiction: true});
      return imageHost;
    }

  }

  /**
   * Computes similarity scores for molecules in the input vector based on a preferred similarity score.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/chem/similarity-scoring-scores}
   * @async
   * @param {Column} column - Column with molecules to search in
   * @param {string} molecule - Reference molecule in one of formats supported by RDKit:
   *   smiles, cxsmiles, molblock, v3Kmolblock, and inchi
   * @param {Object} settings - Properties for the similarity function (type, parameters, etc.)
   * @returns {Promise<Column>} - Column of corresponding similarity scores
   * */
  export async function getSimilarities(column: Column, molecule: string = '', settings: object = {}): Promise<Column | null> {

    const result = await grok.functions.call('Chem:getSimilarities', {
      'molStringsColumn': column,
      'molString': molecule
    });
    // TODO: figure out what's the state in returning columns from package functions
    return (molecule.length != 0) ? result.columns.byIndex(0) : null;

  }

  /**
   * Computes similarity scores for molecules in the input vector based on a preferred similarity score.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/chem/similarity-scoring-sorted}
   * @async
   * @param {Column} column - Column with molecules to search in
   * @param {string} molecule - Reference molecule in one of formats supported by RDKit:
   *   smiles, cxsmiles, molblock, v3Kmolblock, and inchi
   * @param {Object} settings - Properties for the similarity function
   * @param {int} settings.limit - Would return top limit molecules based on the score
   * @param {int} settings.cutoff - Would drop molecules which score is lower than cutoff
   * @returns {Promise<DataFrame>} - DataFrame with 3 columns:
   *   - molecule: original molecules string representation from the input column
   *   - score: similarity scores within the range from 0.0 to 1.0;
   *            DataFrame is sorted descending by this column
   *   - index: indices of the molecules in the original input column
   * */
  export async function findSimilar(column: Column, molecule: string = '', settings = {
    limit: Number.MAX_VALUE,
    cutoff: 0.0
  }): Promise<DataFrame | null> {
    const result = await grok.functions.call('Chem:findSimilar', {
      'molStringsColumn': column,
      'molString': molecule,
      'limit': settings.limit,
      'cutoff': settings.cutoff
    });
    return (molecule.length != 0) ? result : null;
  }


  /**
   * Returns the specified number of most diverse molecules in the column.
   * See example: {@link https://datagrok.ai/help/datagrok/solutions/domains/chem/#similarity-and-diversity-search}
   * @async
   * @param {Column} column - Column with molecules to search in
   * @param {Object} settings - Settings
   * @param {int} settings.limit - Would return top limit molecules
   * @returns {Promise<DataFrame>} - DataFrame with 1 column:
   *   - molecule: set of diverse structures
   * */
  export async function diversitySearch(column: Column, settings = {limit: Number.MAX_VALUE}): Promise<DataFrame> {
    const result = await grok.functions.call('Chem:getDiversities', {
      'molStringsColumn': column,
      'limit': settings.limit
    });
    return result;
  }

  /**
   * Searches for a molecular pattern in a given column, returning a bitset with hits.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/chem/substructure-search-library}
   * @async
   * @param {Column} column - Column with molecules to search
   * @param {string} pattern - Pattern, either one of which RDKit supports
   * @param settings
   * @returns {Promise<BitSet>}
   * */
  export async function searchSubstructure(column: Column, pattern: string = '', settings: {
    molBlockFailover?: string;
  } = {}): Promise<BitSet> {

    return (await grok.functions.call('Chem:searchSubstructure', {
      'molStringsColumn': column,
      'molString': pattern,
      'molBlockFailover': (settings.hasOwnProperty('molBlockFailover') ? settings.molBlockFailover : '') ?? ''
    })).get(0);
  }

  /**
   * Performs R-group analysis.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/chem/descriptors}
   * @async
   * @param {DataFrame} table - Table.
   * @param {string} column - Column name with molecules to analyze.
   * @param {string} core - Core molecule.
   * @returns {Promise<DataFrame>}
   * */
  export async function rGroup(table: DataFrame, column: string, core: string): Promise<DataFrame> {
    return await grok.functions.call('Chem:FindRGroups', {
      molecules: column, df: table, core: core, prefix: 'R'
    });
  }

  /**
   * Finds Most Common Substructure in the specified column.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/chem/mcs}
   * @async
   * @param {Column} column - Column with SMILES to analyze.
   * @returns {Promise<string>}
   * */
  export async function mcs(table: DataFrame, column: string, returnSmarts: boolean = false,
    exactAtomSearch = true, exactBondSearch = true): Promise<string> {
    return await grok.functions.call('Chem:FindMCS', {
      'molecules': column,
      'df': table,
      'exactAtomSearch': exactAtomSearch,
      'exactBondSearch': exactBondSearch,
      'returnSmarts': returnSmarts
    });
  }

  /**
   * Calculates specified descriptors for the molecular column.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/chem/descriptors}
   *
   * @async
   * @param {DataFrame} table - Table.
   * @param {string} column - Column name with SMILES to calculate descriptors for.
   * @param {string[]} descriptors - RDKit descriptors to calculate.
   * @returns {Promise<DataFrame>}
   * */
  export async function descriptors(table: DataFrame, column: string, descriptors: string[]): Promise<DataFrame> {
    await grok.functions.call('Chem:chemDescriptors', {'table': table,
      'molecules': table.columns.byName(column), 'descriptors': descriptors});
    return table;
  }

  /**
   * Returns available descriptors tree.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/chem/descriptors}
   * */
  export async function descriptorsTree(): Promise<object> {
    return await grok.functions.call('Chem:chemDescriptorsTree');
  }

  /**
   * Renders a molecule to SVG
   * See example: {@link https://public.datagrok.ai/js/samples/domains/chem/mol-rendering}
   * @param {string} smiles - accepts smiles/molfile format
   * @param {number} width
   * @param {number} height
   * @param {object} options - OCL.IMoleculeToSVGOptions
   * @returns {HTMLDivElement}
   * */
  export function svgMol(
    smiles: string, width: number = 300, height: number = 200,
    options?: { [key: string]: boolean | number | string }
  ): HTMLDivElement {
    let root = document.createElement('div');
    // @ts-ignore
    import('openchemlib/full.js').then((OCL) => {
      let m = smiles.includes('M  END') ? OCL.Molecule.fromMolfile(smiles) : OCL.Molecule.fromSmiles(smiles);
      root.innerHTML = m.toSVG(width, height, undefined, options);
    });
    return root;
  }

  /**
   * Renders a molecule to canvas (using RdKit)
   * TODO: should NOT be async
   * See example: {@link }
   * */
  export async function canvasMol(
    x: number, y: number, w: number, h: number,
    canvas: Object, molString: string, scaffoldMolString: string | null = null,
    options = {normalizeDepiction: true, straightenDepiction: true}
  ): Promise<void> {
    await grok.functions.call('Chem:canvasMol', {
      'x': x, 'y': y, 'w': w, 'h': h, 'canvas': canvas,
      'molString': molString, 'scaffoldMolString': scaffoldMolString ?? '',
      'options': options
    });
  }

  export function drawMolecule(molString: string, w?: number, h?: number, popupMenu: boolean = false): HTMLDivElement {
    const molDiv = ui.div();
    grok.functions.call('Chem:drawMolecule', {
      'molStr': molString, 'w': w, 'h': h, 'popupMenu': popupMenu
    })
      .then((res: HTMLElement) => molDiv.append(res));
    return molDiv;
  }

  /**
   * Sketches Molecule sketcher.
   * @param {function} onChangedCallback - a function that accepts (smiles, molfile)
   * @param {string} smiles Initial molecule
   * @returns {HTMLElement}
   * */
  export function sketcher(onChangedCallback: Function, smiles: string = ''): HTMLElement {
    return api.grok_Chem_Sketcher(onChangedCallback, smiles);
  }

  export function convert(s: string, sourceFormat: Notation, targetFormat: Notation): string {
    const convertFunc = Func.find({package: 'Chem', name: 'convertMolNotation'})[0];
    const funcCall: FuncCall = convertFunc.prepare({molecule: s, sourceNotation: sourceFormat, targetNotation: targetFormat});
    funcCall.callSync();
    const resultMolecule = funcCall.getOutputParamValue();
    return resultMolecule;
  }

  export function checkSmiles(s: string): boolean {
    const isSmilesFunc = Func.find({package: 'Chem', name: 'isSmiles'})[0];
    const funcCall: FuncCall = isSmilesFunc.prepare({s});
    funcCall.callSync();
    const resultBool = funcCall.getOutputParamValue();
    return resultBool;
  }

  export function isSmarts(s: string): boolean {
    const isSmartsFunc = Func.find({package: 'Chem', name: 'isSmarts'});
    if (isSmartsFunc.length) {
      const funcCall: FuncCall = isSmartsFunc[0].prepare({s});
      funcCall.callSync();
      const resultBool = funcCall.getOutputParamValue();
      return resultBool;
    }
    return false;
  }

  export function smilesFromSmartsWarning(): string {
    grok.shell.warning(`Smarts cannot be converted to smiles`);
    return '';
  }

}
