/* Do not change these import lines to match external modules in webpack configuration */
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {Subject, BehaviorSubject, Observable} from 'rxjs';

import {SeqHandler} from '@datagrok-libraries/bio/src/utils/seq-handler';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';

import {DEFAULT_FORMATS} from '../../common/model/const';
import {download} from '../../common/model/helpers';
import {FormatDetector} from '../../common/model/parsing-validation/format-detector';
import {SequenceValidator} from '../../common/model/parsing-validation/sequence-validator';
import {ColoredTextInput} from '../../common/view/components/colored-input/colored-text-input';
import {highlightInvalidSubsequence} from '../../common/view/components/colored-input/input-painters';
import {MoleculeImage} from '../../common/view/components/molecule-img';
import {APP_NAME, DEFAULT_AXOLABS_INPUT} from '../../common/view/const';
import {IsolatedAppUIBase} from '../../common/view/isolated-app-ui';
import {MonomerLibViewer} from '../../common/view/monomer-lib-viewer';
import {SequenceToMolfileConverter} from '../../structure/model/sequence-to-molfile';
import {convert, getSupportedTargetFormats, getTranslatedSequences} from '../model/conversion-utils';
import {FormatConverter} from '../model/format-converter';
import {ITranslationHelper} from '../../../types';

import {NUCLEOTIDES_FORMAT, SEQUENCE_COPIED_MSG, SEQ_TOOLTIP_MSG} from './const';
import './style.css';
import {_package} from '../../../package';

const enum REQUIRED_COLUMN_LABEL {
  SEQUENCE = 'Sequence',
}

const REQUIRED_COLUMN_LABELS = [REQUIRED_COLUMN_LABEL.SEQUENCE];

class TranslatorAppLayout {
  private eventBus: EventBus;
  private inputFormats = Object.keys(_package.jsonData.codesToHelmDict).concat(DEFAULT_FORMATS.HELM);

  constructor(
    private readonly th: ITranslationHelper
  ) {
    this.moleculeImgDiv = ui.div([]);
    this.moleculeImgDiv.className = 'mol-host';
    this.moleculeImgDiv.style.border = '1px solid var(--grey-2)';
    this.moleculeImgDiv.style.borderRadius = '1px';
    this.moleculeImgDiv.style.marginTop = '12px';

    this.outputTableDiv = ui.div([]);
    this.formatChoiceInput = ui.choiceInput('', DEFAULT_FORMATS.HELM, this.inputFormats, async () => {
      this.format = this.formatChoiceInput.value;
      this.updateTable();
      await this.updateMolImg();
    });
    this.sequenceInputBase = ui.textInput('', DEFAULT_AXOLABS_INPUT,
      () => { this.onInput.next(); });

    this.init();

    DG.debounce<string>(this.onInput, 300).subscribe(async () => {
      this.init();
      this.formatChoiceInput.value = this.format;
      this.updateTable();
      await this.updateMolImg();
    });

    this.eventBus = EventBus.getInstance();
  }

  // todo: reduce # of state vars by further refactoring legacy code
  private onInput = new Subject<string>();
  private moleculeImgDiv: HTMLDivElement;
  private outputTableDiv: HTMLDivElement;
  private formatChoiceInput: DG.InputBase;
  private sequenceInputBase: DG.InputBase;
  private molfile: string;
  public sequence: string;
  private format: string | null;

  async getHtmlElement(): Promise<HTMLDivElement> {
    const singleSequenceControls = this.constructSingleSequenceControls();
    const bulkControls = this.constructBulkTranslationControls();
    const layout = ui.box(
      ui.panel([
        singleSequenceControls,
        bulkControls,
        ui.block([ui.box(this.moleculeImgDiv)])
      ])
    );

    this.formatChoiceInput.value = this.format;
    this.updateTable();
    await this.updateMolImg();
    return layout;
  }

