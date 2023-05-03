import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as chemSearches from '../chem-searches';
import {similarityMetric} from '@datagrok-libraries/ml/src/distance-metrics-methods';
import $ from 'cash-dom';
import {Fingerprint} from '../utils/chem-common';
import {renderMolecule} from '../rendering/render-molecule';
import {ChemSearchBaseViewer, SIMILARITY} from './chem-search-base-viewer';
import {getRdKitModule} from '../utils/chem-common-rdkit';
import { malformedDataWarning } from '../utils/malformed-data-utils';
import { getMolSafe } from '../utils/mol-creation_rdkit';
import '../../css/chem.css';

export class ChemSimilarityViewer extends ChemSearchBaseViewer {
  followCurrentRow: boolean;
  sketchButton: HTMLElement;
  sketchedMolecule: string = '';
  curIdx: number = 0;
  molCol: DG.Column | null = null;
  idxs: DG.Column | null = null;
  scores: DG.Column | null = null;
  cutoff: number;
  targetMoleculeIdx: number = 0;

  get targetMolecule(): string {
    return this.isEditedFromSketcher ?
      this.sketchedMolecule :
      this.moleculeColumn?.get(this.targetMoleculeIdx);
  }

  constructor() {
    super(SIMILARITY);
    this.cutoff = this.float('cutoff', 0.01, {min: 0, max: 1});
    this.followCurrentRow = this.bool('followCurrentRow', true,
      {description: 'Re-compute similarity search when changing current row'});
    this.sketchButton = ui.icons.edit(() => {
      const sketcher = new grok.chem.Sketcher();
      const savedMolecule = this.targetMolecule;
      sketcher.setMolecule(this.targetMolecule);
      ui.dialog()
        .add(sketcher.root)
        .onOK(() => {
          this.isEditedFromSketcher = true;
          const editedMolecule = sketcher.getMolFile();
          if (DG.chem.Sketcher.isEmptyMolfile(editedMolecule)) {
            grok.shell.error(`Empty molecule cannot be used for similarity search`);
            this.sketchedMolecule = savedMolecule;
          } else {
            this.sketchedMolecule = sketcher.getMolFile();
            this.gridSelect = false;
            this.render();
          }
        })
        .show();
    })
    this.sketchButton.classList.add('similarity-search-edit');
    this.sketchButton.classList.add('chem-mol-view-icon');
    this.updateMetricsLink(this , {});
  }

  init(): void {
    this.isEditedFromSketcher = false;
    this.followCurrentRow = true;
    this.initialized = true;
  }

  async render(computeData = true): Promise<void> {
    if (!this.beforeRender())
      return;
    if (this.moleculeColumn) {
      const progressBar = DG.TaskBarProgressIndicator.create(`Similarity search running...`);
      this.curIdx = this.dataFrame!.currentRowIdx == -1 ? 0 : this.dataFrame!.currentRowIdx;
      if (computeData && !this.gridSelect && this.followCurrentRow) {
        this.targetMoleculeIdx = this.dataFrame!.currentRowIdx == -1 ? 0 : this.dataFrame!.currentRowIdx;
        if (this.isEmptyOrMalformedValue()) {
          progressBar.close();
          return;
        }
        try {
          const df = await chemSimilaritySearch(this.dataFrame!, this.moleculeColumn!,
            this.targetMolecule, this.distanceMetric, this.limit, this.cutoff, this.fingerprint as Fingerprint);
          this.molCol = df.getCol('smiles');
          this.idxs = df.getCol('indexes');
          this.scores = df.getCol('score');
        } catch (e: any){
          grok.shell.error(e.message);
          return;
        } finally {
          progressBar.close();
        }
      } else if (this.gridSelect)
        this.gridSelect = false;
      this.clearResults();
      const panel = [];
      const grids = [];
      let cnt = 0; let cnt2 = 0;
      panel[cnt++] = this.metricsDiv;
      if (this.molCol && this.idxs && this.scores) {
        if (this.isEditedFromSketcher) {
          const label = this.sketchButton;
          const grid = ui.div([
            renderMolecule(
              this.targetMolecule, {width: this.sizesMap[this.size].width, height: this.sizesMap[this.size].height}),
            label]);
          let divClass = 'd4-flex-col';
          divClass += ' d4-current';
          grid.style.boxShadow = '0px 0px 1px var(--grey-6)';
          $(grid).addClass(divClass);
          grids[cnt2++] = grid;
        }
        for (let i = 0; i < this.molCol.length; ++i) {
          const idx = this.idxs.get(i);
          const similarity = this.scores.get(i).toPrecision(2);
          const label = idx === this.targetMoleculeIdx && !this.isEditedFromSketcher ?
            this.sketchButton : ui.div();
          const molProps = this.createMoleculePropertiesDiv(idx, similarity);
          const grid = ui.div([
            renderMolecule(
              this.molCol?.get(i), {width: this.sizesMap[this.size].width, height: this.sizesMap[this.size].height}),
            label,
            molProps]);
          let divClass = 'd4-flex-col';
          if (idx == this.curIdx) {
            divClass += ' d4-current';
            grid.style.backgroundColor = '#ddffd9';
          }
          if (idx == this.targetMoleculeIdx && !this.isEditedFromSketcher) {
            divClass += ' d4-current';
            grid.style.boxShadow = '0px 0px 1px var(--grey-6)';
          }
          if (this.dataFrame!.selection.get(idx)) {
            divClass += ' d4-selected';
            if (divClass == 'd4-flex-col d4-selected')
              grid.style.backgroundColor = '#f8f8df';
            else
              grid.style.backgroundColor = '#d3f8bd';
          }
          $(grid).addClass(divClass);
          grid.addEventListener('click', (event: MouseEvent) => {
            if (this.dataFrame && this.idxs) {
              if (event.shiftKey || event.altKey)
                this.dataFrame.selection.set(idx, true);
              else if (event.metaKey) {
                const selected = this.dataFrame.selection;
                this.dataFrame.selection.set(idx, !selected.get(idx));
              } else {
                this.dataFrame.currentRowIdx = idx;
                this.gridSelect = true;
              }
            }
          });
          grids[cnt2++] = grid;
        }
      }
      panel[cnt++] = ui.divH(grids, 'chem-viewer-grid');
      this.root.appendChild(ui.panel([ui.divV(panel)]));
      progressBar.close();
    }
  }

