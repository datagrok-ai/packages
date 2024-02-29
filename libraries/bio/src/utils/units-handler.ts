import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {
  TAGS, ALIGNMENT, ALPHABET, NOTATION, candidateAlphabets, positionSeparator,
  splitterAsFasta, getSplitterWithSeparator, splitterAsHelm,
} from './macromolecule';
import {
  GAP_SYMBOL,
  GapSeqMonomer, ISeqMonomer, ISeqSplitted, MonomerFunc, SeqColStats, SplitterFunc,
} from './macromolecule/types';
import {detectAlphabet, SeqMonomer, splitterAsFastaSimple} from './macromolecule/utils';
import {
  mmDistanceFunctions, MmDistanceFunctionsNames
} from '@datagrok-libraries/ml/src/macromolecule-distance-functions';
import {mmDistanceFunctionType} from '@datagrok-libraries/ml/src/macromolecule-distance-functions/types';
import {getMonomerLibHelper, IMonomerLibHelper} from '../monomer-works/monomer-utils';
import {HELM_POLYMER_TYPE, HELM_WRAPPERS_REGEXP, PHOSPHATE_SYMBOL} from './const';

export const Temps = new class {
  /** Column's temp slot name for a UnitsHandler object */
  uh = `units-handler.${DG.SEMTYPE.MACROMOLECULE}`;
}();

export const GapSymbols: {
  [units: string]: ISeqMonomer
} = {
  [NOTATION.FASTA]: new GapSeqMonomer('-'), // '-',
  [NOTATION.SEPARATOR]: new GapSeqMonomer(''), //'',
  [NOTATION.HELM]: new GapSeqMonomer('*'), // '*',
};

export type ConvertFunc = (src: string) => string;
export type JoinerFunc = (src: ISeqSplitted) => string;

/** Class for handling notation units in Macromolecule columns and
 * conversion of notation systems in Macromolecule columns
 */
export class UnitsHandler {
  protected readonly _column: DG.Column; // the column to be converted
  protected readonly _units: string; // units, of the form fasta, separator
  protected readonly _notation: NOTATION; // current notation (without :SEQ:NT, etc.)
  protected readonly _defaultGapSymbol: ISeqMonomer;

  private _splitter: SplitterFunc | null = null;

  public static setUnitsToFastaColumn(uh: UnitsHandler) {
    if (uh.column.semType !== DG.SEMTYPE.MACROMOLECULE || uh.column.getTag(DG.TAGS.UNITS) !== NOTATION.FASTA)
      throw new Error(`The column of notation '${NOTATION.FASTA}' must be '${DG.SEMTYPE.MACROMOLECULE}'.`);

    uh.column.setTag(DG.TAGS.UNITS, NOTATION.FASTA);
    UnitsHandler.setTags(uh);
  }

  public static setUnitsToSeparatorColumn(uh: UnitsHandler, separator?: string) {
    if (uh.column.semType !== DG.SEMTYPE.MACROMOLECULE || uh.column.getTag(DG.TAGS.UNITS) !== NOTATION.SEPARATOR)
      throw new Error(`The column of notation '${NOTATION.SEPARATOR}' must be '${DG.SEMTYPE.MACROMOLECULE}'.`);
    if (!separator)
      throw new Error(`The column of notation '${NOTATION.SEPARATOR}' must have the separator tag.`);

    uh.column.setTag(DG.TAGS.UNITS, NOTATION.SEPARATOR);
    uh.column.setTag(TAGS.separator, separator);
    UnitsHandler.setTags(uh);
  }

  public static setUnitsToHelmColumn(uh: UnitsHandler) {
    if (uh.column.semType !== DG.SEMTYPE.MACROMOLECULE)
      throw new Error(`The column of notation '${NOTATION.HELM}' must be '${DG.SEMTYPE.MACROMOLECULE}'`);

    uh.column.setTag(DG.TAGS.UNITS, NOTATION.HELM);
    UnitsHandler.setTags(uh);
  }