  private constructBulkTranslationControls(): HTMLDivElement {
    const title = ui.h1('Bulk');
    ui.tooltip.bind(title, 'Bulk translation from table input');

    const tableControlsManager = new TableControlsManager(this.eventBus);
    const tableControls = tableControlsManager.createUIComponents();
    const inputFormats = ui.choiceInput(
      'Input format',
      DEFAULT_FORMATS.AXOLABS,
      this.inputFormats,
      (value: string) => this.eventBus.selectInputFormat(value)
    );

    const outputFormats = ui.choiceInput(
      'Output format',
      NUCLEOTIDES_FORMAT,
      getSupportedTargetFormats(this.th),
      (value: string) => this.eventBus.selectOutputFormat(value)
    );
    const convertBulkButton = this.createConvertBulkButton();

    const tableControlsContainer = ui.div([
      ...tableControls,
      inputFormats,
      outputFormats,
      convertBulkButton
    ], 'ui-form');

    const bulkTranslationControls = ui.block25([
      title,
      tableControlsContainer,
    ]);
    return bulkTranslationControls;
  }

  private createConvertBulkButton(): HTMLButtonElement {
    const convertBulkButton = ui.bigButton('Convert', () => this.processConvertBulkButtonClick());

    ui.tooltip.bind(convertBulkButton, 'Convert sequences from table input');
    $(convertBulkButton).css({
      'float': 'right',
      'margin-top': '20px',
    });

    return convertBulkButton;
  }

  private processConvertBulkButtonClick(): void {
    const selectedTable = this.eventBus.getSelectedTable();
    if (!selectedTable) {
      grok.shell.warning('No table selected');
      return;
    }

    const inputFormat = this.eventBus.getSelectedInputFormat();
    const outputFormat = this.eventBus.getSelectedOutputFormat();
    const sequenceColumn = this.eventBus.getSelectedColumn(REQUIRED_COLUMN_LABEL.SEQUENCE);
    if (!sequenceColumn) {
      grok.shell.warning('No sequence column selected');
      return;
    }

    const newColumnName = `${sequenceColumn.name} (${outputFormat})`;
    const translatedColumn = DG.Column.fromList(
      DG.TYPE.STRING,
      newColumnName,
      sequenceColumn.toList().map((sequence: string) => {
        const result = convert(sequence, inputFormat, outputFormat, this.th);
        return result;
      })
    );

    if (outputFormat === NUCLEOTIDES_FORMAT || outputFormat === DEFAULT_FORMATS.HELM) {
      translatedColumn.semType = DG.SEMTYPE.MACROMOLECULE;
      const units = outputFormat == NUCLEOTIDES_FORMAT ? NOTATION.FASTA : NOTATION.HELM;
      translatedColumn.setTag(DG.TAGS.UNITS, units);
      const seqHandler = SeqHandler.forColumn(translatedColumn as DG.Column<string>);
      const setUnits = outputFormat == NUCLEOTIDES_FORMAT ? SeqHandler.setUnitsToFastaColumn :
        SeqHandler.setUnitsToHelmColumn;
      setUnits(seqHandler);
    }

    // add newColumn to the table
    selectedTable.columns.add(translatedColumn);
    // update the view

    grok.data.detectSemanticTypes(selectedTable);
    grok.shell.v = grok.shell.getTableView(selectedTable.name);
  }

  private constructSingleSequenceControls(): HTMLDivElement {
    const sequenceColoredInput = new ColoredTextInput(this.sequenceInputBase,
      (s: string) => { return highlightInvalidSubsequence(s, this.th); });

    const downloadMolfileButton = ui.button(
      'Get SDF',
      () => { this.saveMolfile(); },
      'Save structure as SDF');

    const copySmilesButton = ui.button(
      'Copy SMILES',
      () => { this.copySmiles(); },
      'Copy SMILES for the sequence');

    const formatChoiceInput = ui.div([this.formatChoiceInput]);

    const clearButton = ui.button(
      ui.icons.delete(() => { sequenceColoredInput.inputBase.value = ''; }),
      () => {}
    );
    ui.tooltip.bind(clearButton, 'Clear input');

    const inputTableRow = {
      format: formatChoiceInput,
      textInput: sequenceColoredInput.root,
      clearBtn: clearButton
    };
    const singleSequenceInputControls = ui.table(
      [inputTableRow], (item) => [item.format, item.textInput, item.clearBtn]
    );
    singleSequenceInputControls.classList.add('st-translator-input-table');

    const singleSequenceOutputTable = ui.block([
      this.outputTableDiv,
      downloadMolfileButton,
      copySmilesButton,
    ]);

    const singleSequenceControls = ui.block75([
      ui.h1('Single sequence'),
      singleSequenceInputControls,
      singleSequenceOutputTable,
    ]);

    return singleSequenceControls;
  }

