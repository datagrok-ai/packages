import * as DG from "datagrok-api/dg";
import * as ui from 'datagrok-api/ui';

export interface IStyle {
  color?: string;
  backColor?: string;
  horzAlign?: 'left' | 'right' | 'center';
  vertAlign?: 'top' | 'bottom' | 'center';
}


export abstract class Element {
  bounds: DG.Rect;
  parent?: Element;
  style?: IStyle;

  protected constructor(bounds: DG.Rect) {
    this.bounds = bounds;
  }

  abstract render(g: CanvasRenderingContext2D): void;

  hitTest(x: number, y: number): Element | null {
    return this.bounds.contains(x, y) ? this : null;
  }
}


export class LabelElement extends Element {
  constructor(bounds: DG.Rect,
              public text: string,
              public style?: IStyle) {
    super(bounds);
  }

  render(g: CanvasRenderingContext2D) {
    g.fillStyle = this.style?.color ?? 'grey'
    g.textAlign = this.style?.horzAlign ?? 'left';
    g.textBaseline = 'middle';
    //g.fillText(this.text, this.bounds.x, this.bounds.y, this.bounds.width);
    drawClipped(g, this.bounds, () => {
      const x
        = g.textAlign == 'left' ? this.bounds.x
        : g.textAlign == 'right' ? this.bounds.right
        : g.textAlign == 'center' ? this.bounds.midX : 0;
      g.fillText(this.text, x, this.bounds.midY, this.bounds.width);
    });
  }
}


export class MarkerElement extends Element {
  constructor(bounds: DG.Rect,
              public marker: DG.MARKER_TYPE.CIRCLE,
              public color: number) {
    super(bounds);
  }

  render(g: CanvasRenderingContext2D) {
    DG.Paint.marker(g, this.marker, this.bounds.midX, this.bounds.midY, this.color,
      Math.min(this.bounds.width / 2, this.bounds.height / 2));
  }
}


export class GridCellElement extends Element {
  constructor(bounds: DG.Rect,
              public gridCell: DG.GridCell) {
    super(bounds);
  }

  render(g: CanvasRenderingContext2D) {
    g.fillStyle = 'grey';
    this.gridCell.renderer.render(g,
      this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height,
      this.gridCell, this.gridCell.style);
  }
}


export class Scene extends Element {
  elements: Element[] = [];

  constructor(bounds: DG.Rect) {
    super(bounds);
  }

  render(g: CanvasRenderingContext2D) {
    for (const e of this.elements) {
      e.render(g);
    }
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = ui.canvas(this.bounds.width, this.bounds.height);
    this.render(canvas.getContext("2d")!);
    return canvas;
  }

  hitTest(x: number, y: number): Element | null {
    for (const e of this.elements) {
      if (e.hitTest(x, y))
        return e;
    }
    return null;
  }
}


function drawClipped(g: CanvasRenderingContext2D, bounds: DG.Rect, draw: () => void) {
  try {
    //g.save();
    //g.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    //g.clip();
    draw();
  }
  finally {
    //g.restore();
  }
}