  /** From detectMacromolecule */
  public static setTags(uh: UnitsHandler): void {
    const units = uh.column.getTag(DG.TAGS.UNITS) as NOTATION;
    const stats: SeqColStats = uh.stats;
    const alphabetIsMultichar = Object.keys(stats.freq).some((m) => m.length > 1);

    if ([NOTATION.FASTA, NOTATION.SEPARATOR].includes(units)) {
      // Empty monomer alphabet is allowed, only if alphabet tag is annotated
      if (!uh.column.getTag(TAGS.alphabet) && Object.keys(stats.freq).length === 0)
        throw new Error('Alphabet is empty and not annotated.');

      let aligned = uh.column.getTag(TAGS.aligned);
      if (aligned === null) {
        aligned = stats.sameLength ? ALIGNMENT.SEQ_MSA : ALIGNMENT.SEQ;
        uh.column.setTag(TAGS.aligned, aligned);
      }

      let alphabet = uh.column.getTag(TAGS.alphabet);
      if (alphabet === null) {
        alphabet = detectAlphabet(stats.freq, candidateAlphabets);
        uh.column.setTag(TAGS.alphabet, alphabet);
      }
      if (alphabet === ALPHABET.UN) {
        const alphabetSize = Object.keys(stats.freq).length;
        const alphabetIsMultichar = Object.keys(stats.freq).some((m) => m.length > 1);
        uh.column.setTag(TAGS.alphabetSize, alphabetSize.toString());
        uh.column.setTag(TAGS.alphabetIsMultichar, alphabetIsMultichar ? 'true' : 'false');
      }
    }
  }

  protected get column(): DG.Column { return this._column; }

  public get units(): string { return this._units; }

  public get notation(): NOTATION { return this._notation; }

  public get defaultGapSymbol(): ISeqMonomer { return this._defaultGapSymbol; }

  public get separator(): string | undefined {
    const separator: string | undefined = this.column.getTag(TAGS.separator) ?? undefined;
    if (this.notation === NOTATION.SEPARATOR && separator === undefined)
      throw new Error(`Separator is mandatory  for column '${this.column.name}' of notation '${this.notation}'.`);
    return separator;
  }

  public get aligned(): string {
    const aligned = this.column.getTag(TAGS.aligned);

    // TAGS.aligned is mandatory for columns of NOTATION.FASTA and NOTATION.SEPARATOR
    if (!aligned && (this.isFasta() || this.isSeparator()))
      throw new Error('Tag aligned not set');

    return aligned;
  }

  /** Alphabet name (upper case) */
  public get alphabet(): string {
    const alphabet = this.column.getTag(TAGS.alphabet);

    // TAGS.alphabet is mandatory for columns of NOTATION.FASTA and NOTATION.SEPARATOR
    if (!alphabet && (this.isFasta() || this.isSeparator()))
      throw new Error('Tag alphabet not set');

    return alphabet;
  }

  protected get helmCompatible(): string | undefined {
    return this.column.getTag(TAGS.isHelmCompatible);
  }

  public getAlphabetSize(): number {
    if (this.notation == NOTATION.HELM || this.alphabet == ALPHABET.UN) {
      const alphabetSizeStr = this.column.getTag(TAGS.alphabetSize);
      let alphabetSize: number;
      if (alphabetSizeStr)
        alphabetSize = parseInt(alphabetSizeStr);
      else {
        // calculate alphabetSize on demand
        const stats = this.stats;
        alphabetSize = Object.keys(stats.freq).length;
      }
      return alphabetSize;
    } else {
      switch (this.alphabet) {
      case ALPHABET.PT:
        return 20;
      case ALPHABET.DNA:
      case ALPHABET.RNA:
        return 4;
      case 'NT':
        console.warn(`Unexpected alphabet 'NT'.`);
        return 4;
      default:
        throw new Error(`Unexpected alphabet '${this.alphabet}'.`);
      }
    }
  }

  public getAlphabetIsMultichar(): boolean {
    if (this.notation === NOTATION.HELM)
      return true;
    else if (this.alphabet !== ALPHABET.UN)
      return false;
    else
      return this.column.getTag(TAGS.alphabetIsMultichar) === 'true';
  }

  private _splitted: ISeqSplitted[] | null = null;
  /** */
  public get splitted(): ISeqSplitted[] {
    if (this._splitted === null) {
      let getMonomer: MonomerFunc;
      switch (this.notation) {
      case NOTATION.HELM: {
        getMonomer = (m: string, j: number): ISeqMonomer => {
          if (m === GapSymbols[this.notation].original)
            return new GapSeqMonomer(m);
          else {
            const cm: string = m.replace(HELM_WRAPPERS_REGEXP, '$1');
            return new SeqMonomer(m, cm);
          }
        };
        break;
      }
      default:
        getMonomer = (m: string, j: number): ISeqMonomer => {
          if (m === GapSymbols[this.notation].original)
            return new GapSeqMonomer(m);
          else
            return new SeqMonomer(m);
        };
      }

      const splitter = this.splitter;
      const colLength: number = this._column.length;
      this._splitted = new Array(colLength);
      const catIdxList = this._column.getRawData();
      const catList: string[] = this._column.categories;
      for (let rowIdx: number = 0; rowIdx < colLength; rowIdx++) {
        const seq: string = catList[catIdxList[rowIdx]];
        this._splitted[rowIdx] = splitter(seq, getMonomer);
      }
    }
    return this._splitted;
  }

