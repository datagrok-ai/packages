import * as DG from 'datagrok-api/dg';
import * as GridUtils from '../utils/GridUtils';
import * as TextUtils from '../utils/TextUtils';
import * as MathUtils from '../utils/MathUtils';
import {GridCellRendererEx} from "./GridCellRendererEx";
import {PinnedColumn} from "../pinned/PinnedColumn";

class ImageRequest {
  constructor(strIdImage : string, nW : number, nH : number) {
    this.m_strIdImage = strIdImage;
    this.m_nW = nW;
    this.m_nH = nH;
    this.m_bError = false;
  }

  isMatch(strIdImage : string, nW : number, nH : number) : boolean {
    const b : boolean = this.m_strIdImage === strIdImage && this.m_nW === nW && this.m_nH === nH;
    return b;
  }

  isError() : boolean {
    return this.m_bError;
  }

  setError(bError : boolean) : void {
    this.m_bError = bError;
  }

  private m_strIdImage : string;
  private m_nW : number;
  private m_nH : number;
  private m_bError : boolean;
}


function paintImageReady(g : CanvasRenderingContext2D, grid : DG.Grid, strColName : string, strIdImageReady : string, imgReady : any, fnValueToImageId : Function, nXOffset : number) : void {
  const bError = imgReady === null;
  let cellGridTmp: DG.GridCell;
  let obVal = null;
  let strVal = null;
  const arMinMaxRowIdxs = [-1, -1];
  GridUtils.fillVisibleViewportRows(arMinMaxRowIdxs, grid);
  const nRMin = arMinMaxRowIdxs[0];
  const nRMax = arMinMaxRowIdxs[1];
  for (let nR = nRMin; nR <= nRMax; ++nR) {
    cellGridTmp = grid.cell(strColName, nR);
    if (!(cellGridTmp instanceof DG.GridCell) || !(cellGridTmp.cell instanceof DG.Cell)) {
     continue;
    }

  obVal = cellGridTmp.cell.value;
  strVal = fnValueToImageId(obVal);
  if (strVal === strIdImageReady) {
    if(bError) {
      g.font = cellGridTmp.style.font === null ? "10px Dialog" : cellGridTmp.style.font;
      const rc = cellGridTmp.bounds;
      const nX = isNaN(nXOffset) ? rc.x : nXOffset;
      const nW = isNaN(nXOffset) ? rc.width : g.canvas.width;
      g.fillStyle = 'white';
      g.fillRect(nX, rc.y, nW, rc.height);

      const str = TextUtils.trimText('Error', g, nW);

      const tm = g.measureText(str);
      let nWLabel = tm.width;

      const nAscent = Math.abs(tm.actualBoundingBoxAscent);
      const nDescent = tm.actualBoundingBoxDescent;
      const nHFont = nAscent + nDescent;

      g.fillStyle = 'red';
      g.textAlign = 'start';
      const nXX = nX + ((nW - nWLabel) >> 1);
      const nYY = rc.y + Math.floor((rc.height + nHFont) / 2);
      g.fillText(str, nXX, nYY);
    }
    else {
      const rc = cellGridTmp.bounds;
      const nX = isNaN(nXOffset) ? rc.x : nXOffset;
      const nW = isNaN(nXOffset) ? rc.width : g.canvas.width;
      g.drawImage(imgReady, nX, rc.y, nW, rc.height);
    }
  }
 }
}

export class LoadableImageRenderer extends GridCellRendererEx {

  constructor() {
    super();
  }

  valueToImageId(obValue : any) : string | null {
    return obValue === undefined || obValue === null ? null : obValue.toString();
  }

  createImage(strImageId : string, nWImage : number, nHImage : number, fnImageRadyCallback : any) : void {

  }

  onResizeWidth(colGridOrPinned : DG.GridColumn | PinnedColumn, grid : DG.Grid, nWCol : number, bAdjusting : boolean) : void  {

    const nHRow = GridUtils.getGridRowHeight(grid);
    this.onResize(colGridOrPinned, grid, nWCol, nHRow, bAdjusting);
  }

  onResizeHeight(colGridOrPinned : DG.GridColumn | PinnedColumn, grid : DG.Grid, nHRow : number, bAdjusting : boolean) : void {

    const nWCol = colGridOrPinned instanceof DG.GridColumn ? colGridOrPinned.width : colGridOrPinned.getWidth();
    this.onResize(colGridOrPinned, grid, nWCol, nHRow, bAdjusting);
  }

