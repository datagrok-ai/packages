import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {
  DataLoader,
  DataLoaderType,
  FilterPropertiesType,
  JsonType,
  NumsType,
  ObsPtmType,
  PdbType
} from './utils/data-loader';
import {Subscription, Unsubscribable} from 'rxjs';
import {Aminoacids} from '@datagrok-libraries/bio/src/aminoacids';
import {VdRegionsViewer} from '@datagrok/bio/src/viewers/vd-regions-viewer';
import {TreeBrowser} from './mlb-tree';
import {getVId, TreeAnalyzer} from './utils/tree-stats';
import {MiscMethods} from './viewers/misc';
import {TwinPviewer} from './viewers/twin-p-viewer';
import {VdRegion} from '@datagrok-libraries/bio/src/vd-regions';
import {_properties, _startInit} from './package';
import {MlbEvents} from './const';
import {Tree3Browser} from './tree3';

import {_package} from './package';

type FilterDesc = { type: string, column?: string, label?: string, [p: string]: any };

export class MolecularLiabilityBrowser {
  dataLoader: DataLoader;

  // uriParser: HTMLAnchorElement;
  baseUri: string = '/apps/MolecularLiabilityBrowser/MolecularLiabilityBrowser/';
  urlParams: URLSearchParams = new URLSearchParams();

  antigenDf: DG.DataFrame;
  pf: FilterPropertiesType;
  antigenName: string;
  schemeName: string;
  cdrName: string;
  treeName?: string;

  schemeChoices: string[] = [];
  cdrChoices: string[] = [];

  /** Current antibody selected molecule */
  vid: string | null = null;

  refDf?: DG.DataFrame; // from file ptm_in_cdr.d42
  hChainDf?: DG.DataFrame;
  lChainDf?: DG.DataFrame;

  vids: string[] = [];
  vidsObsPTMs: string[] = [];

  allVids?: DG.Column;
  allIds: DG.Column | null;
  idMapping: { [key: string]: string []; };

  subs: Unsubscribable[] = [];

  mlbView: DG.TableView | null = null;
  mlbGrid: DG.Grid;
  mlbGridDn: DG.DockNode;
  filterHost: HTMLElement;
  filterHostDn: DG.DockNode;
  filterView: DG.FilterGroup | null = null;
  filterViewDn: DG.DockNode | null = null;
  regionsViewer: VdRegionsViewer;
  treeBrowser: TreeBrowser;
  tree3Browser: Tree3Browser;
  twinPviewer: TwinPviewer;

  reloadIcon: HTMLElement;
  antigenInput: DG.InputBase<string>;
  antigenClonesInput: DG.InputBase<boolean | null>;
  antigenPopup: HTMLElement;
  schemeInput: DG.InputBase<string | null | undefined>;
  cdrInput: DG.InputBase<string | null | undefined>;
  treeInput: DG.InputBase<string>;
  treePopup: HTMLElement;
  treeGrid: DG.Grid;
  hideShowIcon: HTMLElement;

  constructor(dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
  }

  async init(urlParams: URLSearchParams) {
    try {
      //remove
      this.urlParams = urlParams;

      this.pf = this.dataLoader.filterProperties;

      this.antigenDf = this.dataLoader.antigens;
      if (!this.antigenDf) {
        const msg: string = `Get antigen list failed.`;
        grok.shell.error(msg);
        throw new Error(msg);
      }

      this.schemeChoices = this.dataLoader.schemes;
      this.cdrChoices = this.dataLoader.cdrs;

      this.antigenName = ((): string => {
        const antigenUrlParam = this.urlParams.get('antigen');
        // By default, if antigen is not specified in the url
        // we display the beautiful one 'IAPW8' (with a spreading tree)
        return antigenUrlParam || (_properties['DataSource']) == DataLoaderType.Test ? 'A1' : 'IAPW8';
      })();

      this.schemeName = ((): string => {
        const schemeUrlParam: string = this.urlParams.get('scheme') ?? 'no value';
        return this.schemeChoices.includes(schemeUrlParam) ? schemeUrlParam : this.schemeChoices[0];
      })();
      this.cdrName = ((): string => {
        const cdrUrlParam: string = this.urlParams.get('cdr') ?? 'no value';
        return this.cdrChoices.includes(cdrUrlParam) ? cdrUrlParam : this.cdrChoices[0];
      })();

      this.treeName = ((): string | undefined => {
        const treeUrlParam: string | undefined = this.urlParams.get('tree') ?? undefined;
        return treeUrlParam;
      })();

      this.vids = this.dataLoader.vids;
      this.vidsObsPTMs = this.dataLoader.vidsObsPtm;

      if (!this.vid)
        this.vid = this.vids[0];

      let t1;
      let t2;

      t1 = Date.now();
      await this.loadData();
      t2 = Date.now();
      console.debug(`MLB: Data loaded, ${((t2 - t1) / 1000).toString()} s`);

      t1 = Date.now();
      await this.setView();
      t2 = Date.now();
      console.debug(`MLB: View set, ${((t2 - t1) / 1000).toString()} s`);

      t1 = Date.now();
      this.setViewFilters();
      t2 = Date.now();
      console.debug(`MLB: Filters set, ${((t2 - t1) / 1000).toString()} s`);

      t1 = Date.now();
      await this.setViewTwinPViewer();
      t2 = Date.now();
      console.debug(`MLB: TwinP set, ${((t2 - t1) / 1000).toString()} s`);
    } catch (err: unknown) {
      if (err instanceof Error)
        console.error(err);
      else
        console.error((err as Object).toString());
    } finally {
      grok.events.onViewRemoved.subscribe((v) => {
        if (v.type === DG.VIEW_TYPE.TABLE_VIEW && (v as DG.TableView).dataFrame.id === this.mlbDf.id)
          this.subs.forEach((s) => s.unsubscribe());
      });
    }
  }