  private _stats: SeqColStats | null = null;

  public get stats(): SeqColStats {
    if (this._stats === null) {
      const freq: { [m: string]: number } = {};
      let sameLength = true;
      let firstLength = null;

      for (const mSeq of this.splitted) {
        if (firstLength == null)
          firstLength = mSeq.length;
        else if (mSeq.length !== firstLength)
          sameLength = false;

        for (const m of mSeq) {
          const cm = m.canonical;
          if (!(cm in freq))
            freq[cm] = 0;
          freq[cm] += 1;
        }
      }
      this._stats = {freq: freq, sameLength: sameLength};
    }
    return this._stats;
  }

  private _maxLength: number | null = null;
  public get maxLength(): number {
    if (this._maxLength === null) {
      this._maxLength = this.splitted.length === 0 ? 0 :
        Math.max(...this.splitted.map((seqS) => seqS.length));
    }
    return this._maxLength!;
  }

  private _posList: string[] | null = null;
  public get posList(): string[] {
    if (this._posList === null) {
      const posListTxt = this.column.getTag(TAGS.positionNames);
      this._posList = posListTxt ? posListTxt.split(positionSeparator).map((p) => p.trim()) :
        wu.count(1).take(this.maxLength).map((pos) => pos.toString()).toArray();
    }
    return this._posList!;
  }

  public isFasta(): boolean { return this.notation === NOTATION.FASTA; }

  public isSeparator(): boolean { return this.notation === NOTATION.SEPARATOR; }

  public isHelm(): boolean { return this.notation === NOTATION.HELM; }

  public isRna(): boolean { return this.alphabet === ALPHABET.RNA; }

  public isDna(): boolean { return this.alphabet === ALPHABET.DNA; }

  public isPeptide(): boolean { return this.alphabet === ALPHABET.PT; }

  public isMsa(): boolean { return this.aligned ? this.aligned.toUpperCase().includes('MSA') : false; }

  public isHelmCompatible(): boolean { return this.helmCompatible === 'true'; }

  public isGap(m: ISeqMonomer): boolean {
    return !m || m.original === GapSymbols[this.notation].original;
  }

  /** Associate notation types with the corresponding units */
  /**
   * @return {NOTATION}     Notation associated with the units type
   */
  protected getNotation(): NOTATION {
    if (this.units.toLowerCase().startsWith(NOTATION.FASTA))
      return NOTATION.FASTA;
    else if (this.units.toLowerCase().startsWith(NOTATION.SEPARATOR))
      return NOTATION.SEPARATOR;
    else if (this.units.toLowerCase().startsWith(NOTATION.HELM))
      return NOTATION.HELM;
    else
      throw new Error(`Column '${this.column.name}' has unexpected notation '${this.units}'.`);
  }


  /**
   * Get the wrapper strings for HELM, depending on the type of the
   * macromolecule (peptide, DNA, RNA)
   *
   * @return {string[]} Array of wrappers
   */
  public getHelmWrappers(): string[] {
    const prefix = (this.isDna()) ? 'RNA1{' :
      (this.isRna() || this.isHelmCompatible()) ? 'RNA1{' : 'PEPTIDE1{';

    const postfix = '}$$$$';
    const leftWrapper = (this.isDna()) ? 'd(' :
      (this.isRna()) ? 'r(' : '';
    const rightWrapper = (this.isDna() || this.isRna()) ? ')p' : '';
    return [prefix, leftWrapper, rightWrapper, postfix];
  }

