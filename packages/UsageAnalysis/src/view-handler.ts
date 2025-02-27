import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {UaView} from './tabs/ua';
import {UaToolbox} from './ua-toolbox';
import {EventsView} from './tabs/events';
import {PackagesView} from './tabs/packages';
import {FunctionsView} from './tabs/functions';
import {OverviewView} from './tabs/overview';
import {LogView} from './tabs/log'; 

export class ViewHandler {
  public static UA_NAME = 'Usage Analysis';
  private urlParams: Map<string, string> = new Map<string, string>();
  public view: DG.MultiView;

  constructor() {
    this.view = new DG.MultiView({viewFactories: {}});
  }

  async init(date?: string, groups?: string, packages?: string, tags?: string, categories?: string,  path?: string): Promise<void> {
    this.view.parentCall = grok.functions.getCurrentCall();
    const toolbox = await UaToolbox.construct(this);
    const viewClasses: (typeof UaView)[] = [OverviewView, PackagesView, FunctionsView, EventsView, LogView];
    for (let i = 0; i < viewClasses.length; i++) {
      const currentView = new viewClasses[i](toolbox);
      this.view.addView(currentView.name, () => {
        currentView.tryToinitViewers(path);
        return currentView;
      }, false);
    }

    let urlTab = 'Overview';

    if (path != undefined && path.length > 1) {
      const segments = path.split('/').filter((s) => s != '');
      if (segments.length > 0) {
        urlTab = segments[0];
        urlTab = urlTab[0].toUpperCase() + urlTab.slice(1);
      }
    }

    toolbox.toggleCategoriesInput(urlTab == 'Packages');
    toolbox.toggleTagsInput(urlTab == 'Functions');

    const paramsHaveDate = date != undefined;
    const paramsHaveUsers = groups != undefined;
    const paramsHavePackages = packages != undefined;
    const paramsHaveTags = tags != undefined;
    const paramsHavePackagesCategories = categories != undefined;
    if (paramsHaveDate || paramsHaveUsers || paramsHavePackages || paramsHavePackagesCategories) {
      if (paramsHaveDate)
        toolbox.setDate(date!);
      if (paramsHaveUsers)
        toolbox.setGroups(groups!);
      if (paramsHavePackages)
        toolbox.setPackages(packages!);
      if (paramsHaveTags)
        toolbox.setTags(tags!);
      if (paramsHavePackagesCategories)
        toolbox.setPackagesCategories(categories!);
      toolbox.applyFilter();
    }
    let helpShown = false;
    const puButton = ui.bigButton('Usage', () => {
      const v = this.getCurrentView();
      v.switchRout();
      this.updatePath();
      v.viewers[1].root.style.display = 'none';
      v.viewers[0].root.style.display = 'flex';
      puButton.disabled = true;
      piButton.disabled = false;
    });
    const piButton = ui.bigButton('Installation time', () => {
      const v = this.getCurrentView();
      v.switchRout();
      this.updatePath();
      v.viewers[0].root.style.display = 'none';
      v.viewers[1].root.style.display = 'flex';
      puButton.disabled = false;
      piButton.disabled = true;
    });
    puButton.disabled = true;
    const pButtons = ui.divH([puButton, piButton], 'ua-packages-buttons');
    pButtons.style.display = 'none';
    toolbox.filters.root.before(pButtons);

    const fuButton = ui.bigButton('Usage', () => {
      const v = this.getCurrentView() as FunctionsView;
      v.switchRout();
      this.updatePath();
      v.functionsExecTime.style.display = 'none';
      v.viewers[0].root.style.display = 'flex';
      fuButton.disabled = true;
      feButton.disabled = false;
    });
    const feButton = ui.bigButton('Execution time', () => {
      const v = this.getCurrentView() as FunctionsView;
      v.switchRout();
      this.updatePath();
      v.viewers[0].root.style.display = 'none';
      v.functionsExecTime.style.display = 'flex';
      fuButton.disabled = false;
      feButton.disabled = true;
    });
    fuButton.disabled = true;
    const fButtons = ui.divH([fuButton, feButton], 'ua-packages-buttons');
    fButtons.style.display = 'none';
    toolbox.filters.root.before(fButtons);

    this.view.tabs.onTabChanged.subscribe((_) => {
      const view = this.view.currentView;
      toolbox.toggleCategoriesInput(view.name === 'Packages');
      toolbox.toggleTagsInput(view.name === 'Functions');
      // ViewHandler.UA.path = ViewHandler.UA.path.replace(/(UsageAnalysis\/)([a-zA-Z/]+)/, '$1' + view.name);
      this.updatePath();
      if (view instanceof UaView) {
        for (const viewer of view.viewers) {
          if (!viewer.activated) {
            viewer.activated = true;
            viewer.reloadViewer();
          }
        }
      }
      if (!helpShown) {
        if (this.view.currentView instanceof PackagesView || this.view.currentView instanceof FunctionsView) {
          grok.shell.windows.showToolbox = true;
          grok.shell.windows.showContextPanel = true;
          const info = ui.divText(`To learn more about an event, click the corresponding point.\
          To select multiple points, use CTRL + Click or SHIFT + Mouse Drag. Once you've made your selection,\
          see the detailed information on the Context Panel`);
          info.classList.add('ua-hint');
          grok.shell.o = info;
        }
        helpShown = true;
      }
      
      if (view.name === 'Packages')
        pButtons.style.display = 'flex';
      else
        pButtons.style.display = 'none';
      if (view.name === 'Functions')
        fButtons.style.display = 'flex';
      else
        fButtons.style.display = 'none';
    });
    this.view.name = ViewHandler.UA_NAME;
    this.view.box = true;

    if (viewClasses.some((v) => v.name === `${urlTab}View`))
      this.changeTab(urlTab);
  }

  public getView(name: string) {
    return this.view.getView(name) as UaView;
  }

  public getCurrentView(): UaView {
    return this.view.currentView as UaView;
  }

  public changeTab(name: string) {
    this.view.tabs.currentPane = this.view.tabs.getPane(name);
  }

  setUrlParam(key: string, value: string, saveDuringChangingView: boolean = false) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set(key, value);

    const params: string[] = [];

    for (const keyAndValue of urlParams.entries())
      params.push(encodeURI(keyAndValue.join('=')));

    if (saveDuringChangingView)
      this.urlParams.set(key, value);

    this.view.path = `/${this.getCurrentView().name}?${params.join('&')}`.toLowerCase();
  }

   updatePath(): void {
    const v = this.getCurrentView();
    const s = this.view.path.split('?');
    const params = s.length === 2 ? s[1] : null;
     this.view.path = `/${v.name}${v.rout ?? ''}${params ? '?' + params : ''}`.toLowerCase();
  }
}
