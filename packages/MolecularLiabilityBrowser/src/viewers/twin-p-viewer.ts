import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {NglAspect} from './ngl-aspect';
import {PvizAspect} from './pviz-aspect';
import {MiscMethods} from './misc';
import {DataLoader, JsonType, ObsPtmType, PdbType} from '../utils/data-loader';

export class TwinPviewer {
  dataLoader: DataLoader;

  root: HTMLElement;
  nglHost: HTMLElement;
  pVizHostL: HTMLElement;
  pVizHostH: HTMLElement;

  //representations: string[];
  repChoice: DG.InputBase;
  cdrScheme: DG.InputBase;
  ptmChoices: DG.InputBase;
  ptmMotifChoices: DG.InputBase;
  ptmObsChoices: DG.InputBase;
  ptmProb: DG.InputBase;
  paratopes: DG.InputBase;
  sequenceTabs: DG.TabControl;

  accOptions: DG.Accordion;
  panelNode: DG.DockNode;
  nglNode: DG.DockNode;
  sequenceNode: DG.DockNode;

  // ptmPredictions: string[];
  // ptmMotifPredictions: string[];
  twinSelections = {'H': {}, 'L': {}};
  colorScheme = {
    'colBackground': 'white',
    'colHeavyChain': '#0069a7',
    'colLightChain': '#f1532b',
    'colCdr': '#45d145',
    'colPara': '#b0c4de',
    'colHighlight': '#45d145',
    'colHighlightCdr': '#FFFF00',
    'colPartopes_low': 'rgb(176,196,222)', //col_para in rgb
    'colPartopes_high': 'rgb(255, 0, 255)',
  };

  ngl: NglAspect;
  pViz: PvizAspect;

  isOpened: boolean = false;
  jsonStr: JsonType; // TODO: descriptive name
  pdbStr: PdbType;
  jsonObsPtm: ObsPtmType;

  constructor(dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
  }

  public init(json: JsonType, pdb: PdbType, jsonObsPtm: ObsPtmType) {
    // ---- SIDEPANEL REMOVAL ----
    const windows = grok.shell.windows;
    windows.showProperties = false;
    windows.showHelp = false;
    windows.showConsole = false;

    this.jsonStr = json;
    this.pdbStr = pdb;
    this.jsonObsPtm = jsonObsPtm;

    // ---- INPUTS ----
    const representations = ['cartoon', 'backbone', 'ball+stick', 'licorice', 'hyperball', 'surface'];
    this.repChoice = ui.choiceInput('Representation', 'cartoon', representations);

    const schemesLst = MiscMethods.extractSchemes(json);
    this.cdrScheme = ui.choiceInput('CDR3 Scheme', 'default', schemesLst);

    this.root = ui.div();
    this.changeChoices();

    this.ptmProb = ui.floatInput('PTM probability', 0.2);
    this.paratopes = ui.boolInput('Paratopes', false);

    // ---- VIEWER CONTAINERS ----
    this.nglHost = ui.div([], 'd4-ngl-viewer');
    this.pVizHostL = ui.box();
    this.pVizHostH = ui.box();

    this.sequenceTabs = ui.tabControl({
      'HEAVY': this.pVizHostH,
      'LIGHT': this.pVizHostL,
    });

    this.ngl = new NglAspect();
    this.pViz = new PvizAspect(this.dataLoader);
  }

  public async reset(json: JsonType, pdb: PdbType, jsonObsPtm: ObsPtmType) {
    this.jsonStr = json;
    this.pdbStr = pdb;
    this.jsonObsPtm = jsonObsPtm;

    this.twinSelections = {'H': {}, 'L': {}};

    const groups: { [_: string]: any } = {};
    const items: DG.TreeViewNode[] = [];

    for (const g in groups)
      if (groups[g].checked) groups[g].checked = false;

    for (const i of items) i.checked = false;

    this.changeChoices();

    if (!!this.ngl)
      this.ngl.stage.removeAllComponents();
  }

  public async open(mlbView: DG.TableView) {
    // ---- DOCKING ----
    if (!this.isOpened) {
      this.isOpened = true;
      this.panelNode = mlbView.dockManager.dock(this.root, DG.DOCK_TYPE.RIGHT, null, 'NGL', 0.2);
      this.nglNode = mlbView.dockManager.dock(this.nglHost, DG.DOCK_TYPE.LEFT, this.panelNode, 'NGL', 0.3);
      this.sequenceNode =
        mlbView.dockManager.dock(this.sequenceTabs.root, DG.DOCK_TYPE.DOWN, this.nglNode, 'Sequence', 0.225);
      MiscMethods.setDockSize(mlbView, this.nglNode, this.sequenceTabs.root);
    }
  }

  public async close(mlbView: DG.TableView) {
    if (!!this.sequenceTabs)
      mlbView.dockManager.close(this.sequenceTabs.root);

    if (!!this.panelNode)
      mlbView.dockManager.close(this.panelNode);

    if (!!this.nglNode)
      mlbView.dockManager.close(this.nglNode);

    if (!!this.sequenceNode)
      mlbView.dockManager.close(this.sequenceNode);

    this.isOpened = false;
  }