  setReloadInput(): HTMLElement {
    this.reloadIcon = ui.tooltip.bind(ui.iconFA('reload', () => {
      // window.setTimeout is used to adapt call async loadData() from handler (not async)
      window.setTimeout(async () => { await this.loadData(); }, 10);
    }), 'Reload');
    this.reloadIcon.classList.value = 'grok-icon reload';

    return this.reloadIcon;
  }

  setAntigenInput(agDf: DG.DataFrame): DG.InputBase {
    this.antigenInput = ui.stringInput('AG', '', null,
      {clearIcon: true, escClears: true, placeholder: this.antigenName ?? 'antigen filter'});
    this.antigenClonesInput = ui.boolInput('clones', false);
    ui.tooltip.bind(this.antigenClonesInput.root, 'Filter antigens with clones');

    const agCol: DG.Column = agDf.getCol('antigen');
    const gsCol: DG.Column = agDf.getCol('antigen_gene_symbol');
    const clonesCol: DG.Column = agDf.getCol('clones');
    const agDfGrid: DG.Grid = agDf.plot.grid({
      allowEdit: false,
      allowRowSelection: false,
      allowRowResizing: false,
      allowRowReordering: false,
      allowColReordering: false,
      allowBlockSelection: false,
      showRowHeader: false,
    });
    const idGCol: DG.GridColumn = agDfGrid.col('id')!;
    const agGCol: DG.GridColumn = agDfGrid.col('antigen')!;
    const ncbiGCol: DG.GridColumn = agDfGrid.col('antigen_ncbi_id')!;
    const gsGCol: DG.GridColumn = agDfGrid.col('antigen_gene_symbol')!;
    const clonesGCol: DG.GridColumn = agDfGrid.col('clones')!;
    agGCol.name = 'Antigen';
    agGCol.width = 90;
    gsGCol.name = 'Gene symbol';
    gsGCol.width = 120;
    idGCol.visible = false;
    ncbiGCol.visible = false;
    clonesGCol.name = 'Cl';
    clonesGCol.width = 20;
    agDfGrid.root.style.setProperty('width', '240px');
    this.antigenPopup = ui.div([agDfGrid.root]);

    // Do not push to this.viewSubs to prevent unsubscribe on this.destroyView()
    this.subs.push(agDf.onCurrentRowChanged.subscribe(() => {
      this.antigenPopup!.hidden = true;

      const antigenName: string = agCol.get(agDf.currentRow.idx);
      // window.setTimeout is used to adapt call async loadData() from handler (not async)
      this.onAntigenChanged(antigenName);
    }));

    const antigenFilterCallback = () => {
      if (!this.antigenInput || !this.antigenClonesInput)
        return;

      console.debug('MLB: MolecularLiabilityBrowser.setAntigenInput.antigenFilterCallback() ' +
        `this.antigenInput.value = '${this.antigenInput.value}', ` +
        `this.antigenClonesFilterInput.value = ${this.antigenClonesInput.value}`);

      const antigenInputValue: string = this.antigenInput.value;
      const antigenClonesInputValue: boolean = this.antigenClonesInput.value ?? false;

      /* Here we filter dataframe with antigens */
      agDf.filter.init((iRow: number) => {
        return (
          agCol.get(iRow).includes(antigenInputValue) ||
          gsCol.get(iRow).includes(antigenInputValue)
        ) && (!antigenClonesInputValue || clonesCol.get(iRow) > 0);
      });
    };
    this.subs.push(this.antigenInput.onInput(antigenFilterCallback));
    this.subs.push(this.antigenClonesInput.onInput(antigenFilterCallback));

    // this.agInput.root.addEventListener('focusout', (event: FocusEvent) => {
    //   let k = 11;
    //   agDfGrid.root.focus();
    // });
    // this.agInput.root.addEventListener('keydown', (event: KeyboardEvent) => {
    //   if (event.code === '\t') {
    //     let k = 11;
    //   }
    // });

    this.antigenInput.root.addEventListener('mousedown', (event: MouseEvent) => {
      this.antigenPopup!.hidden = false;
      ui.showPopup(this.antigenPopup!, this.antigenInput!.root);
    });

    return this.antigenInput;
  }

  setSchemeInput(): DG.InputBase {
    this.schemeInput = ui.choiceInput('Scheme', this.schemeName, this.schemeChoices!, () => {
      // this.regionsViewer.setScheme(this.schemeInput.value);
      this.onSchemeChanged(this.schemeInput.value!);
    });

    return this.schemeInput;
  }

