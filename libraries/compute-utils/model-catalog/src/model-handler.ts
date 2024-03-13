/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {BehaviorSubject} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';

function addPopover(popover: HTMLElement) {
  stylePopover(popover);
  document.body.append(popover);
}

function displayPopover(icon: HTMLElement, popover: HTMLElement) {
  alignPopover(icon, popover);
  popover.showPopover();
}

function alignPopover(target: HTMLElement, popover: HTMLElement): void {
  const bounds = target.getBoundingClientRect().toJSON();
  popover.style.inset = 'unset';
  popover.style.top = bounds.y + 'px';
  popover.style.left = (bounds.x + 20) + 'px';
}

function stylePopover(popover: HTMLElement): void {
  popover.popover = 'auto';
  popover.style.cursor = 'default';
  popover.style.padding = '10px';
  popover.style.background = '#fdffe5';
  popover.style.border = '1px solid #E4E6CE';
  popover.style.borderRadius = '2px';
  popover.style.boxShadow = '0 0 5px #E4E6CE';
  popover.style.maxWidth = '500px';
  popover.style.color = 'var(--gray-6)';
}

function requestMembership(groupName: string) {
  return async () => {
    try {
      const groups = await grok.dapi.groups.filter(`friendlyName="${groupName}"`).list();
      if (groups.length === 0)
        throw new Error(`group with specified name is not found`);

      if (groups.length > 1)
        throw new Error(`found more than one group with specified name`);

      const group = groups[0];

      // Workaround till JS API is not ready: https://reddata.atlassian.net/browse/GROK-14160
      fetch(`${window.location.origin}/api/groups/${group.id}/requests/${grok.shell.user.group.id}`, {method: 'POST'});
    } catch (e: any) {
      grok.shell.error(e.toString());
    }
  };
}

export class ModelHandler extends DG.ObjectHandler {
  override get type() {
    return 'Model';
  }

  override async getById(id: string): Promise<DG.Func> {
    return await grok.dapi.functions.find(id);
  }

  override async refresh(x: DG.Script): Promise<DG.Func> {
    return await this.getById(x.id);
  }

  static async openHelp(func: DG.Func) {
    if (func.options['readme'] != null) {
      grok.shell.windows.showHelp = true;
      await new Promise((r) => setTimeout(r, 100));
      const path = `System:AppData/${func.package.name}/${func.options['readme']}`;
      grok.dapi.files.readAsText(path).then((readmeText) => {
        grok.shell.windows.help.showHelp(ui.markdown(readmeText));
      });
    }
  }

  static openModel(x: DG.Func) {
    const fc = x.prepare();
    fc.edit();
  }

  static openModelFromFunccall(funcCall: DG.FuncCall) {
    funcCall.edit();
  }

  // Checks whether this is the handler for [x]
  override isApplicable(x: any) {
    const js = DG.toJs(x);
    return js instanceof DG.Func && js.hasTag('model');
  }

  private userGroups = new BehaviorSubject<DG.Group[] | undefined>(undefined);

  constructor() {
    super();
  }

  getLanguageIcon(language: string) {
    if (language == 'grok')
      return ui.iconSvg('project');
    return ui.iconImage('script', `/images/entities/${language}.png`);
  }

