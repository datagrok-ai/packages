/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export const _package = new DG.Package();


//tags: init
export async function initChem(): Promise<void> {
  // apparently HELMWebEditor requires dojo to be initialized first
  return new Promise((resolve, reject) => {
    // @ts-ignore
    dojo.ready(function () { resolve(null); });
  });
}


//name: helmCellRenderer
//tags: cellRenderer,cellRenderer-HELM
//meta.cellType: HELM
//meta-cell-renderer-sem-type: HELM
//output: grid_cell_renderer result
export function helmCellRenderer(): DG.GridCellRenderer {
  return new HelmCellRenderer();
}

//name: helmToSmiles
//tags: converter
//output: string smiles {semType: Molecule}
export function helmToSmiles(helm: string): string {
  //todo: call webservice
  return 'foo';
}

//name: helmToFasta
//tags: converter
//output: string smiles {semType: fasta}
export function helmToFasta(helm: string): string {
  return 'foo';
}


//name: helmColumnToSmiles
//input: column helmColumn {semType: HELM}
export function helmColumnToSmiles(helmColumn: DG.Column) {
  //todo: add column with smiles to col.dataFrame.
}

// todo: "Details" panel (see Toxicity)
// smiles, mol weight, mol formula, extinction coefficient, "combined"


class HelmCellRenderer extends DG.GridCellRenderer {

  get name() { return 'helm'; }
  get cellType() { return 'helm'; }
  get defaultWidth(): number | null { return 400; }
  get defaultHeight(): number | null { return 100; }

  render(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: DG.GridCell, cellStyle: DG.GridCellStyle) {
    let host = ui.div([], { style: { width: `${w}px`, height: `${h}px`}});
    host.setAttribute('dataformat', 'helm');
    host.setAttribute('data', gridCell.cell.value);

    gridCell.element = host;
    // @ts-ignore
    new JSDraw2.Editor(host, { width: w, height: h, skin: "w8", viewonly: true });
    
    host.addEventListener('dblclick', function() {
      let view = ui.div();
      let app: { canvas: { helm: { setSequence: (arg0: any, arg1: string) => void; }; }; };
      setTimeout(function () {
        //@ts-ignore
        org.helm.webeditor.MolViewer.molscale = 0.8;
        //@ts-ignore
        app = new scil.helm.App(view, { showabout: false, mexfontsize: "90%", mexrnapinontab: true, topmargin: 20, mexmonomerstab: true, sequenceviewonly: false, mexfavoritefirst: true, mexfilter: true });
      });
      setTimeout(function() {
        //@ts-ignore
        app.canvas.helm.setSequence(host.getAttribute('data'), 'HELM');
      }, 200);

      let dlg = ui.dialog()
      .add(view)
      .onOK(() => {
        view;
      }).show({ modal: true, fullScreen: true});
      dlg.root.children[0].remove();
      dlg.root.children[1].classList.remove('ui-panel'); 
      dlg.root.children[1].classList.remove('ui-box');
    }, false);
  }
}