  isEmptyOrMalformedValue(): boolean {
    const malformed = !getMolSafe(this.targetMolecule, {}, getRdKitModule()).mol;
    const empty = !this.targetMolecule || DG.chem.Sketcher.isEmptyMolfile(this.targetMolecule);
    const moleculeError = malformed ? `Malformed` : empty ? `Empty` : '';
    if (moleculeError) {
      grok.shell.error(`${moleculeError} molecule cannot be used for similarity search`);
      this.clearResults();
      return true;
    }
    return false;
  }

  clearResults() {
    if (this.root.hasChildNodes())
      this.root.removeChild(this.root.childNodes[0]);
  }
}

export async function chemSimilaritySearch(
  table: DG.DataFrame,
  smiles: DG.Column,
  molecule: string,
  metricName: string,
  limit: number,
  minScore: number,
  fingerprint: Fingerprint,
) : Promise<DG.DataFrame> {
  const targetFingerprint = chemSearches.chemGetFingerprint(molecule, fingerprint);
  const fingerprintCol = await chemSearches.chemGetFingerprints(smiles, fingerprint);
  malformedDataWarning(fingerprintCol, table);
  const distances: number[] = [];

  const fpSim = similarityMetric[metricName];
  for (let row = 0; row < fingerprintCol.length; row++) {
    const fp = fingerprintCol[row];
    distances[row] = (!fp || fp!.allFalse) ? 100.0 : fpSim(targetFingerprint, fp!);
  }

  function range(end: number) {
    return Array(end).fill(0).map((_, idx) => idx);
  }

  function compare(i1: number, i2: number) {
    if (distances[i1] > distances[i2])
      return -1;

    if (distances[i1] < distances[i2])
      return 1;

    return 0;
  }

  const indexes = range(table.rowCount)
    .filter((idx) => fingerprintCol[idx] && !fingerprintCol[idx]!.allFalse)
    .sort(compare);
  const molsList = [];
  const scoresList = [];
  const molsIdxs = [];
  limit = Math.min(indexes.length, limit);
  for (let n = 0; n < limit; n++) {
    const idx = indexes[n];
    const score = distances[idx];
    if (score < minScore)
      break;

    molsIdxs[n] = idx;
    molsList[n] = smiles.get(idx);
    scoresList[n] = score;
  }
  const mols = DG.Column.fromList(DG.COLUMN_TYPE.STRING, 'smiles', molsList);
  mols.semType = DG.SEMTYPE.MOLECULE;
  const scores = DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'score', scoresList);
  const newIndexes = DG.Column.fromList(DG.COLUMN_TYPE.INT, 'indexes', molsIdxs);
  return DG.DataFrame.fromColumns([mols, scores, newIndexes]);
}