  /**
   * Create a new empty column of the specified notation type and the same
   * length as column
   *
   * @param {NOTATION} tgtNotation
   * @return {DG.Column}
   */
  protected getNewColumn(tgtNotation: NOTATION, tgtSeparator?: string, colName?: string, data?: string[]): DG.Column<string> {
    const col = this.column;
    const name = tgtNotation.toLowerCase() + '(' + col.name + ')';
    const newColName = colName ?? col.dataFrame.columns.getUnusedName(name);
    const newColumn = DG.Column.fromList('string', newColName, data ?? new Array(this.column.length).fill(''));
    newColumn.semType = DG.SEMTYPE.MACROMOLECULE;
    newColumn.setTag(DG.TAGS.UNITS, tgtNotation);
    if (tgtNotation === NOTATION.SEPARATOR) {
      if (!tgtSeparator) throw new Error(`Notation \'${NOTATION.SEPARATOR}\' requires separator value.`);
      newColumn.setTag(TAGS.separator, tgtSeparator);
    }
    newColumn.setTag(DG.TAGS.CELL_RENDERER, 'sequence'); // cell.renderer

    const srcAligned = col.getTag(TAGS.aligned);
    if (srcAligned)
      newColumn.setTag(TAGS.aligned, srcAligned);

    let srcAlphabet = col.getTag(TAGS.alphabet);
    if (!srcAlphabet && this.notation === NOTATION.HELM && tgtNotation !== NOTATION.HELM)
      srcAlphabet = ALPHABET.UN;
    if (srcAlphabet != null)
      newColumn.setTag(TAGS.alphabet, srcAlphabet);

    let srcAlphabetSize: string = col.getTag(TAGS.alphabetSize);
    if (srcAlphabet != null && srcAlphabetSize)
      newColumn.setTag(TAGS.alphabetSize, srcAlphabetSize);

    const srcAlphabetIsMultichar: string = col.getTag(TAGS.alphabetIsMultichar);
    if (srcAlphabet != null && srcAlphabetIsMultichar !== undefined)
      newColumn.setTag(TAGS.alphabetIsMultichar, srcAlphabetIsMultichar);

    if (tgtNotation == NOTATION.HELM) {
      srcAlphabetSize = this.getAlphabetSize().toString();
      newColumn.setTag(TAGS.alphabetSize, srcAlphabetSize);
    }

    return newColumn;
  }

  /** Creates a new column on data of {@link seqList} with the same tags */
  public getNewColumnFromList(name: string, seqList: string[]): DG.Column<string> {
    return this.getNewColumn(this.notation, this.separator, name, seqList);
  }

  /**
   * Create a new empty column using templateCol as a template
   *
   * @param {DG.Column} templateCol  the properties and units of this column are used as a
   * template to build the new one
   * @return {DG.Column}
   */
  public static getNewColumn(templateCol: DG.Column): DG.Column {
    const col: UnitsHandler = UnitsHandler.getOrCreate(templateCol);
    const targetNotation = col.notation;
    return col.getNewColumn(targetNotation);
  }

  /**
   * A helper function checking the validity of the 'units' string
   *
   * @param {string} units  the string to be validated
   * @return {boolean}
   */
  public static unitsStringIsValid(units: string): boolean {
    units = units.toLowerCase();
    const prefixes = [NOTATION.FASTA, NOTATION.SEPARATOR, NOTATION.HELM];
    const postfixes = ['rna', 'dna', 'pt'];

    const prefixCriterion = prefixes.some((p) => units.startsWith(p.toLowerCase()));
    return prefixCriterion;
  }

  /**
   * Construct a new column of semantic type MACROMOLECULE from the list of
   * specified parameters
   *
   * @param {number}    len  the length of the new column
   * @param {string}    name  the name of the new column
   * @param {string}    units  the units of the new column
   * @return {DG.Column}
   */
  public static getNewColumnFromParams(
    len: number,
    name: string,
    units: string
  ): DG.Column {
    // WARNING: in this implementation is is impossible to verify the uniqueness
    // of the new column's name
    // TODO: verify the validity of units parameter
    if (!UnitsHandler.unitsStringIsValid(units))
      throw new Error('Invalid format of \'units\' parameter');
    const newColumn = DG.Column.fromList('string', name, new Array(len).fill(''));
    newColumn.semType = DG.SEMTYPE.MACROMOLECULE;
    newColumn.setTag(DG.TAGS.UNITS, units);
    return newColumn;
  }

  /** Gets function to split seq value to monomers */
  protected getSplitter(limit?: number): SplitterFunc {
    if (this.units.toLowerCase().startsWith(NOTATION.FASTA)) {
      const alphabet: string | null = this.column.getTag(TAGS.alphabet);
      if (alphabet !== null && !this.getAlphabetIsMultichar())
        return splitterAsFastaSimple;
      else
        return splitterAsFasta;
    } else if (this.units.toLowerCase().startsWith(NOTATION.SEPARATOR))
      return getSplitterWithSeparator(this.separator!, limit);
    else if (this.units.toLowerCase().startsWith(NOTATION.HELM))
      return splitterAsHelm;
    else
      throw new Error(`Unexpected units ${this.units} .`);

    // TODO: Splitter for HELM
  }

