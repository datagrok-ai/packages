import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_package} from '../../package';
import {SEQUENCE_TYPES, COL_NAMES, GENERATED_COL_NAMES} from './constants';
import {getSaltMass, getSaltMolWeigth, getBatchMolWeight} from './calculations';
import {stringify} from '../helpers';

import {RegistrationColumnsHandler} from './add-columns';
import {sdfSaveTable} from './save-table';
import {PREFIXES, SEQ_TYPE, SEQ_TYPE_CATEGORY, seqTypeToCategoryDict} from './const';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';
import {DBLoaderBase} from '../data-loading-utils/database-loader';
import {Unsubscribable} from 'rxjs';

/** Style used for cells in 'Type' column  */
const typeColCellStyle = {
  'display': 'flex',
  'justify-content': 'center',
  'align-items': 'center',
  'text-color': 'var(--grey-5)', // --grey-6 does not match other cells
  'width': '100%',
  'height': '100%',
};

const pinkBackground = {
  'background-color': '#ff8080',
};

/** Style used for a cell with invalid value  */
const typeColErrorStyle = Object.assign({}, pinkBackground, typeColCellStyle);

export function sdfHandleErrorUI(msgPrefix: string, df: DG.DataFrame, rowI: number, err: any) {
  const errStr: string = err.toString();
  const errMsg: string = msgPrefix + `row #${rowI + 1}, name: '${df.get('Chemistry Name', rowI)}', ` +
    `type: ${df.get('Type', rowI)} error: ${errStr}.`;
  grok.shell.warning(errMsg);
}

/** Determine the category of the value specified in 'Types' column  */
function getSequenceTypeCategory(actualType: string): SEQ_TYPE_CATEGORY {
  if (Object.keys(seqTypeToCategoryDict).includes(actualType))
    return seqTypeToCategoryDict[actualType as SEQ_TYPE];
  else
    throw new Error('Some types in \'Types\' column are invalid ');
}

function isASorSS(splittedLines: string[][]): boolean {
  return splittedLines.length === 1 && splittedLines[0].length === 1;
}

/** Check whether the number of lines and prefixes in the 'Sequence' string
 * are valid  */
function verifyPrefixes(splittedLines: string[][], allowedPrefixes: Set<PREFIXES>, allowedLength: number): boolean {
  const lengthCriterion = splittedLines.length === allowedLength;
  let prefixCriterion = true;
  for (const line of splittedLines) {
    const prefix = line[0];
    prefixCriterion &&= (allowedPrefixes.has(prefix as PREFIXES));
  }
  return lengthCriterion && prefixCriterion;
}

function isDuplex(splittedLines: string[][]): boolean {
  const allowedPrefixes = new Set([PREFIXES.SS, PREFIXES.AS]);
  return verifyPrefixes(splittedLines, allowedPrefixes, 2);
}

function isDimer(splittedLines: string[][]): boolean {
  const allowedPrefixes = new Set([PREFIXES.SS, PREFIXES.AS1, PREFIXES.AS2]);
  return verifyPrefixes(splittedLines, allowedPrefixes, 3);
}

function inferTypeClassFromSequence(seq: string): SEQ_TYPE_CATEGORY {
  const lines = seq.split('\n');
  const splittedLines = [];
  for (const line of lines)
    splittedLines.push(line.split(' '));
  if (isASorSS(splittedLines))
    return SEQ_TYPE_CATEGORY.AS_OR_SS;
  else if (isDuplex(splittedLines))
    return SEQ_TYPE_CATEGORY.DUPLEX;
  else if (isDimer(splittedLines))
    return SEQ_TYPE_CATEGORY.DIMER;
  else
    throw new Error('Some cells in \'Sequence\' column have wrong formatting');
}

/** Compare type specified in 'Type' column to that computed from 'Sequence' column  */
function validateType(actualType: string, seq: string): boolean {
  if (actualType === '' && seq === '')
    return true;
  else
    return getSequenceTypeCategory(actualType) === inferTypeClassFromSequence(seq);
}

function oligoSdFileGrid(view: DG.TableView): void {
  const typeColName = 'Type';
  const seqColName = 'Sequence';
  const grid = view.grid;
  const df = view.dataFrame;
  const typeCol = df.getCol(typeColName);
  grid.columns.byName(typeColName)!.cellType = 'html';
  const seqCol = df.getCol(seqColName);
  grid.onCellPrepare((gridCell: DG.GridCell) => {
    if (gridCell.isTableCell && gridCell.gridColumn.column!.name === typeColName) {
      let isValidType = false;
      let formattingError = false;
      try {
        isValidType = validateType(gridCell.cell.value, seqCol.get(gridCell.tableRow!.idx));
      } catch {
        formattingError = true;
      }
      const el = ui.div(
        gridCell.cell.value, isValidType ? {style: typeColCellStyle} : {style: typeColErrorStyle}
      );
      gridCell.style.element = el;
      const msg = formattingError ? 'Sequence pattern or Type value has wrong formatting' :
        'Input in Type column doesn\'t match the Sequence pattern';
      if (!isValidType)
        ui.tooltip.bind(el, msg);
    }
  });
}

export async function engageViewForOligoSdFileUI(view: DG.TableView) {
  console.log('From engageViewForOligoSdFile')
  await _package.initDBLoader();
  oligoSdFileGrid(view);
  await oligoSdFile(_package.dbLoader, view.dataFrame);

  const subs: Unsubscribable[] = [];

  subs.push(grok.events.onViewRemoved.subscribe((view: DG.View) => {
    for (const sub of subs) sub.unsubscribe();
  }));
}

