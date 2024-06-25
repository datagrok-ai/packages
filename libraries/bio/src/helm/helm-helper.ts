import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import type {App} from '@datagrok-libraries/helm-web-editor/helm/App';
import {Atom, HelmType, IHelmWebEditor, IWebEditorMonomer} from './types';
import {IMonomerLib} from '../types/index';

export type GetMonomerResType = IWebEditorMonomer | null;
export type GetMonomerFunc = (a: Atom<HelmType> | HelmType, name?: string) => GetMonomerResType;

export interface IHelmHelper {
  createHelmWebEditor(): IHelmWebEditor;

  createWebEditorApp(host: HTMLDivElement, helm?: string): App;

  get originalGetMonomer(): GetMonomerFunc | null;

  buildGetMonomerFromLib(monomerLib: IMonomerLib): GetMonomerFunc;
  overrideGetMonomer(getMonomerFunc: GetMonomerFunc): GetMonomerFunc;
  revertOriginalGetMonomer(): GetMonomerFunc;
}

export async function getHelmHelper(): Promise<IHelmHelper> {
  const packageName = 'Helm';
  const funcList = DG.Func.find({package: packageName, name: `getHelmHelper`});
  if (funcList.length === 0)
    throw new Error(`Package '${packageName}' must be installed for HelmHelper.`);
  const res = (await funcList[0].prepare().call()).getOutputParamValue() as IHelmHelper;
  return res;
}