  public getDistanceFunctionName(): MmDistanceFunctionsNames {
    // TODO add support for helm and separator notation
    if (!this.isFasta())
      throw new Error('Only FASTA notation is supported');
    if (this.isMsa())
      return MmDistanceFunctionsNames.HAMMING;
    switch (this.alphabet) {
      // As DNA and RNA scoring matrices are same as identity matrices(mostly),
      // we can use very fast and optimized Levenshtein distance library
    case ALPHABET.DNA:
    case ALPHABET.RNA:
      return MmDistanceFunctionsNames.LEVENSHTEIN;
    case ALPHABET.PT:
      return MmDistanceFunctionsNames.LEVENSHTEIN;
      // For default case, let's use Levenshtein distance
    default:
      return MmDistanceFunctionsNames.LEVENSHTEIN;
    }
  }

  public getDistanceFunction(): mmDistanceFunctionType {
    return mmDistanceFunctions[this.getDistanceFunctionName()]();
  }

  // checks if the separator notation is compatible with helm library
  public async checkHelmCompatibility(): Promise<boolean> {
    // check first for the column tag to avoid extra processing
    if (this.column.tags.has(TAGS.isHelmCompatible))
      return this.column.getTag(TAGS.isHelmCompatible) === 'true';

    // get the monomer lib and check against the column
    const monomerLibHelper: IMonomerLibHelper = await getMonomerLibHelper();
    const bioLib = monomerLibHelper.getBioLib();
    // retrieve peptides
    const peptides = bioLib.getMonomerSymbolsByType(HELM_POLYMER_TYPE.PEPTIDE.toString());
    // convert the peptides list to a set for faster lookup
    const peptidesSet = new Set(peptides);
    // get splitter for given separator and check if all monomers are in the lib
    const splitterFunc = getSplitterWithSeparator(this.separator!);
    // iterate over the columns, split them and check if all monomers are in the lib
    //TODO maybe add missing threshold so that if there are not too many missing monomers
    // the column is still considered helm compatible
    const catIdxSet: Set<number> = new Set();
    const rowCount = this.column.length;
    const colRawData = this.column.getRawData();
    for (let rowIdx = 0; rowIdx < rowCount; ++rowIdx) {
      const catI = colRawData[rowIdx];
      if (!(catI in catIdxSet)) {
        catIdxSet.add(catI);
        const monomers = this.splitted[rowIdx];
        for (const m of monomers) {
          if (!peptidesSet.has(m.canonical)) {
            this.column.setTag(TAGS.isHelmCompatible, 'false');
            return false;
          }
        }
      }
    }
    this.column.setTag(TAGS.isHelmCompatible, 'true');
    return true;
  }

  // -- Notation Converter --

  protected get splitter(): SplitterFunc {
    if (this._splitter === null)
      this._splitter = this.getSplitter();
    return this._splitter;
  }

  public toFasta(targetNotation: NOTATION): boolean { return targetNotation === NOTATION.FASTA; }

  public toSeparator(targetNotation: NOTATION): boolean { return targetNotation === NOTATION.SEPARATOR; }

  public toHelm(targetNotation: NOTATION): boolean { return targetNotation === NOTATION.HELM; }

  /**
   *  Convert HELM string to FASTA/SEPARATOR
   *
   * @param {string} srcSeq    A string to be converted
   * @param {string} tgtNotation    Target notation: FASTA or SEPARATOR
   * @param {string} tgtSeparator   Optional target separator (for HELM ->
   * @param {string | null} tgtGapSymbol   Optional target gap symbol
   * SEPARATOR)
   * @return {string} Converted string
   */
  public convertHelmToFastaSeparator(
    srcSeq: string, tgtNotation: string, tgtSeparator?: string, tgtGapSymbol?: ISeqMonomer
  ): string {
    if (!tgtGapSymbol) {
      tgtGapSymbol = (this.toFasta(tgtNotation as NOTATION)) ?
        GapSymbols[NOTATION.FASTA] :
        GapSymbols[NOTATION.SEPARATOR];
    }

    if (!tgtSeparator)
      tgtSeparator = (this.toFasta(tgtNotation as NOTATION)) ? '' : this.separator;

    const isNucleotide = srcSeq.startsWith('RNA');
    // items can be monomers or helms
    const helmItemsArray = this.splitter(srcSeq, (m, j) => new SeqMonomer(m));
    const tgtMonomersArray: string[] = [];
    for (let i = 0; i < helmItemsArray.length; i++) {
      let item: string = helmItemsArray[i].original;
      if (isNucleotide)
        item = item.replace(HELM_WRAPPERS_REGEXP, '');
      if (item === GapSymbols[NOTATION.HELM].original)
        tgtMonomersArray.push(tgtGapSymbol!.original);
      else if (this.toFasta(tgtNotation as NOTATION) && item.length > 1) {
        // the case of a multi-character monomer converted to FASTA
        const monomer = '[' + item + ']';
        tgtMonomersArray.push(monomer);
      } else
        tgtMonomersArray.push(item);
    }
    return tgtMonomersArray.join(tgtSeparator);
  }