  override renderMarkup(x: DG.Func): HTMLElement {
    const markup = ui.divH([], {style: {'justify-content': 'space-between', 'width': '100%'}});

    setTimeout(async () => {
      const userGroups = await this.awaitUserGroups();
      const mandatoryUserGroups = JSON.parse(x.options['mandatoryUserGroups'] ? `${x.options['mandatoryUserGroups']}` : '[]') as {name: string, help?: string}[];
      const missingMandatoryGroups = mandatoryUserGroups.filter((group) => !userGroups.map((userGroup) => userGroup.friendlyName).includes(group.name));
      const hasMissingMandatoryGroups = missingMandatoryGroups.length > 0;
      const mandatoryGroupsIcon = ui.iconFA('exclamation-triangle', null);
      mandatoryGroupsIcon.classList.remove('grok-icon');

      const getBulletIcon = () => {
        const bulletIcon = ui.iconFA('times');
        bulletIcon.style.marginRight = '6px';
        bulletIcon.classList.remove('grok-icon');
        return bulletIcon;
      };

      const mandatoryGroupsInfo = ui.div(ui.divV([
        ui.label('You should be a member of the following group(s):', {style: {marginLeft: '0px'}}),
        ...missingMandatoryGroups.map((group) => ui.divV([
          ui.span([getBulletIcon(), group.name], {style: {'font-weight': 600}}),
          ...group.help ? [ui.span([group.help], {style: {marginLeft: '16px'}})]: [],
          ui.link(`Request group membership`, requestMembership(group.name), undefined, {style: {marginLeft: '16px'}}),
        ])),
      ], {style: {gap: '10px'}})) as HTMLElement;

      const label = ui.span([
        this.renderIcon(x),
        ui.label(x.friendlyName),
      ]);

      markup.onclick = () => {
        if (grok.shell.windows.help.visible)
          ModelHandler.openHelp(x);
      };

      if (!hasMissingMandatoryGroups)
        markup.ondblclick = () => {ModelHandler.openModel(x);};
      else
        label.classList.add('d4-disabled');

      if (hasMissingMandatoryGroups) {
        addPopover(mandatoryGroupsInfo);

        markup.addEventListener('click', () => {
          displayPopover(mandatoryGroupsIcon, mandatoryGroupsInfo);
        });
      }

      markup.append(label);
      if (hasMissingMandatoryGroups)
        markup.append(ui.span([mandatoryGroupsIcon]));
    });


    return markup;
  }

  override renderIcon(func: DG.Func): HTMLElement {
    if (func.options['icon'] != null && (func.options['icon'].startsWith('http://') || func.options['icon'].startsWith('https://')))
      return ui.iconImage('model-icon', func.options['icon']);

    if (func instanceof DG.Script)
      return this.getLanguageIcon(func.language);

    func = DG.Func.find({package: func.package.name, name: func.name})[0];
    let iconUrl = func.package.getIconUrl();
    if (func.options['icon'] != null) {
      const packagePathSegments = iconUrl.split('/');
      packagePathSegments.pop();
      packagePathSegments.push(func.options['icon']);
      iconUrl = packagePathSegments.join('/');
    }
    return ui.iconImage(func.package.name, iconUrl);
  }

  override async renderPreview(x: DG.Func) {
    const editorName = x.options.editor ?? 'Compute:RichFunctionViewEditor';
    const editor = await grok.functions.find(editorName);
    if (editor !== null && editor instanceof DG.Func) {
      const viewCall = editor.prepare({'call': x.prepare()});
      await viewCall.call(false, undefined, {processed: true});
      const view = viewCall.getOutputParamValue();
      if (view instanceof DG.View)
        return view;
    }
    //@ts-ignore
    return super.renderPreview(x);
  }

  override renderProperties(func: DG.Func) {
    const a = ui.accordion('ComputeModel');
    a.context = func;
    const titleDiv = ui.div([
      ui.span([this.renderIcon(func), ui.label(func.friendlyName), ui.contextActions(func), ui.star(func.id)])]);
    a.addTitle(titleDiv);

    if (func.description != null)
      titleDiv.appendChild(ui.div([ui.markdown(func.description)], 'model-catalog-description'));
    titleDiv.appendChild(ui.tags(func));
    if ( func.options['dev.status'] != null)
      titleDiv.appendChild(ui.tableFromMap({Status: func.options['dev.status']}));

    a.end();
    return a.root;
  }

  override renderTooltip(x: DG.Func) {
    const h = ui.span([this.renderIcon(x), ui.label(x.friendlyName)]);
    h.classList.add('d4-link-label');
    const card = ui.bind(x, ui.divV([
      ui.h2(h),
      ui.divV([ui.divText(x.description, 'ui-description')], {style: {lineHeight: '150%'}}),
    ]));
    return card;
  }

  override renderCard(x: DG.Func): HTMLElement {
    const h = this.renderMarkup(x);
    h.classList.add('d4-link-label');
    const card = ui.bind(x, ui.h2(h));
    return card;
  }

  override init(): void {
    this.registerParamFunc('Help', (func: DG.Func) => {
      ModelHandler.openHelp(DG.toJs(func));
    });

    setTimeout(async () => {
      // Workaround till JS API is not ready: https://reddata.atlassian.net/browse/GROK-14159
      const userGroups = (await(await fetch(`${window.location.origin}/api/groups/all_parents`)).json() as DG.Group[]);
      this.userGroups.next(userGroups);
    });
  }

  private async awaitUserGroups() {
    return this.userGroups.pipe(
      filter((g) => !!g),
      map((g) => g!),
      take(1),
    ).toPromise();
  }
}
