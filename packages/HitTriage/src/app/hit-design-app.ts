import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {HitDesignCampaign, HitDesignTemplate, HitTriageCampaignStatus} from './types';
import {HitDesignInfoView} from './hit-design-views/info-view';
import {CampaignIdKey, CampaignJsonName, CampaignTableName, EmptyStageCellValue, HitDesignCampaignIdKey,
  HitDesignMolColName, TileCategoriesColName, ViDColName, i18n} from './consts';
import {calculateSingleCellValues, getNewVid} from './utils/calculate-single-cell';
import '../../css/hit-triage.css';
import {_package} from '../package';
import {addBreadCrumbsToRibbons, checkRibbonsHaveSubmit, modifyUrl, toFormatedDateString} from './utils';
import {HitDesignSubmitView} from './hit-design-views/submit-view';
import {HitDesignTilesView} from './hit-design-views/tiles-view';
import {HitAppBase} from './hit-app-base';
import {HitBaseView} from './base-view';
import {chemFunctionsDialog} from './dialogs/functions-dialog';
import {Subscription} from 'rxjs';

export class HitDesignApp extends HitAppBase<HitDesignTemplate> {
  multiView: DG.MultiView;

  private _infoView: HitDesignInfoView;
  private _designView?: DG.TableView;
  public _submitView?: HitDesignSubmitView;
  private _tilesView?: HitDesignTilesView;
  private _tilesViewTab: DG.ViewBase | null = null;
  private _designViewName = 'Design';
  private _filePath = 'System.AppData/HitTriage/Hit Design/campaigns';
  private _campaignId?: string;
  private _dfName?: string;
  private _molColName: string = HitDesignMolColName;
  private _campaign?: HitDesignCampaign;
  public campaignProps: {[key: string]: any} = {};
  private processedValues: string[] = [];
  private _extraStageColsCount = 0;