  private onResize(colGridOrPinned : DG.GridColumn | PinnedColumn, grid: DG.Grid, nWCol : number, nHRow : number, bAdjusting : boolean) : void {

    if(!MathUtils.isStrictInt(nWCol)) {
      console.error('Image width is not an integer: ' + nWCol + " Will be converted to " + Math.floor(nWCol));
      nWCol = Math.floor(nWCol);
    }

    if(!MathUtils.isStrictInt(nHRow)) {
      console.error('Image height is not an integer: ' + nHRow + " Will be converted to " + Math.floor(nHRow));
      nHRow = Math.floor(nHRow);
    }

    this.m_bCellsAdjusting = bAdjusting;
    if(bAdjusting) {
      return;
    }

    const bGridCol = colGridOrPinned instanceof DG.GridColumn;
    if(!bGridCol && colGridOrPinned.getGridColumn() === null) {
      return;
    }

    let col = null;
    if(bGridCol) {
      col = colGridOrPinned.column;
    } else {

      const colGrid = colGridOrPinned.getGridColumn();
      if(colGrid === null) {
        col = null;
      }
      else {
        col = colGrid.column;
      }
    }
    if(col === null) {
      return;
    }

    const arRowIdxs = new Array<number>(2);
    GridUtils.fillVisibleViewportRows(arRowIdxs, grid);
    const nRowMin = arRowIdxs[0];
    const nRowMax = arRowIdxs[1];
    let cell = null;
    let nRecord = -1;
    let obValue = null;
    let strImageId : string | null = null;

    for(let nRow=nRowMin; nRow<=nRowMax; ++nRow) {
        cell = grid.cell(col.name, nRow);
        if(cell.tableRowIndex === null) {
          continue;
        }
        nRecord = cell.tableRowIndex;
        obValue = col.get(nRecord);
        strImageId = this.valueToImageId(obValue);
        if(strImageId === null || strImageId.length === 0) {
         continue;
       }

      const strColNameTmp = col.name;

      let request = this.m_mapImages.get(strImageId);
      if (request instanceof ImageRequest && request.isMatch(strImageId, nWCol, nHRow)) {
        return;
      }

      request = new ImageRequest(strImageId, nWCol, nHRow);
      this.m_mapImages.set(strImageId, request);

      const eCanVasSource = bGridCol ? grid.canvas : colGridOrPinned.getRoot();
      const rendererThis = this;
      this.createImage(strImageId, nWCol, nHRow, (strrIdImage : string, imgNew : any) => {
          if(imgNew === null) {
            const req = rendererThis.m_mapImages.get(strrIdImage);
            req.setError(true);
            //return;
          }
          else {
            rendererThis.m_mapImages.set(strrIdImage, imgNew);
          }
          if(eCanVasSource === null) {
            return;
          }

          const g = eCanVasSource.getContext("2d");
          if(g === null) {
            return;
          }

        let nXOffset = NaN;
        if(eCanVasSource !== grid.canvas) {//pinned column, or something else
          nXOffset = 0;
        }

        paintImageReady(g, grid, strColNameTmp, strrIdImage, imgNew, rendererThis.valueToImageId, nXOffset);
       });
      }

  }

  render(g: CanvasRenderingContext2D, nX: number, nY: number, nW: number, nH: number, value: any, context: any): void {

    if(!MathUtils.isStrictInt(nW)) {
      console.error('Image width is not an integer: ' + nW + " Will be converted to " + Math.floor(nW));
      nW = Math.floor(nW);
    }

    if(!MathUtils.isStrictInt(nH)) {
      console.error('Image height is not an integer: ' + nH + " Will be converted to " + Math.floor(nH));
      nH = Math.floor(nH);
    }

    const cellGrid: DG.GridCell = value;
    const obValue = cellGrid.cell.value;
    const strImageId = this.valueToImageId(obValue);
    if (strImageId === null || strImageId === undefined || strImageId == '') {
      g.fillStyle = 'white';
      g.fillRect(nX, nY, nW, nH);
      return;
    }

    if (!this.m_bCellsAdjusting) {
      const img = this.m_mapImages.get(strImageId);
      if (!(img instanceof ImageRequest) && img !== undefined && img !== null && img.width === nW && img.height === nH) {
        g.drawImage(img, nX, nY, nW, nH);
        return;
      }
    }

    g.fillStyle = "Gray";
    let str = '';
    if(this.m_bCellsAdjusting) {
      str = 'Updating...';
    }
    else {
      const req = this.m_mapImages.get(strImageId);
      if(req instanceof ImageRequest && req.isError()) {
        str = 'Error';
        g.fillStyle = "red";
      }
      else {
        str = 'Loading...';
      }
    }

    //let str = this.m_bCellsAdjusting ? "Updating..." : "Loading...";

    g.font = cellGrid.style.font === null ? "10px Dialog" : cellGrid.style.font;
    str = TextUtils.trimText(str, g, nW);

    const tm = g.measureText(str);
    let nWLabel = tm.width;

    const nAscent = Math.abs(tm.actualBoundingBoxAscent);
    const nDescent = tm.actualBoundingBoxDescent;
    const nHFont = nAscent + nDescent;

    g.textAlign = 'start';

    const nXX = nX + ((nW - nWLabel) >> 1);
    const nYY = nY + Math.floor((nH + nHFont) / 2);
    g.fillText(str, nXX, nYY);

    if (this.m_bCellsAdjusting) {
      return;
    }

    const grid = cellGrid.grid;
    const rendererThis = this;
    const strColNameTmp = cellGrid.gridColumn.name;

    let request = this.m_mapImages.get(strImageId);
    if (request instanceof ImageRequest && request.isMatch(strImageId, nW, nH)) {
      return;
    }

    request = new ImageRequest(strImageId, nW, nH);
    this.m_mapImages.set(strImageId, request);

    const eCanvasTmp = g.canvas;
    let nXOffset = NaN;
    if(g.canvas !== grid.canvas) {//pinned column, or something else
      nXOffset = nX;
    }

    //console.log('Sending request : ' + strImageId + " " + nW + " " + nH + " " + nXOffset);
    this.createImage(strImageId, nW, nH, (strIdImageReady: string, imgReady: any) => {
      if (imgReady === null) {
        const request = rendererThis.m_mapImages.get(strIdImageReady);
        request.setError(true);
        //return;
      }
      else {
        //console.log('Request Ready: ' + strImageId + " " + nW + " " + nH);
        rendererThis.m_mapImages.set(strIdImageReady, imgReady);
      }

      const graphics = eCanvasTmp.getContext("2d");
      if (graphics === null) {
        return;
      }

      paintImageReady(graphics, grid, strColNameTmp, strIdImageReady, imgReady, rendererThis.valueToImageId, nXOffset);
    });
  }

 private m_mapImages = new Map();
 private m_bCellsAdjusting = false;
}