  /** Dispatcher method for notation conversion
   *
   * @param {NOTATION} tgtNotation   Notation we want to convert to
   * @param {string | null} tgtSeparator   Possible separator
   * @return {DG.Column}                Converted column
   */
  public convert(tgtNotation: NOTATION, tgtSeparator?: string): DG.Column<string> {
    // Get joiner from the source column units handler (this) knowing about the source sequence.
    // For example, converting DNA Helm to fasta requires removing the r(X)p decoration.
    const joiner: JoinerFunc = this.getJoiner({notation: tgtNotation, separator: tgtSeparator});
    const newColumn = this.getNewColumn(tgtNotation, tgtSeparator);
    // assign the values to the newly created empty column
    newColumn.init((rowIdx: number) => {
      const srcSS = this.splitted[rowIdx];
      return joiner(srcSS);
    });
    return newColumn;
  }

  /**
   * @param name
   * @param startIdx Start position index of the region (0-based)
   * @param endIdx   End position index of the region (0-based, inclusive)
   */
  public getRegion(startIdx: number | null, endIdx: number | null, name: string): DG.Column<string> {
    const regCol: DG.Column<string> = this.getNewColumn(this.notation, this.separator);
    regCol.name = name;
    const maxLength: number = Math.max(...this.splitted.map((seqS) => seqS.length));

    const startIdxVal: number = startIdx ?? 0;
    const endIdxVal: number = endIdx ?? this.maxLength - 1;

    const join = this.getJoiner();

    const regLength = endIdxVal - startIdxVal + 1;
    regCol.init((rowI) => {
      const seqS = this.splitted[rowI];
      // Custom slicing instead of array method to maintain gaps
      const regMList: ISeqSplitted = new Array<ISeqMonomer>(regLength);
      for (let regJPos: number = 0; regJPos < regLength; ++regJPos) {
        const seqJPos = startIdxVal + regJPos;
        regMList[regJPos] = seqJPos < seqS.length ? seqS[seqJPos] : GapSymbols[this.notation] as ISeqMonomer;
      }
      return join(regMList);
    });

    const getRegionOfPositionNames = (str: string): string => {
      const srcPosList = str.split(',').map((p) => p.trim());
      const regPosList = new Array<string>(regLength);
      for (let regJPos: number = 0; regJPos < regLength; ++regJPos) {
        const srcJPos = startIdxVal + regJPos;
        regPosList[regJPos] = srcJPos < srcPosList.length ? srcPosList[srcJPos] : '?';
      }
      return regPosList.join(positionSeparator);
    };

    const srcPositionNamesStr = this.column.getTag(TAGS.positionNames);
    if (srcPositionNamesStr) regCol.setTag(TAGS.positionNames, getRegionOfPositionNames(srcPositionNamesStr));

    const srcPositionLabelsStr = this.column.getTag(TAGS.positionLabels);
    if (srcPositionLabelsStr) regCol.setTag(TAGS.positionLabels, getRegionOfPositionNames(srcPositionLabelsStr));

    return regCol;
  }

  private _joiner?: JoinerFunc = undefined;

  public get joiner(): JoinerFunc {
    if (!this._joiner) {
      this._joiner = this.getJoiner();
    }
    return this._joiner;
  }