  private saveMolfile(): void {
    const result = (new SequenceToMolfileConverter(this.sequence, false,
      this.formatChoiceInput.value!)).convert() + '\n$$$$';
    download(this.sequence + '.sdf', encodeURIComponent(result));
  }

  private copySmiles(): void {
    const smiles = DG.chem.convert(this.molfile, DG.chem.Notation.MolBlock, DG.chem.Notation.Smiles);
    navigator.clipboard.writeText(smiles).then(
      () => grok.shell.info(SEQUENCE_COPIED_MSG)
    );
  }

  private updateTable(): void {
    this.outputTableDiv.innerHTML = '';
    // todo: does not detect correctly (U-A)(U-A)
    const indexOfInvalidChar = (!this.format) ? 0 :
      this.th.createSequenceValidator(this.sequence).getInvalidCodeIndex(this.format!);
    const translatedSequences = getTranslatedSequences(
      this.sequence, indexOfInvalidChar, this.format!, this.th);
    const tableRows = [];

    for (const key of Object.keys(translatedSequences)) {
      const sequence = ('indexOfFirstInvalidChar' in translatedSequences) ?
        ui.divH([]) :
        ui.link(
          translatedSequences[key],
          () => navigator.clipboard.writeText(translatedSequences[key])
            .then(() => grok.shell.info(SEQUENCE_COPIED_MSG)),
          SEQ_TOOLTIP_MSG, ''
        );
      tableRows.push({
        format: key,
        sequence: sequence,
      });
    }
    const outputTable = ui.table(tableRows, (item) => [item.format, item.sequence], ['FORMAT', 'SEQUENCE']);

    this.outputTableDiv.append(outputTable);
    this.outputTableDiv.classList.add('st-translator-output-table');
  }

  private async updateMolImg(): Promise<void> {
    const canvasWidth = 500;
    const canvasHeight = 170;
    const molImgObj = new MoleculeImage(this.molfile);
    await molImgObj.drawMolecule(this.moleculeImgDiv, canvasWidth, canvasHeight);
    // should the canvas be returned from the above function?
  }

  // todo: sort mehtods
  private init(): void {
    this.sequence = this.getFormattedSequence();

    this.format = this.th.createFormatDetector(this.sequence).getFormat();

    // warning: getMolfile relies on 'this.format', so the order is important
    this.molfile = this.getMolfile();
  }

  private getFormattedSequence(): string {
    return this.sequenceInputBase.value.replace(/\s/g, '');
  }

  private getMolfile(): string {
    if (!this.format)
      return '';
    if (this.format === DEFAULT_FORMATS.HELM) {
      const axolabs = this.th.createFormatConverter(this.sequence, this.format)
        .convertTo(DEFAULT_FORMATS.AXOLABS);
      return (new SequenceToMolfileConverter(axolabs, false, DEFAULT_FORMATS.AXOLABS).convert());
    }
    const molfile = (new SequenceToMolfileConverter(this.sequence, false, this.format)).convert();
    return molfile;
  }
}

// todo: port to dedicated file, together with event bus
class TableControlsManager {
  private tableInputManager: TableInputManager;
  private columnInputManager: ColumnInputsManager;

  constructor(eventBus: EventBus) {
    this.tableInputManager = new TableInputManager(eventBus);
    this.columnInputManager = new ColumnInputsManager(eventBus);
  }