  setCdrInput(): DG.InputBase {
    this.cdrInput = ui.choiceInput('CDR', this.cdrName, this.cdrChoices, () => {
      this.onCdrChanged(this.cdrInput.value!);
    });

    return this.cdrInput;
  }

  setTreeInput(): DG.InputBase {
    this.treeInput = ui.stringInput('Tree', this.treeName ?? '', null, {});

    const tempDf = DG.DataFrame.fromCsv('');

    this.treePopup = ui.div([this.treeGrid.root]);

    this.treeInput.root.addEventListener('mousedown', (event: MouseEvent) => {
      this.treePopup.hidden = false;
      ui.showPopup(this.treePopup, this.treeInput.root);
    });

    return this.treeInput;
  }

  setHideShowIcon(): void {
    this.hideShowIcon = ui.tooltip.bind(ui.iconFA('eye', () => {
      if (this.hideShowIcon.classList.value.includes('fa-eye-slash'))
        grok.events.fireCustomEvent('showAllDock', null);
      else
        grok.events.fireCustomEvent('closeAllDock', null);
    }), 'show structure');
    this.hideShowIcon.classList.value = 'grok-icon fal fa-eye';

    grok.events.onCustomEvent('closeAllDock').subscribe(async () => {
      await this.twinPviewer.close(this.mlbView!);
      this.hideShowIcon.classList.value = 'grok-icon fal fa-eye-slash';
    });

    grok.events.onCustomEvent('showAllDock').subscribe(async (v) => {
      await this.twinPviewer.open(this.mlbView!);
      this.hideShowIcon.classList.value = 'grok-icon fal fa-eye';
    });
  }

  setRibbonPanels(): void {
    this.mlbView!.ribbonMenu.clear();

    this.setReloadInput();
    this.setAntigenInput(this.antigenDf);
    this.setSchemeInput();
    this.setCdrInput();
    this.setTreeInput();
    this.setHideShowIcon();

    this.mlbView!.setRibbonPanels([
      [this.reloadIcon],
      [],
      [this.antigenInput.root, this.antigenClonesInput.root],
      [this.schemeInput.root],
      [this.cdrInput.root],
      [],
      [this.treeInput.root],
      [],
      [this.hideShowIcon],
    ]);
  }

  // -- static --

  private static getViewPath(urlParams: URLSearchParams, baseUri: string) {
    const urlParamsTxt = Array.from(urlParams.entries())
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');

    return `${baseUri}?${urlParamsTxt}`;
  }

  static prepareDataMlbDf(
    df: DG.DataFrame, hChainDf: DG.DataFrame, lChainDf: DG.DataFrame,
    antigen: string, numberingScheme: string, pf: FilterPropertiesType
  ): DG.DataFrame {
    console.debug('MLB: MolecularLiabilityBrowser.prepareDataMlbDf() start, ' +
      `${((Date.now() - _startInit) / 1000).toString()} s`);

    for (const column of df.columns)
      column.name = column.name.replaceAll('_', ' ');

    // TODO: Obsolete filtering by antigen
    const mlbColumnsToMultiValue = ['antigen list', 'antigen ncbi id', 'antigen gene symbol'];
    for (const column of df.columns) {
      if (mlbColumnsToMultiValue.includes(column.name))
        column.setTag(DG.TAGS.MULTI_VALUE_SEPARATOR, ',');
    }

    // TODO: Load chains sequences
    console.debug(`MLB: hChainDf: ${hChainDf.rowCount} rows, lChainDf: ${lChainDf.rowCount} rows`);
    [{name: 'Heavy', df: hChainDf}, {name: 'Light', df: lChainDf}].forEach((chain) => {
      const seqCol = this.mergeSequenceColumns(chain.df, chain.name);
      grok.data.joinTables(
        df, chain.df,
        ['v id'], ['Id'],
        (df.columns as DG.ColumnList).names(), [seqCol.name],
        DG.JOIN_TYPE.LEFT, true);

      // crutch, because grok.data.joinTables() loses right table columns tags
      df.getCol(seqCol.name).setTag('positionNames', chain.df.getCol(seqCol.name).getTag('positionNames'));
      df.getCol(seqCol.name).setTag('numberingScheme', numberingScheme);
    });

    // Adding columns after tableView breaks display (no columns show)
    const clonesCol = df.columns.addNewString('clones');

    //bands on plots for properties
    for (let i = 0; i < pf.names.length; i++) {
      df.col(pf.names[i])!.setTag(
        '.default-filter', '{ "min": ' + pf.yellowLeft[i] + ', "max": ' + pf.yellowRight[i] + ' }');
      // this.mlbTable.col(pf.names[i])!.setTag('.default-filter', JSON.stringify(
      //   {
      //     min: pf.yellowLeft[i],
      //     max: pf.yellowRight[i]
      //   }));
      df.col(pf.names[i])!.setTag('.charts', JSON.stringify([
        {
          title: 'BandYellowLeft', type: 'band',
          rule: `${pf.redLeft[i]}-${pf.yellowLeft[i]}`,
          color: '#FFD700', opacity: 15
        },
        {
          title: 'BandYellowRight', type: 'band',
          rule: `${pf.yellowRight[i]}-${pf.redRight[i]}`,
          color: '#FFD700', opacity: 15
        },
        {title: 'BandRedLeft', type: 'band', rule: `< ${pf.redLeft[i]}`, color: '#DC143C', opacity: 15},
        {title: 'BandRedRight', type: 'band', rule: `> ${pf.redRight[i]}`, color: '#DC143C', opacity: 15},
        {
          'title': 'TAP metrics', 'type': 'spline',
          'color': '#7570B3', 'width': 1, 'normalize-y': true, 'visible': true,
          'x': pf.plotsX[i], 'y': pf.plotsY[i],
        }
      ]));
    }

    console.debug('MLB: MolecularLiabilityBrowser.prepareDataMlbDf() end, ' +
      `${((Date.now() - _startInit) / 1000).toString()} s`);

    return df;
  }

