/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {MolfileHandler} from '@datagrok-libraries/chem-meta/src/parsing-utils/molfile-handler';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';

import $ from 'cash-dom';

const InvalidMolfileError = class extends Error {
  constructor(message: string) { super(message); }
};

export class MoleculeImage {
  constructor(molblok: string) {
    this.molblock = molblok;
  }

  private _validMolBlock: string;
  get molblock(): string { return this._validMolBlock; }

  set molblock(value: string) {
    try {
      this.validateMolBlock(value);
    } catch (error) {
      if (error instanceof InvalidMolfileError)
        value = '';
      const errorMessage = errorToConsole(error);
      console.error(errorMessage);
    }
    this._validMolBlock = value;
  }

  private validateMolBlock(molblock: string): void {
    // todo: add a sound criterion
    if (molblock === '')
      throw new InvalidMolfileError('MoleculeImage: invalid molblock');
  }

  private async drawMolBlockOnCanvas(canvas: HTMLCanvasElement): Promise<void> {
    try {
      await grok.functions.call('Chem:canvasMol', {
        x: 0, y: 0, w: canvas.width, h: canvas.height, canvas: canvas,
        molString: this.molblock, scaffoldMolString: '',
        options: {normalizeDepiction: false, straightenDepiction: false}
      });
    } catch (err) {
      const errStr = errorToConsole(err);
      console.error(errStr);
    }
  };

  private getMoleculeDimensions(): {height: number, width: number} {
    const molData = MolfileHandler.getInstance(this.molblock);
    const width: number = Math.max(...molData.x) - Math.min(...molData.x);
    const height: number = Math.max(...molData.y) - Math.min(...molData.y);
    return {height: height, width: width};
  }

  private async zoomIn(): Promise<void> {
    const dialog = ui.dialog('Molecule');
    const dialogDivStyle = {
      overflowX: 'scroll',
    };
    const dialogDiv = ui.div([], {style: dialogDivStyle});

    const height = $(window).height() * 0.7;
    const molDimensions = this.getMoleculeDimensions();

    const zoomRatio = height / molDimensions.height;

    const dialogCanvasHeight = height;
    const dialogCanvasWidth = molDimensions.width * zoomRatio;

    const dialogCanvas = ui.canvas(dialogCanvasWidth, dialogCanvasHeight);
    await this.drawMolBlockOnCanvas(dialogCanvas);

    dialogDiv.appendChild(dialogCanvas);
    dialog.add(dialogDiv).showModal(true);
  }

  public async drawMolecule(
    moleculeImgDiv: HTMLDivElement,
    canvasWidth: number, canvasHeight: number
  ): Promise<void> {
    moleculeImgDiv.innerHTML = '';

    const canvas = ui.canvas(canvasWidth * window.devicePixelRatio, canvasHeight * window.devicePixelRatio);

    // Draw zoomed-out molecule
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.borderStyle = 'solid';
    canvas.style.borderColor = 'var(--grey-3)';
    canvas.style.borderWidth = 'thin';
    this.drawMolBlockOnCanvas(canvas);

    // Dialog with zoomed-in molecule
    $(canvas).on('click', async () => { await this.zoomIn(); });
    $(canvas).on('mouseover', () => $(canvas).css('cursor', 'grab')); // for some reason 'zoom-in' value wouldn't work
    $(canvas).on('mouseout', () => $(canvas).css('cursor', 'default'));

    moleculeImgDiv.append(canvas);
  }
}