export async function oligoSdFile(dl: DBLoaderBase, table: DG.DataFrame) {
  const saltCol = table.getCol(COL_NAMES.SALT);
  const equivalentsCol = table.getCol(COL_NAMES.EQUIVALENTS);

  const saltsMolWeightList: number[] = dl.Salts.getCol('MOLWEIGHT').toList();
  const saltNamesList: string[] = dl.Salts.getCol('DISPLAY').toList();

  let newDf: DG.DataFrame | undefined = undefined;

  const d = ui.div([
    ui.icons.edit(() => {
      d.innerHTML = '';
      if (table.getCol(COL_NAMES.IDP).type !== DG.COLUMN_TYPE.STRING)
        table.changeColumnType(COL_NAMES.IDP, DG.COLUMN_TYPE.STRING);
      d.append(
        ui.divH([
          ui.button('Add columns',
            () => {
              const rch = new RegistrationColumnsHandler(
                table,
                (rowI, err) => { sdfHandleErrorUI('Error on ', table, rowI, err); }
              );
              newDf = rch.addColumns(saltNamesList, saltsMolWeightList);
              // newDf = sdfAddColumns(table, saltNamesList, saltsMolWeightList,
              //   (rowI, err) => { sdfHandleErrorUI('Error on ', table, rowI, err); });
              grok.shell.getTableView(newDf.name).grid.columns.setOrder(Object.values(COL_NAMES));
            },
            `Add columns: '${GENERATED_COL_NAMES.join(`', '`)}'`),
          ui.bigButton('Save SDF', () => {
            const df: DG.DataFrame = newDf ?? table;
            sdfSaveTable(df,
              (rowI, err) => { sdfHandleErrorUI('Skip ', df, rowI, err); });
          }, 'Save SD file'),
        ])
      );

      const view = grok.shell.getTableView(table.name);
      const typesList: string[] = Object.values(SEQUENCE_TYPES);
      const usersList: string[] = dl.Users.getCol('DISPLAY').toList();
      const icdsList: string[] = dl.ICDs.getCol('DISPLAY').toList();
      const idpsList: string[] = dl.IDPs.getCol('DISPLAY').toList();
      const sourcesList: string[] = dl.Sources.getCol('DISPLAY').toList();
      const saltsList: string[] = dl.Salts.getCol('DISPLAY').toList();
      view.grid.setOptions({rowHeight: 45});
      view.dataFrame.getCol(COL_NAMES.TYPE).setTag(DG.TAGS.CHOICES, stringify(typesList));
      view.dataFrame.getCol(COL_NAMES.OWNER).setTag(DG.TAGS.CHOICES, stringify(usersList));
      view.dataFrame.getCol(COL_NAMES.ICD).setTag(DG.TAGS.CHOICES, stringify(icdsList));
      view.dataFrame.getCol(COL_NAMES.IDP).setTag(DG.TAGS.CHOICES, stringify(idpsList));
      view.dataFrame.getCol(COL_NAMES.SOURCE).setTag(DG.TAGS.CHOICES, stringify(sourcesList));
      view.dataFrame.getCol(COL_NAMES.SALT).setTag(DG.TAGS.CHOICES, stringify(saltsList));

      grok.events.onContextMenu.subscribe((event: DG.EventData) => {
        if (!(event.args.context instanceof DG.Grid)) return;
        const grid: DG.Grid = event.args.context as DG.Grid;
        const menu: DG.Menu = event.args.menu;

        if ([COL_NAMES.TYPE, COL_NAMES.OWNER, COL_NAMES.SALT, COL_NAMES.SOURCE, COL_NAMES.ICD, COL_NAMES.IDP]
          .includes(grid.table.currentCol.name)) {
          menu.item('Fill Column With Value', () => {
            const v = grid.table.currentCell.value;
            grid.table.currentCell.column.init(v);
            for (let i = 0; i < view.dataFrame.rowCount; i++)
              updateCalculatedColumns(view.dataFrame, i);
          });
        }
      });

      view.dataFrame.onDataChanged.subscribe(() => {
        const colName = view.dataFrame.currentCol.name;
        if ([COL_NAMES.SALT, COL_NAMES.EQUIVALENTS, COL_NAMES.SALT_MOL_WEIGHT].includes(colName))
          updateCalculatedColumns(view.dataFrame, view.dataFrame.currentRowIdx);
      });

      function updateCalculatedColumns(t: DG.DataFrame, i: number): void {
        const smValue = getSaltMass(saltNamesList, saltsMolWeightList, equivalentsCol, i, saltCol);
        t.getCol(COL_NAMES.SALT_MASS).set(i, smValue, false);
        const smwValue = getSaltMolWeigth(saltNamesList, saltCol, saltsMolWeightList, i);
        t.getCol(COL_NAMES.SALT_MOL_WEIGHT).set(i, smwValue, false);
        const bmw = getBatchMolWeight(t.getCol(COL_NAMES.COMPOUND_MOL_WEIGHT), t.getCol(COL_NAMES.SALT_MASS), i);
        t.getCol(COL_NAMES.BATCH_MOL_WEIGHT).set(i, bmw, false);
      }
    }),
  ]);
  grok.shell.v.setRibbonPanels([[d]]);
}
