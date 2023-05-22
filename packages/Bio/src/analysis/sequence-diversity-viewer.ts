import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {getDiverseSubset} from '@datagrok-libraries/utils/src/similarity-metrics';
import {SequenceSearchBaseViewer} from './sequence-search-base-viewer';
import {getMonomericMols} from '../calculations/monomerLevelMols';
import {updateDivInnerHTML} from '../utils/ui-utils';
import {Subject} from 'rxjs';
import {calcMmDistanceMatrix, dmLinearIndex} from './workers/mm-distance-worker-creator';
import {UnitsHandler} from '@datagrok-libraries/bio/src/utils/units-handler';

export class SequenceDiversityViewer extends SequenceSearchBaseViewer {
  diverseColumnLabel: string | null; // Use postfix Label to prevent activating table column selection editor

  renderMolIds: number[] | null = null;
  columnNames = [];
  computeCompleted = new Subject<boolean>();

  constructor() {
    super('diversity');
    this.diverseColumnLabel = this.string('diverseColumnLabel', null);
  }

  async render(computeData = true): Promise<void> {
    if (!this.beforeRender())
      return;
    if (this.dataFrame) {
      if (computeData && this.moleculeColumn) {
        const uh = new UnitsHandler(this.moleculeColumn);
        await (uh.isFasta() ? this.computeByMM() : this.computeByChem());

        const diverseColumnName: string = this.diverseColumnLabel != null ? this.diverseColumnLabel :
          `diverse (${this.moleculeColumnName})`;
        const resCol = DG.Column.string(diverseColumnName, this.renderMolIds!.length)
          .init((i) => this.moleculeColumn?.get(this.renderMolIds![i]));
        resCol.semType = DG.SEMTYPE.MACROMOLECULE;
        this.tags.forEach((tag) => resCol.setTag(tag, this.moleculeColumn!.getTag(tag)));
        const resDf = DG.DataFrame.fromColumns([resCol]);
        updateDivInnerHTML(this.root, resDf.plot.grid().root);
        this.computeCompleted.next(true);
      }
    }
  }

  private async computeByChem() {
    const monomericMols = await getMonomericMols(this.moleculeColumn!);
    //need to create df to calculate fingerprints
    const _monomericMolsDf = DG.DataFrame.fromColumns([monomericMols]);
    this.renderMolIds = await grok.functions.call('Chem:callChemDiversitySearch', {
      col: monomericMols,
      metricName: this.distanceMetric,
      limit: this.limit,
      fingerprint: this.fingerprint
    });
  }

  private async computeByMM() {
    const distanceMatrixData = await calcMmDistanceMatrix(this.moleculeColumn!);
    const len = this.moleculeColumn!.length;
    const linearizeFunc = dmLinearIndex(len);
    this.renderMolIds = getDiverseSubset(len, Math.min(len, this.limit),
      (i1: number, i2: number) => distanceMatrixData[linearizeFunc(i1, i2)]);
  }
}