  public getJoiner(opts?: { notation: NOTATION, separator?: string }): JoinerFunc {
    const notation = opts ? opts.notation : this.notation;
    const separator = opts ? opts.separator : this.separator;

    let res: JoinerFunc;
    const srcUh = this;
    switch (notation) {
    case  NOTATION.FASTA: {
      res = function(srcSS: ISeqSplitted): string { return joinToFasta(srcSS, srcUh.isHelm()); };
      break;
    }
    case NOTATION.SEPARATOR: {
      if (!separator) throw new Error(`Separator is mandatory for notation '${notation}'.`);
      res = function(srcSS: ISeqSplitted): string { return joinToSeparator(srcSS, separator, srcUh.isHelm()); };
      break;
    }
    case NOTATION.HELM: {
      const isDnaOrRna = srcUh.alphabet === ALPHABET.DNA || srcUh.alphabet === ALPHABET.RNA;
      const wrappers = srcUh.getHelmWrappers();
      res = function(srcSS: ISeqSplitted): string { return joinToHelm(srcSS, wrappers, isDnaOrRna); };
      break;
    }
    default:
      throw new Error(`Unexpected notation '${notation}'.`);
    }

    return res;
  }

  public getConverter(tgtUnits: NOTATION, tgtSeparator: string | undefined = undefined): ConvertFunc {
    if (tgtUnits === NOTATION.SEPARATOR && !tgtSeparator)
      throw new Error(`Target separator is not specified for target units '${NOTATION.SEPARATOR}'.`);

    const srcUh = this;
    if (tgtUnits === NOTATION.FASTA)
      return function(srcSeq: string) { return convertToFasta(srcUh, srcSeq); };
    if (tgtUnits === NOTATION.HELM)
      return function(srcSeq: string) { return convertToHelm(srcUh, srcSeq); };
    else if (tgtUnits === NOTATION.SEPARATOR)
      return function(srcSeq: string) { return convertToSeparator(srcUh, srcSeq, tgtSeparator!); };
    else
      throw new Error();
  }

  protected constructor(col: DG.Column<string>) {
    if (col.type !== DG.TYPE.STRING)
      throw new Error(`Unexpected column type '${col.type}', must be '${DG.TYPE.STRING}'.`);
    this._column = col;
    const units = this._column.getTag(DG.TAGS.UNITS);
    if (units !== null && units !== undefined)
      this._units = units;
    else
      throw new Error('Units are not specified in column');
    this._notation = this.getNotation();
    this._defaultGapSymbol = (this.isFasta()) ? GapSymbols[NOTATION.FASTA] :
      (this.isHelm()) ? GapSymbols[NOTATION.HELM] :
        GapSymbols[NOTATION.SEPARATOR];

    if (!this.column.tags.has(TAGS.aligned) || !this.column.tags.has(TAGS.alphabet) ||
      (!this.column.tags.has(TAGS.alphabetIsMultichar) && !this.isHelm() && this.alphabet === ALPHABET.UN)
    ) {
      // The following detectors and setters are to be called because the column is likely
      // as the UnitsHandler constructor was called on the column.
      if (this.isFasta())
        UnitsHandler.setUnitsToFastaColumn(this);
      else if (this.isSeparator()) {
        const separator = col.getTag(TAGS.separator);
        UnitsHandler.setUnitsToSeparatorColumn(this, separator);
      } else if (this.isHelm())
        UnitsHandler.setUnitsToHelmColumn(this);
      else
        throw new Error(`Unexpected units '${this.column.getTag(DG.TAGS.UNITS)}'.`);
    }

    // if (!this.column.tags.has(TAGS.alphabetSize)) {
    //   if (this.isHelm())
    //     throw new Error(`For column '${this.column.name}' of notation '${this.notation}' ` +
    //       `tag '${TAGS.alphabetSize}' is mandatory.`);
    //   else if (['UN'].includes(this.alphabet))
    //     throw new Error(`For column '${this.column.name}' of alphabet '${this.alphabet}' ` +
    //       `tag '${TAGS.alphabetSize}' is mandatory.`);
    // }

    if (!this.column.tags.has(TAGS.alphabetIsMultichar)) {
      if (this.isHelm())
        this.column.setTag(TAGS.alphabetIsMultichar, 'true');
      else if (['UN'].includes(this.alphabet)) {
        throw new Error(`For column '${this.column.name}' of alphabet '${this.alphabet}' ` +
          `tag '${TAGS.alphabetIsMultichar}' is mandatory.`);
      }
    }
  }

  /** Gets a column's UnitsHandler object from temp slot or creates a new and stores it to the temp slot. */
  public static getOrCreate(col: DG.Column<string>): UnitsHandler {
    let res = col.temp[Temps.uh];
    if (!res) res = col.temp[Temps.uh] = new UnitsHandler(col);
    return res;
  }
}