  createUIComponents(): HTMLElement[] {
    const tableInput = this.tableInputManager.getTableInputContainer();
    const columnControls = this.columnInputManager.getColumnControlsContainer();

    return [
      tableInput,
      columnControls,
    ];
  }
}

class TableInputManager {
  private availableTables: DG.DataFrame[] = [];
  private tableInputContainer: HTMLDivElement = ui.div([]);

  constructor(private eventBus: EventBus) {
    this.subscribeToTableEvents();
    this.refreshTableInput();
  }

  getTableInputContainer(): HTMLDivElement {
    return this.tableInputContainer;
  }

  private subscribeToTableEvents(): void {
    grok.events.onTableAdded.subscribe((eventData) => this.handleTableAdded(eventData));
    grok.events.onTableRemoved.subscribe((eventData) => this.handleTableRemoved(eventData));
    this.eventBus.tableSelected$.subscribe(() => this.handleTableChoice());
  }

  private getTableFromEventData(eventData: DG.EventData<DG.DataFrameArgs>): DG.DataFrame {
    return eventData.args.dataFrame;
  }

  private handleTableAdded(eventData: DG.EventData<DG.DataFrameArgs>): void {
    const table = this.getTableFromEventData(eventData);

    if (this.availableTables.some((t: DG.DataFrame) => t.name === table.name))
      return;

    this.availableTables.push(table);
    this.eventBus.selectTable(table);
    this.refreshTableInput();
  }

  private handleTableRemoved(eventData: any): void {
    const removedTable = this.getTableFromEventData(eventData);
    this.availableTables = this.availableTables.filter((table: DG.DataFrame) => table.name !== removedTable.name);

    const table = this.availableTables[0];
    this.eventBus.selectTable(table ? table : null);
    this.refreshTableInput();
  }

  private refreshTableInput(): void {
    const tableInput = this.createTableInput();
    $(this.tableInputContainer).empty();
    this.tableInputContainer.append(tableInput.root);
  }

  private createTableInput(): DG.InputBase<DG.DataFrame | null> {
    const currentlySelectedTable = this.eventBus.getSelectedTable();

    const tableInput = ui.tableInput(
      'Table',
      currentlySelectedTable,
      this.availableTables,
      (table: DG.DataFrame) => {
        // WARNING: non-null check necessary to prevent resetting columns to
        // null upon handling onTableAdded
        if (table !== null && table instanceof DG.DataFrame)
          this.eventBus.selectTable(table);
      });
    return tableInput;
  }

  private handleTableChoice(): void {
    const selectedTable = this.eventBus.getSelectedTable();
    if (!selectedTable) return;
    if (!this.isTableDisplayed(selectedTable))
      this.displayTable(selectedTable);
  }

  private isTableDisplayed(table: DG.DataFrame): boolean {
    return grok.shell.tableNames.includes(table.name);
  }

  private displayTable(table: DG.DataFrame): void {
    const previousView = grok.shell.v;
    grok.shell.addTableView(table);
    grok.shell.v = previousView;
  }
}

class ColumnInputsManager {
  private columnControlsContainer: HTMLDivElement = ui.div([]);

  constructor(private eventBus: EventBus) {
    this.eventBus.tableSelected$.subscribe(() => this.handleTableChoice());
    this.refreshColumnControls();
  }

  getColumnControlsContainer(): HTMLDivElement {
    return this.columnControlsContainer;
  }

  private handleTableChoice(): void {
    this.refreshColumnControls();
  }

  private refreshColumnControls(): void {
    const columnInputs = this.createColumnInputs();
    $(this.columnControlsContainer).empty();
    const inputRoots = columnInputs.map((input) => input.root);
    this.columnControlsContainer.append(
      ...inputRoots
    );
  }