  static prepareDataTreeDf(df: DG.DataFrame, treeColumnName: string = 'TREE') {
    function _modifyTreeNodeIds(nwk: string): string {
      // shortening tree leaf id on fly is incorrect, or it should/can be performed on data level
      // if (TreeAnalyzer.newickRegEx.test(nwk.trim()))
      //   return getVId(nwk);

      return nwk;
    }

    const treeCol = df.getCol(treeColumnName);
    const trees = treeCol.toList().map((v) => _modifyTreeNodeIds(v));
    (df.columns as DG.ColumnList).replace(treeColumnName, DG.Column.fromStrings(treeColumnName, trees));

    return df;
  }

  /** Builds multiple alignment sequences from monomers in positions
   *  as virtual (calculated) column in source DataFrame.
   * @param {DG.DataFrame} df  DataFrame with ANARCI results
   * @param {string} chain  Name of chain (used for result column name)
   * @param {number} startingColumnIndex  The first column with positions
   * @return {DG.Column}
   */
  static mergeSequenceColumns(df: DG.DataFrame, chain: string, startingColumnIndex?: number) {
    const positionRegExp = /^\d+[A-Z]*$/g;
    const columns: DG.ColumnList = df.columns;

    // All positions schemes contains position '1'
    const positionNames = startingColumnIndex !== void 0 ? columns.names().slice(startingColumnIndex) :
      columns.names().slice(columns.names().indexOf('1'));

    const positionColumns = positionNames.filter((v: string) => v.match(positionRegExp) !== null);
    const seqCol = columns.addNewVirtual(
      `${chain} chain sequence`,
      (i: number) => positionColumns.map((v) => df.get(v, i)).join('')
    );
    seqCol.semType = DG.SEMTYPE.MACROMOLECULE;
    seqCol.setTag(DG.TAGS.UNITS, 'fasta');
    seqCol.setTag('alphabet', 'PT');
    seqCol.setTag('aligned', 'SEQ.MSA');
    seqCol.setTag('separator', '');
    seqCol.setTag('gap.symbol', '-');

    const positionNamesTxt = positionNames.join(', '); /* Spaces are for word wrap */
    seqCol.setTag('positionNames', positionNamesTxt);

    return seqCol;
  }

  // -- View --

  private _mlbDf: DG.DataFrame = DG.DataFrame.fromObjects([])!;
  private _regions: VdRegion[] = [];
  private _treeDf: DG.DataFrame = DG.DataFrame.fromObjects([])!;
  private _predictedPtmDf: DG.DataFrame;
  private _observedPtmDf: DG.DataFrame;

  private viewSubs: Unsubscribable[] = [];

  get mlbDf(): DG.DataFrame { return this._mlbDf; }

  get regions(): VdRegion[] { return this._regions; }

  get treeDf(): DG.DataFrame { return this._treeDf; }

  get predictedPtmDf(): DG.DataFrame { return this._predictedPtmDf; }

  get observedPtmDf(): DG.DataFrame { return this._observedPtmDf; }

  async setData(
    mlbDf: DG.DataFrame, treeDf: DG.DataFrame, regions: VdRegion[],
    predictedPtmDf: DG.DataFrame, observedPtmDf: DG.DataFrame
  ): Promise<void> {
    console.debug(`MLB: MolecularLiabilityBrowser.setData() start, ${((Date.now() - _startInit) / 1000).toString()} s`);
    await this.destroyView();
    this._mlbDf = mlbDf;

    this._treeDf = treeDf;
    this._regions = regions;
    this._predictedPtmDf = predictedPtmDf;
    this._observedPtmDf = observedPtmDf;

    await this.buildView();

    console.debug(`MLB: MolecularLiabilityBrowser.setData() end, ${((Date.now() - _startInit) / 1000).toString()} s`);
  }