  private currentDesignViewId?: string;
  private currentTilesViewId?: string;
  public mainView: DG.ViewBase;
  constructor(c: DG.FuncCall) {
    super(c);
    this._infoView = new HitDesignInfoView(this);
    this.multiView = new DG.MultiView({viewFactories: {[this._infoView.name]: () => this._infoView}});
    this.multiView.tabs.onTabChanged.subscribe((_) => {
      if (this.multiView.currentView instanceof HitBaseView)
        (this.multiView.currentView as HitBaseView<HitDesignTemplate, HitDesignApp>).onActivated();
    });
    this.multiView.parentCall = c;
    this.mainView = grok.shell.addView(this.multiView);
    grok.events.onCurrentViewChanged.subscribe(async () => {
      try {
        if (grok.shell.v?.name === this.currentDesignViewId || grok.shell.v?.name === this.currentTilesViewId) {
          grok.shell.windows.showHelp = false;

          this.setBaseUrl();
          modifyUrl(CampaignIdKey, this._campaignId ?? this._campaign?.name ?? '');
          if (grok.shell.v?.name === this.currentTilesViewId)
            await this._tilesView?.render();
          else
            this._tilesView?.destroy();

          const {sub} = addBreadCrumbsToRibbons(grok.shell.v, 'Hit Design', grok.shell.v?.name, () => {
            grok.shell.v = this.mainView;
            this._tilesView?.close();
            this._designView?.close();
            this._infoView.init();
            sub.unsubscribe();
          });
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  public async setTemplate(template: HitDesignTemplate, campaignId?: string) {
    if (!campaignId) {
      this._designView?.dataFrame && grok.shell.closeTable(this._designView.dataFrame);
      this._designView = undefined;
      campaignId = await this.getNewCampaignName('Hit Design/campaigns', template.key);
      modifyUrl(HitDesignCampaignIdKey, campaignId);
      this._filePath = `System.AppData/HitTriage/Hit Design/campaigns/${campaignId}/${CampaignTableName}`;
    } else {
      const fileLoc = 'System.AppData/HitTriage/Hit Design/campaigns';
      this._filePath = this.campaign?.savePath ?? `${fileLoc}/${campaignId}/${CampaignTableName}`;
      this.dataFrame = await grok.dapi.files.readCsv(this._filePath);
      if (this._campaign?.columnSemTypes) {
        Object.entries(this._campaign.columnSemTypes).forEach(([colName, semtype]) => {
          const col = this.dataFrame!.columns.byName(colName);
          if (col && semtype)
            col.semType = semtype;
        });
      }
      //await this.dataFrame.meta.detectSemanticTypes();
    }

    if (!this.dataFrame) {
      console.error('DataFrame is empty');
      return;
    }
    await this.dataFrame.meta.detectSemanticTypes();
    this._molColName = this.dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE)?.name ?? HitDesignMolColName;
    this._dfName = this.dataFrame.name ??= campaignId;
    this._campaignId = campaignId;
    this.template = template;

    this._submitView ??= new HitDesignSubmitView(this);
    grok.shell.windows.showHelp = false;
    //add empty rows to define stages, used for tile categories;
    //const stagesRow = this.dataFrame.getCol(TileCategoriesColName);
    // if (stagesRow) {
    //   const categories = stagesRow.categories;
    //   if (categories && categories.length) {
    //     template.stages.forEach((s) => {
    //       if (!categories.includes(s)) {
    //         const newRow = this.dataFrame!.rows.addNew();
    //         const idx = newRow.idx;
    //         this.dataFrame!.set(TileCategoriesColName, idx, s);
    //         this.dataFrame!.set(ViDColName, idx, EmptyStageCellValue);
    //       }
    //     });
    //   }
    // }
    //this.dataFrame.rows.filter((r) => r[ViDColName] !== EmptyStageCellValue);
    this._extraStageColsCount = this.dataFrame!.rowCount - this.dataFrame.filter.trueCount;
    const designV = grok.shell.addView(this.designView);
    this.currentDesignViewId = designV.name;
    this.setBaseUrl();
    modifyUrl(CampaignIdKey, this._campaignId ?? this._campaign?.name ?? '');
    if (this.campaign)
      this.campaign.template = template;
  }

  get campaignId(): string | undefined {return this._campaignId;}

  get designView(): DG.TableView {return this._designView = this.getDesignView();}

  get designViewName(): string {return this._designViewName;}

  get molColName() {
    return this._molColName ??= this.dataFrame?.columns.bySemType(DG.SEMTYPE.MOLECULE)?.name ?? HitDesignMolColName;
  }

  get campaign(): HitDesignCampaign | undefined {return this._campaign;}

  set campaign(campaign: HitDesignCampaign | undefined) {this._campaign = campaign;}

  private getDesignView(): DG.TableView {
    const subs: Subscription[] = [];
    const isNew = this.dataFrame!.col(this.molColName)?.toList().every((m) => !m && m === '');
    const view = DG.TableView.create(this.dataFrame!, false);
    this._designViewName = this.campaign?.name ?? this._designViewName;
    view.name = this._designViewName;
    this.processedValues = this.dataFrame!.getCol(this.molColName).toList();
    setTimeout(async () => {
      view._onAdded();
      await new Promise((r) => setTimeout(r, 1000)); // needed for substruct filter
      // apply layout.
      // const layout = (await grok.dapi.layouts.filter(`friendlyName = "${this._designViewName}"`).list())
      //   .find((l) => l && l.getUserDataValue(HDcampaignName) === this._campaignId);
      // if (layout)
      //   view.loadLayout(layout);

      if (this._campaign?.layout) {
        try {
          const layout = DG.ViewLayout.fromViewState(this._campaign.layout);
          view.loadLayout(layout);
        } catch (e) {
          console.error(e);
        }
      }

      if (isNew)
        grok.functions.call('Chem:editMoleculeCell', {cell: view.grid.cell(this._molColName, 0)});

      subs.push(this.dataFrame!.onRowsAdded.subscribe(() => { // TODO, insertion of rows in the middle
        try {
          // const newRowsNum = this.dataFrame!.rowCount - this.processedValues.length;
          // this.processedValues.push(...new Array(newRowsNum).fill(''));
          this.processedValues = this.dataFrame!.getCol(this.molColName).toList();
          if (this.template!.stages?.length > 0) {
            for (let i = 0; i < this.dataFrame!.rowCount; i++) {
              const colVal = this.dataFrame!.col(TileCategoriesColName)!.get(i);
              if (!colVal || colVal === '' || this.dataFrame!.col(TileCategoriesColName)?.isNone(i))
                this.dataFrame!.set(TileCategoriesColName, i, this.template!.stages[0]);
            }
          }
          let lastAddedCell: DG.GridCell | null = null;
          for (let i = 0; i < this.dataFrame!.rowCount; i++) {
            const cell = view.grid.cell(this.molColName, i);
            if (!cell)
              continue;
            if (cell.cell.value === '' || cell.cell.value === null)
              lastAddedCell = cell;
          }
          if (lastAddedCell)
            grok.functions.call('Chem:editMoleculeCell', {cell: lastAddedCell});
        } catch (e) {
          console.error(e);
        }
        //const lastCell = view.grid.cell(this.molColName, this.dataFrame!.rowCount - 1);
        //view.grid.onCellValueEdited
      }));
      this.dataFrame && subs.push(this.dataFrame?.onRowsRemoved.subscribe(() => {
        try {
          this.processedValues = this.dataFrame!.getCol(this.molColName).toList();
        } catch (e) {
          console.error(e);
        }
      }));
      subs.push(grok.events.onContextMenu.subscribe((args) => {
        try {
          const viewer = args?.args?.context;
          if (!viewer)
            return;
          if (viewer?.type !== DG.VIEWER.GRID)
            return;

          if (args?.args?.item?.tableColumn?.name !== this.molColName)
            return;
          const menu: DG.Menu = args?.args?.menu;
          if (!menu)
            return;
          menu.item('Duplicate molecule', () => {
            try {
              this.dataFrame!.rows.addNew(null, true);
              let lastCell: DG.GridCell | null = null;
              for (let i = 0; i < this.dataFrame!.rowCount; i++) {
                const cell = view.grid.cell(this.molColName, i);
                if (!cell)
                  continue;
                if (cell.cell.value === '' || cell.cell.value === null)
                  lastCell = cell;
              }
              if (lastCell)
                lastCell.cell.value = args?.args?.item?.cell?.value ?? '';
                // grok.functions.call('Chem:editMoleculeCell', {cell: lastCell});
            } catch (e) {
              console.error(e);
            }
          });
        } catch (e: any) {
          grok.log.error(e);
        }
      }));
      subs.push(view.grid.onCellValueEdited.subscribe(async (gc) => {
        try {
          if (gc.tableColumn?.name === TileCategoriesColName) {
            await this.saveCampaign(undefined, false);
            return;
          }
          if (gc.tableColumn?.name !== this.molColName)
            return;
          const newValue = gc.cell.value;
          const newValueIdx = gc.tableRowIndex!;

          if (!this.dataFrame!.col(ViDColName)?.get(newValueIdx) ||
            this.dataFrame!.col(ViDColName)?.get(newValueIdx) === '')
              this.dataFrame!.col(ViDColName)!.set(newValueIdx, getNewVid(this.dataFrame!.col(ViDColName)!), false);


          const computeObj = this.template!.compute;
          if (!newValue || newValue === '')
            return;

          const calcDf =
              await calculateSingleCellValues(newValue, computeObj.descriptors.args, computeObj.functions);

          for (const col of calcDf.columns.toList()) {
            if (col.name === HitDesignMolColName) continue;
            if (!this.dataFrame!.columns.contains(col.name)) {
              const newCol = this.dataFrame!.columns.addNew(col.name, col.type);
              newCol.semType = col.semType;
            }
            this.dataFrame!.col(col.name)!.set(newValueIdx, col.get(0), false);
          }
          this.dataFrame!.fireValuesChanged();
          this.saveCampaign(undefined, false);
        } catch (e) {
          console.error(e);
        }
      }));
      const onRemoveSub = grok.events.onViewRemoved.subscribe((v) => {
        if (v.id === view.id) {
          subs.forEach((s) => s.unsubscribe());
          onRemoveSub.unsubscribe();
        }
      });
    }, 300);
    const ribbons = view?.getRibbonPanels();
    if (ribbons) {
      const hasSubmit = checkRibbonsHaveSubmit(ribbons);
      if (!hasSubmit) {
        const getComputeDialog = async () => {
          chemFunctionsDialog(async (resultMap) => {
            const oldDescriptors = this.template!.compute.descriptors.args;
            const oldFunctions = this.template!.compute.functions;
            const newDescriptors = resultMap.descriptors;
            const newComputeObj = {
              descriptors: {
                enabled: !!resultMap?.descriptors?.length,
                args: resultMap?.descriptors ?? [],
              },
              functions: Object.entries(resultMap?.externals ?? {}).map(([funcName, args]) => {
                const splitFunc = funcName.split(':');
                return ({
                  name: splitFunc[1],
                  package: splitFunc[0],
                  args: args,
                });
              }),
            };
            this.template!.compute = newComputeObj;
            this.campaign!.template = this.template;
            const uncalculatedDescriptors = newDescriptors.filter((d) => !oldDescriptors.includes(d));
            const uncalculatedFunctions = newComputeObj.functions.filter((func) => {
              if (!oldFunctions.some((f) => f.name === func.name && f.package === func.package))
                return true;
              const oldFunc = oldFunctions.find((f) => f.name === func.name && f.package === func.package)!;
              return !Object.entries(func.args).every(([key, value]) => oldFunc.args[key] === value);
            });

            ui.setUpdateIndicator(view.grid.root, true);
            try {
              for (let i = 0; i < this.dataFrame!.rowCount; i++) {
                const value = this.dataFrame!.get(this.molColName, i);
                if (!value || value === '')
                  continue;
                const calcDf =
                  await calculateSingleCellValues(value, uncalculatedDescriptors, uncalculatedFunctions);

                for (const col of calcDf.columns.toList()) {
                  if (col.name === HitDesignMolColName) continue;
                  if (!this.dataFrame!.columns.contains(col.name)) {
                    const newCol = this.dataFrame!.columns.addNew(col.name, col.type);
                    newCol.semType = col.semType;
                  }
                this.dataFrame!.col(col.name)!.set(i, col.get(0), false);
                }
                this.dataFrame!.fireValuesChanged();
              }
            } finally {
              ui.setUpdateIndicator(view.grid.root, false);
              this.saveCampaign(undefined, false);
            }
          }, () => null, this.campaign?.template!, true);
        };

        const calculateRibbon = ui.icons.add(getComputeDialog, 'Calculate additional properties');

        const tilesButton = ui.bigButton('Progress tracker', () => {
          if (!this.currentTilesViewId || !grok.shell.view(this.currentTilesViewId)) {
            this._tilesView = new HitDesignTilesView(this);
            this._tilesView.parentCall = this.parentCall;
            this._tilesViewTab = grok.shell.addView(this._tilesView);
            this.currentTilesViewId = this._tilesViewTab.name;
            this._tilesView.onActivated();
          } else
            grok.shell.v = grok.shell.view(this.currentTilesViewId)!;
        });

        const submitButton = ui.bigButton('Submit', () => {
          const dialogContent = this._submitView?.render();
          if (dialogContent) {
            const dlg = ui.dialog('Submit');
            dlg.add(dialogContent);
            dlg.addButton('Save', ()=>{this.saveCampaign(); dlg.close();});
            dlg.addButton('Submit', ()=>{this._submitView?.submit(); dlg.close();});
            dlg.show();
          }
        });
        submitButton.classList.add('hit-design-submit-button');
        const ribbonButtons: HTMLElement[] = [submitButton];
        if (this.template?.stages?.length ?? 0 > 0)
          ribbonButtons.unshift(tilesButton);
        if (this.campaign && this.template) {
          if (!this.campaign.template)
            this.campaign.template = this.template;
          ribbonButtons.unshift(calculateRibbon);
        }

        ribbons.push(ribbonButtons);
        view.setRibbonPanels(ribbons);
      }
    }
    view.parentCall = this.parentCall;
    return view;
  }

  getSummary(): {[_: string]: any} {
    const campaignProps = {...(this.campaign?.campaignFields ?? this.campaignProps)};
    if (this.template && this.template.campaignFields) {
      Object.entries(campaignProps).forEach(([key, value]) => {
        const field = this.template!.campaignFields!.find((f) => f.name === key);
        if (field && field.type === 'Date' && value)
          campaignProps[key] = (new Date(value)).toLocaleDateString();
        else if (field && field.type === DG.SEMTYPE.MOLECULE && value)
          campaignProps[key] = grok.chem.drawMolecule(value);
      });
    }

    const getPathEditor = () => {
      const editIcon = ui.icons.edit(() => {
        const campaignIndex = this._filePath.indexOf((this.campaignId ?? this._campaign?.name)!);

        const folderPath = campaignIndex === -1 ? this._filePath : this._filePath.substring(0, campaignIndex - 1);
        const newPathInput = ui.stringInput('Path', folderPath);
        const labelElement = newPathInput.root.getElementsByTagName('label').item(0);
        if (labelElement)
          labelElement.remove();
        newPathInput.root.style.width = '100%';

        async function checkFolder() {
          const newPath = newPathInput.value;
          if (!newPath || newPath.trim() === '') {
            grok.shell.error('Path can not be empty');
            return false;
          }
          const exists = await grok.dapi.files.exists(newPath);
          if (!exists) {
            grok.shell.error('Given folder does not exist');
            return false;
          }
          return true;
        }

        const saveButton = ui.button('Save', async () => {
          const exists = await checkFolder();
          if (!exists)
            return;
          const newPath = newPathInput.value;
          if (newPath.endsWith('/'))
            this._filePath = `${newPath}${this.campaignId}/${CampaignTableName}`;
          else
            this._filePath = `${newPath}/${this.campaignId}/${CampaignTableName}`;

          if (this._campaign)
            this._campaign!.savePath = this._filePath;
          await this.saveCampaign(undefined, true);
          ui.empty(pathDiv);
          link = ui.link(this._filePath,
            () => this.download(this.dataFrame!, this.campaignId ?? this._campaign?.name ?? 'Molecules'),
            i18n.download);
          pathDiv.appendChild(link);
          pathDiv.appendChild(editIcon);
        });
        const cancelButton = ui.button('Cancel', () => {
          ui.empty(pathDiv);
          pathDiv.appendChild(link);
          pathDiv.appendChild(editIcon);
        });
        ui.empty(pathDiv);
        newPathInput.addOptions(cancelButton);
        newPathInput.addOptions(saveButton);
        pathDiv.appendChild(newPathInput.root);
      }, 'Edit file path');
      editIcon.style.marginLeft = '5px';
      let link = ui.link(this._filePath,
        () => this.download(this.dataFrame!, this.campaignId ?? this._campaign?.name ?? 'Molecules'), i18n.download);
      const pathDiv = ui.divH([link, editIcon], {style: {alignItems: 'center'}});
      return pathDiv;
    };

    return {
      'Template': this.template?.name ?? 'Molecules',
      'File path': getPathEditor(),
      ...campaignProps,
      'Number of molecules': (this.dataFrame!.rowCount - this._extraStageColsCount).toString(),
      'Enrichment methods': [this.template!.compute.descriptors.enabled ? 'descriptors' : '',
        ...this.template!.compute.functions.map((func) => func.name)].filter((f) => f && f.trim() !== '').join(', '),
    };
  }

  async saveCampaign(status?: HitTriageCampaignStatus, notify = true): Promise<HitDesignCampaign> {
    const campaignId = this.campaignId!;
    const templateName = this.template!.name;
    const enrichedDf = this.dataFrame!;
    const campaignName = campaignId;
    const columnSemTypes: {[_: string]: string} = {};
    enrichedDf.columns.toList().forEach((col) => columnSemTypes[col.name] = col.semType);
    const campaign: HitDesignCampaign = {
      name: campaignName,
      templateName,
      status: status ?? this.campaign?.status ?? 'In Progress',
      createDate: this.campaign?.createDate ?? toFormatedDateString(new Date()),
      campaignFields: this.campaign?.campaignFields ?? this.campaignProps,
      columnSemTypes,
      rowCount: enrichedDf.col(ViDColName)?.toList().filter((s) => s !== EmptyStageCellValue).length ?? 0,
      filteredRowCount: enrichedDf.filter.trueCount,
      savePath: this._filePath,
    };
    console.log(this._filePath);
    const csvDf = DG.DataFrame.fromColumns(
      enrichedDf.columns.toList().filter((col) => !col.name.startsWith('~')),
    ).toCsv();
    //await _package.files.writeAsText(`Hit Design/campaigns/${campaignId}/${CampaignTableName}`, csvDf);
    await grok.dapi.files.writeAsText(this._filePath, csvDf);
    const newLayout = this._designView!.saveLayout();
    if (!newLayout)
      grok.shell.warning('Layout cound not be saved');
    else
      campaign.layout = newLayout.viewState;
    campaign.template = this.template;

    await _package.files.writeAsText(`Hit Design/campaigns/${campaignId}/${CampaignJsonName}`,
      JSON.stringify(campaign));

    // const oldLayouts = (await grok.dapi.layouts.filter(`friendlyName = "${this._designViewName}"`).list())
    //   .filter((l) => l && l.getUserDataValue(HDcampaignName) === campaignId);
    // for (const l of oldLayouts)
    //   await grok.dapi.layouts.delete(l);
    // //save new layout
    // newLayout.setUserDataValue(HDcampaignName, campaignId);
    // const l = await grok.dapi.layouts.save(newLayout);
    // const allGroup = await grok.dapi.groups.find(DG.Group.defaultGroupsIds['All users']);
    // await grok.dapi.permissions.grant(l, allGroup, true);
    notify && grok.shell.info('Campaign saved successfully.');
    this.campaign = campaign;
    return campaign;
  }
}