function joinToFasta(seqS: ISeqSplitted, isHelm: boolean): string {
  const resMList: string[] = new Array<string>(seqS.length);
  for (const [srcM, mI] of wu.enumerate(seqS)) {
    let m: string = srcM.original;
    if (isHelm)
      m = srcM.original.replace(HELM_WRAPPERS_REGEXP, '$1');

    if (srcM.canonical === GAP_SYMBOL)
      m = GapSymbols[NOTATION.FASTA].original;
    else if (srcM.canonical === PHOSPHATE_SYMBOL)
      m = '';
    else if (m.length > 1)
      m = '[' + srcM.original + ']';

    resMList[mI] = m;
  }
  return resMList.join('');
}

function convertToFasta(srcUh: UnitsHandler, src: string): string {
  // @ts-ignore
  const srcUhSplitter: SplitterFunc = srcUh.splitter;
  const srcSS: ISeqSplitted = srcUh.isHelm() ? splitterAsHelmNucl(srcUh, src) : srcUhSplitter(src, (m, jPos) => new SeqMonomer(m));
  return joinToFasta(srcSS, srcUh.isHelm());
}

function joinToSeparator(seqS: ISeqSplitted, tgtSeparator: string, isHelm: boolean): string {
  const resMList: string[] = new Array<string>(seqS.length);
  for (const [srcM, mI] of wu.enumerate(seqS)) {
    let m: string = srcM.original;
    if (isHelm)
      m = srcM.original.replace(HELM_WRAPPERS_REGEXP, '$1');

    if (srcM.canonical === GAP_SYMBOL)
      m = GapSymbols[NOTATION.SEPARATOR].original;
    else if (srcM.canonical === PHOSPHATE_SYMBOL)
      m = '';
    resMList[mI] = m;
  }
  return resMList.join(tgtSeparator);
}

function convertToSeparator(srcUh: UnitsHandler, src: string, tgtSeparator: string): string {
  // @ts-ignore
  const srcUhSplitter = srcUh.splitter;

  const srcSS: ISeqSplitted = srcUh.isHelm() ? splitterAsHelmNucl(srcUh, src) : srcUhSplitter(src, (m, j) => new SeqMonomer(m));
  return joinToSeparator(srcSS, tgtSeparator, srcUh.isHelm());
}

function joinToHelm(srcSS: ISeqSplitted, wrappers: string[], isDnaOrRna: boolean): string {
  const [prefix, leftWrapper, rightWrapper, postfix] = wrappers;
  const resMList: string[] = wu(srcSS).map((srcM: ISeqMonomer) => {
    let m: string = srcM.original;
    if (srcM.canonical === GAP_SYMBOL)
      m = GapSymbols[NOTATION.HELM].original;
    else {
      if (isDnaOrRna)
        m = m.replace(HELM_WRAPPERS_REGEXP, '$1');
      m = m.length === 1 ? `${leftWrapper}${m}${rightWrapper}` : `${leftWrapper}[${m}]${rightWrapper}`;
    }
    return m;
  }).toArray();
  return `${prefix}${resMList.join('.')}${postfix}`;
}

function convertToHelm(srcUh: UnitsHandler, src: string): string {
  // @ts-ignore
  const srcUhSplitter = srcUh.splitter;
  const wrappers = srcUh.getHelmWrappers();

  const isDnaOrRna = src.startsWith('DNA') || src.startsWith('RNA');
  const srcSS = srcUhSplitter(src, (m, j) => new SeqMonomer(m));
  return joinToHelm(srcSS, wrappers, isDnaOrRna);
}

/** Splits Helm sequence adjusting nucleotides to single char symbols. (!) Removes lone phosphorus. */
function splitterAsHelmNucl(srcUh: UnitsHandler, src: string): ISeqSplitted {
  // @ts-ignore
  const srcUhSplitter = srcUh.splitter;

  const srcMList: ISeqSplitted = srcUhSplitter(src, (m, j) => new SeqMonomer(m));
  const tgtMList: (ISeqMonomer | null)[] = new Array<ISeqMonomer>(srcMList.length);
  const isDna = src.startsWith('DNA');
  const isRna = src.startsWith('RNA');
  for (const [srcM, j] of wu.enumerate(srcMList)) {
    let m: string | null = srcM.original;
    if (isDna || isRna) {
      m = m.replace(HELM_WRAPPERS_REGEXP, '$1');
      m = m === PHOSPHATE_SYMBOL ? null : m;
    }
    tgtMList[j] = m ? new SeqMonomer(m) : null;
  }
  return tgtMList.filter((tgtM) => !!tgtM) as ISeqMonomer[];
}