  public async show(mlbView: DG.TableView) {
    const reload = async (val: boolean) => {
      this.pViz.render('H');
      this.pViz.render('L');
      this.ngl.render(val);
      MiscMethods.setDockSize(mlbView, this.nglNode, this.sequenceTabs.root);
    };

    await this.ngl.init(mlbView, this.pdbStr, this.jsonStr, this.colorScheme, this.nglHost,
      this.repChoice, this.cdrScheme, this.paratopes, this.twinSelections);

    const obsChoice = this.ptmObsChoices !== undefined ? this.ptmObsChoices.value : null;

    await this.pViz.init(this.jsonStr, this.jsonObsPtm, this.colorScheme, this.pVizHostH, this.pVizHostL,
      this.ptmChoices.value, this.ptmMotifChoices.value, obsChoice, this.cdrScheme,
      this.paratopes, this.ptmProb.value, this.twinSelections);

    MiscMethods.setDockSize(mlbView, this.nglNode, this.sequenceTabs.root);

    grok.events.onCustomEvent('selectionChanged').subscribe((v) => {
      this.ngl.render(false);
    });

    this.repChoice.onChanged(async () => {
      this.ngl.repChoice = this.repChoice;
      reload(true);
    });

    this.cdrScheme.onChanged(async () => {
      this.ngl.cdrScheme = this.cdrScheme;
      this.pViz.cdrMapping(this.cdrScheme);
      reload(false);
    });

    this.paratopes.onChanged(async () => {
      this.ngl.paratopes = this.paratopes;
      this.pViz.parMapping(this.paratopes);
      reload(false);
    });

    this.ptmChoices.onChanged(async () => {
      this.pViz.ptmMapping(this.ptmChoices.value, this.ptmProb.value);
      reload(false);
    });

    this.ptmProb.onChanged(async () => {
      this.pViz.ptmMapping(this.ptmChoices.value, this.ptmProb.value);
      reload(false);
    });

    this.ptmMotifChoices.onChanged(async () => {
      this.pViz.motMapping(this.ptmMotifChoices.value, this.ptmProb.value);
      reload(false);
    });

    if (this.ptmObsChoices !== undefined) {
      this.ptmObsChoices.onChanged(async () => {
        this.pViz.obsMapping(this.ptmObsChoices.value);
        reload(false);
      });
    }
  }

  private changeChoices(): void {
    const ptmKeys =
      [...new Set([...Object.keys(this.jsonStr.ptm_predictions.H), ...Object.keys(this.jsonStr.ptm_predictions.L)])];
    const ptmPredictions: string[] = [];
    const ptmMotifPredictions: string[] = [];

    for (let i = 0; i < ptmKeys.length; i++) {
      const ptmH = this.jsonStr.ptm_predictions.H[ptmKeys[i]];
      const ptmL = this.jsonStr.ptm_predictions.L[ptmKeys[i]];

      if ((typeof (ptmH) != 'undefined' && ptmH[0][1] > 1) || (typeof (ptmL) != 'undefined' && ptmL[0][1] > 1))
        ptmMotifPredictions.push(ptmKeys[i].replaceAll('_', ' '));
      else
        ptmPredictions.push(ptmKeys[i].replaceAll('_', ' '));
    }

    //@ts-ignore
    this.ptmChoices = ui.multiChoiceInput('', [], ptmPredictions);
    //@ts-ignore
    this.ptmMotifChoices = ui.multiChoiceInput('', [], ptmMotifPredictions);

    // ---- INPUTS PANEL ----
    if (!this.accOptions) {
      this.accOptions = ui.accordion();
    } else {
      this.accOptions.removePane(this.accOptions.getPane('3D model'));
      this.accOptions.removePane(this.accOptions.getPane('Sequence'));
      this.accOptions.removePane(this.accOptions.getPane('Predicted PTMs'));
      this.accOptions.removePane(this.accOptions.getPane('Motif PTMs'));

      if (this.accOptions.getPane('Observed PTMs') !== undefined)
        this.accOptions.removePane(this.accOptions.getPane('Observed PTMs'));
    }

    this.accOptions.addPane('3D model', () => ui.inputs([this.repChoice, this.cdrScheme]));
    this.accOptions.addPane('Sequence', () => ui.inputs([this.paratopes, this.ptmProb]));
    this.accOptions.addPane('Predicted PTMs', () => ui.div([this.ptmChoices]));
    this.accOptions.addPane('Motif PTMs', () => ui.div([this.ptmMotifChoices]));

    if (this.jsonObsPtm !== null) {
      const obsPtmKeys =
        [...new Set([...Object.keys(this.jsonObsPtm.H), ...Object.keys(this.jsonObsPtm.L)])];
      const obsPtmPredictions: string[] = [];

      for (let i = 0; i < obsPtmKeys.length; i++)
        obsPtmPredictions.push(obsPtmKeys[i].replaceAll('_', ' '));

      //@ts-ignore
      this.ptmObsChoices = ui.multiChoiceInput('', [], obsPtmPredictions);
      this.accOptions.addPane('Observed PTMs', () => ui.div([this.ptmObsChoices]));
    }

    this.root.append(this.accOptions.root);
  }
}
