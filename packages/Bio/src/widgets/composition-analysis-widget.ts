import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {TAGS as bioTAGS, ALPHABET} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {GAP_SYMBOL} from '@datagrok-libraries/bio/src/utils/macromolecule/consts';
import {IMonomerLibBase} from '@datagrok-libraries/bio/src/types';
import {HelmType} from '@datagrok-libraries/bio/src/helm/types';
import {HelmTypes} from '@datagrok-libraries/bio/src/helm/consts';

import '../../css/composition-analysis.css';
import {ISeqHelper} from '@datagrok-libraries/bio/src/utils/seq-helper';

export function getCompositionAnalysisWidget(
  val: DG.SemanticValue, monomerLib: IMonomerLibBase, seqHelper: ISeqHelper
): DG.Widget {
  const host = ui.div();
  host.classList.add('macromolecule-cell-comp-analysis-host');
  const alphabet = val.cell.column.tags[bioTAGS.alphabet];
  const biotype = alphabet === ALPHABET.DNA || alphabet === ALPHABET.RNA ? HelmTypes.NUCLEOTIDE : HelmTypes.AA;

  const counts: { [m: string]: number } = {};
  const sh = seqHelper.getSeqHandler(val.cell.column as DG.Column<string>);
  const rowIdx = val.cell.rowIndex;
  const seqSS = sh.getSplitted(rowIdx);
  wu.count(0).take(seqSS.length).filter((posIdx) => !seqSS.isGap(posIdx)).forEach((posIdx) => {
    let cm = seqSS.getCanonical(posIdx);
    if (biotype === HelmTypes.NUCLEOTIDE && sh.isHelm() && cm[1] === '(' && cm[cm.length - 2] === ')')
      cm = cm.substring(2, cm.length - 2);
    const count = counts[cm] || 0;
    counts[cm] = count + 1;
  });
  const table = buildCompositionTable(counts, biotype, monomerLib);
  Array.from(table.rows).forEach((row) => {
    const barCol = (row.getElementsByClassName('macromolecule-cell-comp-analysis-bar')[0] as HTMLDivElement)
      .style.backgroundColor;
    row.cells[0].style.color = barCol;
  });

  host.appendChild(table);
  return new DG.Widget(host);
}

export function buildCompositionTable(
  counts: { [m: string]: number }, biotype: HelmType, monomerLib: IMonomerLibBase
): HTMLTableElement {
  let sumValue: number = 0;
  let maxValue: number | null = null;
  for (const value of Object.values(counts)) {
    sumValue = sumValue + value;
    maxValue = maxValue === null ? value : Math.max(maxValue, value);
  }
  const maxRatio = maxValue! / sumValue;
  const elMap: { [m: string]: HTMLElement } = Object.assign({}, ...Array.from(Object.entries(counts))
    .sort((a, b) => b[1] - a[1])
    .map(([cm, value]) => {
      const ratio = value / sumValue;
      const wem = monomerLib.getWebEditorMonomer(biotype, cm)!;
      const color = wem.backgroundcolor!;
      const barDiv = ui.div('', {classes: 'macromolecule-cell-comp-analysis-bar'});
      barDiv.style.width = `${50 * ratio / maxRatio}px`;
      barDiv.style.backgroundColor = color;
      if (GAP_SYMBOL === cm) {
        barDiv.style.borderWidth = '1px';
        barDiv.style.borderStyle = 'solid';
        barDiv.style.borderColor = DG.Color.toHtml(DG.Color.lightGray);
      }
      const displayMonomer: string = GAP_SYMBOL === cm ? '-' : cm;
      const valueDiv = ui.div(`${(100 * ratio).toFixed(2)}%`);
      const el = ui.div([barDiv, valueDiv], {classes: 'macromolecule-cell-comp-analysis-value'});
      return ({[displayMonomer]: el});
    }));

  const table = ui.tableFromMap(elMap);
  Array.from(table.rows).forEach((row) => {
    const barCol = (row.getElementsByClassName('macromolecule-cell-comp-analysis-bar')[0] as HTMLDivElement)
      .style.backgroundColor;
    row.cells[0].style.color = barCol;
  });
  return table;
}
