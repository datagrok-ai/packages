/* eslint-disable max-len */
/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {_package} from './package';
export const defaultSharingGroupCategoryName = 'DefaultUserGroupsSharing';
export type HTPackageSettings = {
    view: string;
    edit: string;
}

export type HTDefaultCampaignSharing = {
    view: DG.Group[];
    edit: DG.Group[];
}

export const defaultCampaignStoragePropName = 'defaultCampaignFolder';
export const defaultCampaignStorage = 'System.AppData/HitTriage';

export async function parseUserGroupString(s: string | null) {
  if (!s)
    return [await grok.dapi.groups.find(DG.Group.defaultGroupsIds['All users'])].filter(Boolean);
  try {
    const parsedJson: string[] = JSON.parse(s);
    return (await Promise.all(parsedJson.map((groupId) => grok.dapi.groups.find(groupId)))).filter(Boolean);
  } catch (e) {
    console.error(e);
    return [await grok.dapi.groups.find(DG.Group.defaultGroupsIds['All users'])].filter(Boolean);
  }
}

export async function getDefaultSharingSettings(): Promise<HTDefaultCampaignSharing> {
  try {
    const ps = (_package.settings ?? await _package.getSettings()) as unknown as Map<string, any> | Record<string, any>;
    const settings: HTDefaultCampaignSharing = {view: [], edit: []};
    if (!ps)
      return settings;
    // this hack is needed because api says it will return Map, but it actually returns object...
    if (ps instanceof Map) {
      settings.view = await parseUserGroupString(ps.get('view') ?? '');
      settings.edit = await parseUserGroupString(ps.get('edit') ?? '');
    } else {
      settings.view = await parseUserGroupString(ps.view ?? '');
      settings.edit = await parseUserGroupString(ps.edit ?? '');
    }
    return settings;
  } catch (e) {
    console.error(e);
    return {view: [], edit: []};
  }
}

export async function getDefaultCampaignStorageSettings(): Promise<string> {
  const ps = (_package.settings ?? await _package.getSettings()) as unknown as Map<string, any> | Record<string, any>;
  if (!ps)
    return defaultCampaignStorage;
  const res = (ps instanceof Map ? ps.get(defaultCampaignStoragePropName) : ps[defaultCampaignStoragePropName]) ?? defaultCampaignStorage;
  // check if it exists
  if (!(await grok.dapi.files.exists(res)))
    return defaultCampaignStorage;
  return res;
}


export async function htPackageSettingsEditorWidget(propList: DG.Property[]): Promise<DG.Widget> {
  const sharingProps = propList.filter((p) => p.category === defaultSharingGroupCategoryName);
  const inputs: DG.InputBase[] = [];
  for (const prop of sharingProps) {
    const name = `${prop.name[0].toUpperCase()}${prop.name.slice(1)}`;
    const curValue: string | null = prop.get(null); // null is passed here because there is an getter override in the core
    const groups = await parseUserGroupString(curValue);
    const input = ui.input.userGroups(name);
    await DG.delay(200);
    // values are set separately as there still are some bugs with input
    //@ts-ignore
    input.value = groups;
    // onchanged event is not called. need to fix in the future in Core.
    input.onInput.subscribe(() => {
      try {
        const stringValue = !input.value?.length ? '' : JSON.stringify(input.value.map((group) => group.id));
        prop.set(null, stringValue); //FYI for future devs: null is passed here because there is an setter override in the core, the temp prop is set in backend and it is saved when a save button is clicked
      } catch (e) {
        grok.shell.error('Error Setting group. Check console for more details');
        console.error(e);
      }
    });
    input.setTooltip(`Selected groups will be granted ${name.toLowerCase()} permissions by default on newly created campaigns`);
    inputs.push(input);
  }
  // unfortunately, this hack is needed to make the form scrollable
  const w = DG.Widget.fromRoot(ui.form(inputs, {style: {overflow: 'visible'}}));
  w.root.prepend(ui.h1('Default Campaign Sharing', {style: {marginBottom: '6px', marginTop: '6px'}}));

  const storageProp = propList.find((p) => p.name === defaultCampaignStoragePropName);

  if (storageProp) {
    const defaultTooltip = 'Default storage for newly created campaigns. For each app, folders will be created under their name. For example, for Hit Design, the campaign files will be saved under <b>"Your folder/Hit Design/campaigns/enriched_table.csv"</b>';
    let curTooltip = defaultTooltip;
    const curValue: string = storageProp.get(null) ?? defaultCampaignStorage;
    const defaultStorageHeader = ui.h1('Default Campaign Storage', {style: {marginBottom: '6px', marginTop: '6px'}});
  
    const storageInput = ui.input.string('Folder Path', {value: curValue});
    ui.tooltip.bind(storageInput.input, () => curTooltip);
    DG.debounce(storageInput.onChanged, 200).subscribe(async (_) => {
      const value = storageInput.value;
      try {
        if (!value) {
          storageProp.set(null, defaultCampaignStorage);
          curTooltip = defaultTooltip + '<br><br> <b style="color: red">Cannot be empty.</b>';
          storageInput.input.classList.add('d4-invalid');
          return;
        }
        if (!(await grok.dapi.files.exists(value))) {
          storageProp.set(null, defaultCampaignStorage);
          curTooltip = defaultTooltip + '<br><br> <b style="color: red">Folder does not exist.</b>';
          storageInput.input.classList.add('d4-invalid');
          return;
        }
        storageProp.set(null, value);
        curTooltip = defaultTooltip;
        storageInput.input.classList.remove('d4-invalid');

      } catch (e) {
        grok.shell.error('Error Setting default storage. Check console for more details');
        console.error(e);
      }
    })
    w.root.appendChild(defaultStorageHeader);
    w.root.appendChild(storageInput.root);
  }
  setTimeout(() => w.root.parentElement?.style && (w.root.parentElement.style.overflow = 'visible'), 200);
  return w;
}