  private createColumnInputs(): DG.ChoiceInput<string | null>[] {
    const selectedTable = this.eventBus.getSelectedTable();
    const columnNames = selectedTable !== null ?
      selectedTable.columns.names().sort((a, b) => a.localeCompare(b)) : [];

    const columnInputs = REQUIRED_COLUMN_LABELS.map((columnLabel: REQUIRED_COLUMN_LABEL) => {
      const input = this.createColumnInput(columnLabel, columnNames, selectedTable);
      return input;
    });
    return columnInputs;
  }

  private createColumnInput(
    columnLabel: REQUIRED_COLUMN_LABEL,
    columnNames: string[],
    selectedTable: DG.DataFrame | null
  ): DG.ChoiceInput<string | null> {
    const namePattern = columnLabel.toLowerCase();
    const matchingColumnName = columnNames.find((name: string) => name.toLowerCase().includes(namePattern));
    const selectedColumnName = matchingColumnName ? matchingColumnName : columnNames[0];
    this.selectColumnIfTableNotNull(selectedTable, selectedColumnName, columnLabel);

    const input = ui.choiceInput(
      `${columnLabel}`,
      selectedColumnName, columnNames,
      (colName: string) => this.selectColumnIfTableNotNull(selectedTable, colName, columnLabel)
    );

    return input;
  }

  private selectColumnIfTableNotNull(
    table: DG.DataFrame | null, columnName: string, columnLabel: REQUIRED_COLUMN_LABEL
  ): void {
    if (table !== null) {
      const selectedColumn = table.getCol(columnName);
      this.eventBus.selectColumn(columnLabel, selectedColumn);
    }
  }
}

export class EventBus {
  private static _instance: EventBus;

  private _tableSelection$ = new BehaviorSubject<DG.DataFrame | null>(null);
  private _columnSelection = Object.fromEntries(REQUIRED_COLUMN_LABELS.map((columnLabel: string) => {
    const columnSelection$ = new BehaviorSubject<DG.Column<string> | null>(null);
    return [columnLabel, columnSelection$];
  }));
  private _inputFormatSelection$ = new BehaviorSubject<string>(DEFAULT_FORMATS.AXOLABS);
  private _outputFormatSelection$ = new BehaviorSubject<string>(NUCLEOTIDES_FORMAT);

  private constructor() {}

  public static getInstance(): EventBus {
    if (EventBus._instance === undefined)
      EventBus._instance = new EventBus();
    return EventBus._instance;
  }

  get tableSelected$(): Observable<DG.DataFrame | null> {
    return this._tableSelection$.asObservable();
  }

  getSelectedTable(): DG.DataFrame | null {
    return this._tableSelection$.getValue();
  }

  selectTable(table: DG.DataFrame | null): void {
    this._tableSelection$.next(table);
  }

  selectColumn(columnLabel: REQUIRED_COLUMN_LABEL, column: DG.Column<string>): void {
    this._columnSelection[columnLabel].next(column);
  }

  getSelectedColumn(columnLabel: REQUIRED_COLUMN_LABEL): DG.Column<string> | null {
    return this._columnSelection[columnLabel].getValue();
  }

  getSelectedInputFormat(): string {
    return this._inputFormatSelection$.getValue();
  }

  selectInputFormat(format: string): void {
    this._inputFormatSelection$.next(format);
  }

  selectOutputFormat(format: string): void {
    this._outputFormatSelection$.next(format);
  }

  getSelectedOutputFormat(): string {
    return this._outputFormatSelection$.getValue();
  }
}

export class OligoTranslatorUI extends IsolatedAppUIBase {
  private readonly topPanel: HTMLElement[];
  private readonly layout: TranslatorAppLayout;

  constructor(
    private readonly th: ITranslationHelper
  ) {
    super(APP_NAME.TRANSLATOR);

    this.th = _package;
    this.layout = new TranslatorAppLayout(this.th);
    const viewMonomerLibIcon = ui.iconFA('book', MonomerLibViewer.view, 'View monomer library');
    this.topPanel = [
      viewMonomerLibIcon,
    ];
    this.view.setRibbonPanels([this.topPanel]);
  }

  protected getContent(): Promise<HTMLDivElement> {
    return this.layout.getHtmlElement();
  };
}