  /** Sets controls' layout. Called once from init(). */
  async setView(): Promise<void> {
    grok.shell.windows.showProperties = false;
    grok.shell.windows.showHelp = false;

    this.mlbView!.name = 'Molecular Liability Browser';
    for (const column of this.mlbDf.columns) {
      const gridColumn: DG.GridColumn = this.mlbView!.grid.columns.byName(column.name)!;
      gridColumn.name = column.name.replaceAll('_', ' ');
    }

    this.mlbView!.grid.columns.byName('v id')!.width = 120;
    this.mlbView!.grid.columns.byName('v id')!.cellType = 'html';

    //table visual polishing
    this.subs.push(
      this.mlbView!.grid.onCellRender.subscribe((args: DG.GridCellRenderArgs) => {
        if (args.cell.isColHeader) {
          if (args.cell.gridColumn.visible) {
            const textSize = args.g.measureText(args.cell.gridColumn.name);
            args.g.fillText(args.cell.gridColumn.name, args.bounds.x +
              (args.bounds.width - textSize.width) / 2, args.bounds.y +
              (textSize.fontBoundingBoxAscent + textSize.fontBoundingBoxDescent));
            args.g.fillStyle = '#4b4b4a';
          }
          args.preventDefault(); // this is required to prevent drawing headers of hidden columns
        }
      }));

    this.mlbView!.grid.onCellPrepare((gc) => {
      if (gc.isTableCell && gc.gridColumn.name === 'v id') {
        if (this.vids.includes(gc.cell.value.toString())) {
          gc.style.element = ui.divV(
            [ui.link(gc.cell.value.toString(), () => {
              this.vid = gc.cell.value;
              this.changeVid();
            })],
            {style: {position: 'absolute', top: 'calc(50% - 8px)', left: '5px'}});
        } else {
          gc.style.element = ui.divV([ui.label(gc.cell.value.toString())],
            {style: {position: 'absolute', top: 'calc(50% - 8px)', left: '5px'}});
        }
      }
    });

    // set width for columns of properties filter
    for (const pfName of this.pf.names) {
      const gc: DG.GridColumn | null = this.mlbGrid.col(pfName);
      if (gc) gc.width = 150;
    }
  }

  setViewFilters(): void {
    // Recreate filterView on every destroyView/buildView
    // const filterList: FilterDesc[] = MolecularLiabilityBrowser.buildFilterList(this.pf);
    // this.filterView = this.mlbView.filters({filters: filterList}) as DG.FilterGroup;
    // this.filterViewDn = this.mlbView.dockManager.dock(this.filterView, DG.DOCK_TYPE.LEFT, null, 'Filters', 0.25);

    grok.events.onTooltipShown.subscribe((args) => {
      if (args.args.context instanceof DG.Column) {
        const colName: string = args.args.context.name;
        switch (colName) {
        case 'cdr length':
          args.args.element.innerHTML = this.pf.tooltips[0];
          break;

        case 'surface cdr hydrophobicity':
          args.args.element.innerHTML = this.pf.tooltips[1];
          break;

        case 'positive cdr charge':
          args.args.element.innerHTML = this.pf.tooltips[2];
          break;

        case 'negative cdr charge':
          args.args.element.innerHTML = this.pf.tooltips[3];
          break;

        case 'sfvcsp':
        case 'SFvCSP':
          args.args.element.innerHTML = this.pf.tooltips[4];
          break;

        default:
          console.error('MolecularLiabilityBrowser.setViewFilters() onToolTipShown() ' +
            `unexpected context name - ${colName}`);
          break;
        }
      }
    });
  }

  private static buildFilterList(
    pf: FilterPropertiesType, cdrName: string, predictedPtmCsv: string, observedPtmCsv: string
  ): FilterDesc[] {
    const filterList: FilterDesc[] = [];

    for (const pfName of pf.names)
      filterList.push({type: 'histogram', column: pfName});

    filterList.push({
      type: 'MolecularLiabilityBrowser:ptmFilter',
      currentCdr: cdrName,
      predictedPtm: predictedPtmCsv,
      observedPtm: observedPtmCsv
    });
    return filterList;
  }

  async setViewTwinPViewer(): Promise<void> {
    // const [jsonStr, pdbStr, jsonNums, jsonStrObsPtm]: [JsonType, string, NumsType, ObsPtmType] = (
    //   await Promise.all([
    //     this.dataLoader.loadJson(this.vid),
    //     this.dataLoader.loadPdb(this.vid),
    //     this.dataLoader.loadRealNums(this.vid),
    //     ((): Promise<ObsPtmType> => {
    //       let res: Promise<ObsPtmType> = null;
    //       if (this.vidsObsPTMs.includes(this.vid))
    //         res = this.dataLoader.loadObsPtm(this.vid);
    //       return res;
    //     })()
    //   ]));
    const [jsonStr, pdbStr, jsonNums, jsonStrObsPtm]:
      [JsonType, string, NumsType, ObsPtmType] = await this.dataLoader.load3D(this.vid!);

    const hNumberingStr = jsonNums.heavy_numbering;
    const lNumberingStr = jsonNums.light_numbering;

    const hNumbering = [];
    const lNumbering = [];

    for (let i = 0; i < hNumberingStr.length; i++)
      hNumbering.push(parseInt(hNumberingStr[i].replaceAll(' ', '')));

    for (let i = 0; i < lNumberingStr.length; i++)
      lNumbering.push(parseInt(lNumberingStr[i].replaceAll(' ', '')));

    jsonStr['map_H'] = hNumbering;
    jsonStr['map_L'] = lNumbering;

    this.twinPviewer = new TwinPviewer(this.dataLoader);
    this.twinPviewer.init(jsonStr, pdbStr, jsonStrObsPtm);

    await this.twinPviewer.open(this.mlbView!);
    await this.twinPviewer.show(this.mlbView!);

    grok.events.fireCustomEvent(MlbEvents.CdrChanged, this.cdrName);
  }

  async destroyView(): Promise<void> {
    console.debug('MLB: MolecularLiabilityBrowser.destroyView() start, ' +
      `${((Date.now() - _startInit) / 1000).toString()} s`);

    this.viewSubs.forEach((sub) => sub.unsubscribe());
    this.viewSubs = [];

    // DG.TableView.dataFrame cannot be null
    // if (this.mlbView !== null)
    //    this.mlbView.dataFrame = null;

    // this.mlbView.dockManager.rootNode.removeChild(this.filterViewDn);

    if (this.filterView !== null && this.filterViewDn != null) {
      try {
        this.filterView.close();
      } catch { /* skip the erroneous exception /**/ }
      this.filterView.removeFromView();
      this.filterViewDn.detachFromParent();
      this.filterView = null;
      this.filterViewDn = null;
    }

    this.idMapping = {};
    this.allIds = null;
    this.allVids = undefined;

    console.debug('MLB: MolecularLiabilityBrowser.destroyView() end, ' +
      `${((Date.now() - _startInit) / 1000).toString()} s`);
  }

  async buildView(): Promise<void> {
    try {
      console.debug('MLB: MolecularLiabilityBrowser.buildView() start, ' +
        `${((Date.now() - _startInit) / 1000).toString()} s`);

      this.allVids = this.mlbDf.getCol('v id');
      this.allIds = this.mlbDf.col('gdb id mappings');

      this.idMapping = {};
      if (this.allIds) {
        for (let i = 0; i < this.allVids.length; i++) {
          const ids: string[] = this.allIds.get(i).replaceAll(' ', '').split(',');
          this.idMapping[this.allVids.get(i)] = ids;
        }
      }

      if (this.mlbView === null) {
        // this.mlbView = grok.shell.addView();
        this.mlbDf.name = 'Molecular Liability Browser'; // crutch for window/tab name support
        this.mlbView = grok.shell.addTableView(this.mlbDf);
        this.mlbGrid = this.mlbView.grid;

        this.mlbGridDn = this.mlbView.dockManager.findNode(this.mlbGrid.root);
        this.filterHost = ui.box();
        this.filterHostDn = this.mlbView.dockManager.dock(
          this.filterHost, DG.DOCK_TYPE.LEFT, this.mlbGridDn, '', 0.18);

        this.treeGrid = this.treeDf.plot.grid({
          allowEdit: false,
          allowRowSelection: false,
          allowRowResizing: false,
          allowRowReordering: false,
          allowColReordering: false,
          allowBlockSelection: false,
          showRowHeader: false,
        });

        this.treeBrowser = (await this.treeDf.plot.fromType('MlbTree', {})) as unknown as TreeBrowser;
        this.mlbView.dockManager.dock(this.treeBrowser.root, DG.DOCK_TYPE.FILL, this.mlbGridDn, 'Clone');
        //TODO: check the await
        await this.treeBrowser.setData(this.treeDf, this.mlbDf);// fires treeDfOnCurrentRowChanged
        //this.mlbView.dockManager.dock(this.treeBrowser, DG.DOCK_TYPE.RIGHT, null, 'Clone', 0.5);

        const tempDf: DG.DataFrame = DG.DataFrame.fromObjects([{}])!;
        const t1: number = Date.now();
        this.regionsViewer = (await tempDf.plot.fromType(
          'VdRegions', {skipEmptyPositions: true})) as unknown as VdRegionsViewer;
        const t2: number = Date.now();
        console.debug('MLB: MolecularLiabilityBrowser.buildView(), create regionsViewer ' +
          `ET: ${((t2 - t1) / 1000).toString()} s`);

        this.setRibbonPanels();
      } else {
        //this.mlbView.dataFrame = this.mlbDf;
        this.mlbGrid.dataFrame = this.mlbDf;
        this.mlbGrid.dataFrame.filter.setAll(true);
        const k = 11;

        this.treeGrid.dataFrame = this.treeDf;

        //TODO: check the await
        await this.treeBrowser.setData(this.treeDf, this.mlbDf);
      }

      // await this.dataLoader.refDfPromise;
      const filterList: FilterDesc[] = MolecularLiabilityBrowser.buildFilterList(
        this.pf, this.cdrName, this.predictedPtmDf.toCsv(), this.observedPtmDf.toCsv());
      this.filterView = this.mlbView.filters({filters: filterList}) as DG.FilterGroup;
      this.filterViewDn = this.mlbView.dockManager.dock(
        this.filterView, DG.DOCK_TYPE.FILL, this.filterHostDn, 'Filter in box');
      // const newFilterViewDn: DG.DockNode = this.mlbView.dockManager.dock(newFilterView, DG.DOCK_TYPE.LEFT,
      //   this.mlbGridDn, 'Filters', 0.18);
      this.filterView.dataFrame = this.mlbDf;

      this.viewSubs.push(this.treeDf.onCurrentRowChanged.subscribe(this.treeDfOnCurrentRowChanged.bind(this)));

      // if (this.tree3Browser === null) {
      //   //let path = _package.webRoot +
      //   //   'src/examples/AB_AG_data_PSMW30_db-pass_parse-select_clone-pass_germ-pass_igphyml-pass.csv';
      //   const treeCsv = await _package.files.readAsText('tree3.csv');
      //   const df = DG.DataFrame.fromCsv(treeCsv);
      //   this.tree3Browser = new Tree3Browser();
      //   await this.tree3Browser.init(df, this.mlbView);
      // } else {
      //   //await this.treeBrowser.setData(this.treeDf, this.mlbDf);
      // }

      // regionsViewer
      this.mlbView.dockManager.dock(this.regionsViewer.root, DG.DOCK_TYPE.DOWN, this.mlbGridDn, 'Regions', 0.3);
      //TODO: check the await
      await this.regionsViewer.setDf(this.mlbDf, this.regions);

      this.updateView();

      this.viewSubs.push(this.mlbDf.onCurrentRowChanged.subscribe(this.onMLBGridCurrentRowChanged.bind(this)));
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : (err as Object).toString());
    } finally {
      console.debug('MLB: MolecularLiabilityBrowser.buildView() end, ' +
        `${((Date.now() - _startInit) / 1000).toString()} s`);
    }
  }

  /** Restores column hiding, sets view path after dataFrame replacement. */
  updateView() {
    console.debug('MLB: MolecularLiabilityBrowser.updateView() start,' +
      `${((Date.now() - _startInit) / 1000).toString()} s`);

    this.mlbView!.path = MolecularLiabilityBrowser.getViewPath(this.urlParams, this.baseUri);

    // Leonid instructed to hide the columns
    const mlbColumnsToHide: string[] = [
      ...['cdr length', 'surface cdr hydrophobicity', 'positive cdr charge', 'negative cdr charge', 'SFvCSP'],
      ...['antigen list', 'antigen ncbi id', 'antigen gene symbol'],
      ...['Heavy chain sequence', 'Light chain sequence'],
    ];
    for (let colI = 0; colI < this.mlbView!.grid.columns.length; colI++) {
      const gridColumn: DG.GridColumn = this.mlbView!.grid.columns.byIndex(colI)!;
      if (gridColumn.column !== null && mlbColumnsToHide.includes(gridColumn.column.name))
        gridColumn.visible = false;
    }

    this.updateViewTreeBrowser();

    console.debug('MLB: MolecularLiabilityBrowser.updateView() end,' +
      `${((Date.now() - _startInit) / 1000).toString()} s`);
  }

  updateViewTreeBrowser() {
    const treeIndex = this.treeDf.getCol('CLONE').toList().findIndex((v) => v == this.treeName);
    if (this.treeDf.rowCount > 0) {
      const treeDfIndex = treeIndex !== -1 ? treeIndex : 0;
      this.treeDf.currentRowIdx = treeDfIndex;
      this.treeBrowser.selectTree(treeDfIndex);
      this.treeName = this.treeDf.get('CLONE', treeDfIndex);
    }
  }

  onMLBGridCurrentRowChanged(args: any) {
    this.vid = this.mlbDf.currentRow['v id'];
    // window.setTimeout is used to adapt call async changeVid() from handler (not async)
    window.setTimeout(async () => { await this.changeVid(true); }, 10);
  }

  onAntigenChanged(antigenName: string): void {
    console.debug(`MLB: MolecularLiabilityBrowser.onAntigenChanged( antigenName = '${antigenName}' )`);
    this.antigenName = antigenName;

    // Preventing firing the event
    this.antigenInput.input.setAttribute('placeholder', this.antigenName ?? 'antigen filter');
    this.antigenInput.value = '';

    this.urlParams.set('antigen', this.antigenName);
    // window.setTimeout is used to adapt call async loadData() from handler (not async)
    window.setTimeout(async () => { await this.loadData(); }, 10);

    // const treeDf: DG.DataFrame = await this.dataLoader.getTreeByAntigen(this.antigenName);
    // this.treeBrowser.treeDf = treeDf;
  }

  onSchemeChanged(schemeName: string): void {
    this.schemeName = schemeName;

    // Preventing firing the event
    if (this.schemeInput!.value != this.schemeName)
      this.schemeInput!.value = this.schemeName;

    this.urlParams!.set('scheme', this.schemeName);
    // window.setTimeout is used to adapt call async loadData() from handler (not async)
    window.setTimeout(async () => { await this.loadData(); }, 10);
  }

  onCdrChanged(cdrName: string): void {
    this.cdrName = cdrName;
    if (this.cdrInput!.value != this.cdrName)
      this.cdrInput!.value = this.cdrName;

    this.urlParams!.set('cdr', this.cdrName);
    // window.setTimeout is used to adapt call async loadData() from handler (not async)
    window.setTimeout(async () => {
      await this.loadData()
        .then(() => {
          grok.events.fireCustomEvent(MlbEvents.CdrChanged, this.cdrName);
        })
        .catch((e) => {
          console.error(e);
        });
    }, 10);
  }

  onTreeChanged(treeName: string): void {
    this.treeName = treeName;
    if (this.treeInput!.value != this.treeName)
      this.treeInput!.value = this.treeName;

    this.urlParams!.set('tree', this.treeName);
    this.mlbView!.path = MolecularLiabilityBrowser.getViewPath(this.urlParams, this.baseUri);

    this.updateViewTreeBrowser();
  }

  onVidChanged(vid: string): void {
    this.vid = vid;

    this.urlParams.set('vid', this.vid);

    // window.setTimeout is used to adapt call async changeVid() from handler (not async)
    window.setTimeout(async () => { await this.changeVid(); }, 10);
  }

  /** Loads MLB data and sets prepared DataFrame. Calls setData() -> destroyView(), buildView(). */
  async loadData(): Promise<void> {
    const pi = DG.TaskBarProgressIndicator.create('Loading data...');
    try {
      const t1 = Date.now();
      const [mlbDf, hChainDf, lChainDf, treeDf, regions, predictedPtmDf, observedPtmDf]:
        [DG.DataFrame, DG.DataFrame, DG.DataFrame, DG.DataFrame, VdRegion[], DG.DataFrame, DG.DataFrame] =
        await Promise.all([
          this.dataLoader.getMlbByAntigen(this.antigenName),
          this.dataLoader.getAnarci(this.schemeName, 'heavy', this.antigenName),
          this.dataLoader.getAnarci(this.schemeName, 'light', this.antigenName),
          this.dataLoader.getTreeByAntigen(this.antigenName),
          this.dataLoader.getLayoutBySchemeCdr(this.schemeName, this.cdrName),
          this.dataLoader.getPredictedPtmByAntigen(this.antigenName),
          this.dataLoader.getObservedPtmByAntigen(this.antigenName),
        ])
          .catch((reason) => {
            grok.shell.error(reason.toString());
            throw reason;
          });
      const t2 = Date.now();
      console.debug(`MLB: MolecularLiabilityBrowser.loadData() load ET, ${((t2 - t1) / 1000).toString()} s`);

      await this.setData(
        MolecularLiabilityBrowser.prepareDataMlbDf(mlbDf, hChainDf, lChainDf,
          this.antigenName, this.schemeName, this.pf),
        MolecularLiabilityBrowser.prepareDataTreeDf(treeDf),
        regions,
        predictedPtmDf,
        observedPtmDf
      );

      const t3 = Date.now();
      console.debug(`MLB: MolecularLiabilityBrowser.loadData() prepare ET, ${((t3 - t2) / 1000).toString()} s`);
    } catch (err: unknown) {
      if (err instanceof Error)
        console.error(err);
      else
        console.error((err as Object).toString());
    } finally {
      pi.close();
    }
  }

  // --

  async changeVid(silent: boolean = false): Promise<void> {
    if (!this.vid || !this.vids.includes(this.vid)) {
      if (this.vid) {
        Object.keys(this.idMapping).every((vid) => {
          if (this.idMapping[vid].includes(this.vid!)) {
            this.vid = vid; // side effect
            return false;
          }
          return true;
        });
      }

      if (!this.vid || !this.vids.includes(this.vid)) {
        grok.shell.warning('No PDB data data for associated v id');
        return;
      }
    }

    // this.mlbView.path = `/Table/${this.vIdInput.value}`;
    //hideShowIcon.classList.value = 'grok-icon fal fa-eye';
    const pi = DG.TaskBarProgressIndicator.create('Creating 3D view');

    const [jsonStr, pdbStr, jsonNums, jsonStrObsPtm]:
      [JsonType, string, NumsType, ObsPtmType] = await this.dataLoader.load3D(this.vid);

    const hNumberingStr = jsonNums.heavy_numbering;
    const lNumberingStr = jsonNums.light_numbering;

    const hNumbering = [];
    const lNumbering = [];

    for (let i = 0; i < hNumberingStr.length; i++)
      hNumbering.push(parseInt(hNumberingStr[i].replaceAll(' ', '')));

    for (let i = 0; i < lNumberingStr.length; i++)
      lNumbering.push(parseInt(lNumberingStr[i].replaceAll(' ', '')));

    jsonStr['map_H'] = hNumbering;
    jsonStr['map_L'] = lNumbering;

    await this.twinPviewer.reset(jsonStr, pdbStr, jsonStrObsPtm);
    await this.twinPviewer.show(this.mlbView!);
    await this.twinPviewer.open(this.mlbView!);

    pi.close();
  };

  // -- Handle controls' events --

  treeDfOnCurrentRowChanged(): void {
    if (this.treePopup)
      this.treePopup.hidden = true;

    const treeName = this.treeDf.get('CLONE', this.treeDf.currentRowIdx);
    this.onTreeChanged(treeName);
  }
}
