import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {
  App, Atom, HelmType, GetMonomerFunc, GetMonomerResType
} from '@datagrok-libraries/bio/src/helm/types';

import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {ILogger} from '@datagrok-libraries/bio/src/utils/logger';
import {IHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {IHelmWebEditor} from '@datagrok-libraries/bio/src/helm/types';
import {IMonomerLib} from '@datagrok-libraries/bio/src/types/index';

import {HelmWebEditor} from './helm-web-editor';
import {OrgHelmModule, ScilModule} from './types';
import {getWebEditorMonomer} from './utils/get-monomer';

import {_package} from './package';

declare const scil: ScilModule;
declare const org: OrgHelmModule;

export class HelmHelper implements IHelmHelper {
  private static instanceCount: number = 0;

  constructor(
    private readonly logger: ILogger
  ) {
    // Watchdog for singleton
    if ((++HelmHelper.instanceCount) > 1)
      throw new Error(`HelmHelper must be a single.`);
  }

  createHelmWebEditor(): IHelmWebEditor {
    return new HelmWebEditor();
  }

  createWebEditorApp(host: HTMLDivElement, helm: string): App {
    org.helm.webeditor.MolViewer.molscale = 0.8;
    const webEditorApp: App = new org.helm.webeditor.App(host, {
      showabout: false,
      mexfontsize: '90%',
      mexrnapinontab: true,
      topmargin: 20,
      mexmonomerstab: true,
      sequenceviewonly: false,
      mexfavoritefirst: true,
      mexfilter: true
    });
    const sizes = webEditorApp.calculateSizes();
    webEditorApp.canvas.resize(sizes.rightwidth - 100, sizes.topheight - 210);
    let s: Partial<CSSStyleDeclaration> = {width: sizes.rightwidth - 100 + 'px', height: sizes.bottomheight + 'px'};
    scil.apply(webEditorApp.sequence.style, s);
    scil.apply(webEditorApp.notation.style, s);
    s = {width: sizes.rightwidth + 'px', height: (sizes.bottomheight + webEditorApp.toolbarheight) + 'px'};
    scil.apply(webEditorApp.properties.parent.style, s);
    webEditorApp.structureview.resize(sizes.rightwidth, sizes.bottomheight + webEditorApp.toolbarheight);
    webEditorApp.mex.resize(sizes.topheight - 80);
    setTimeout(() => {
      webEditorApp.canvas.helm.setSequence(helm, 'HELM');
    }, 200);
    return webEditorApp;
  }

  // -- GetMonomer --

  public originalGetMonomer: GetMonomerFunc | null = null;

  public revertOriginalGetMonomer(): GetMonomerFunc {
    const logPrefix = `Helm: revertOriginalGetMonomer()`;
    if (this.originalGetMonomer === null)
      throw new Error('Unable to revert original getMonomer');

    const monomers = org.helm.webeditor.Monomers;
    const overriddenGetMonomer = monomers.getMonomer = this.originalGetMonomer;
    this.originalGetMonomer = null;
    return overriddenGetMonomer;
  }

  public overrideGetMonomer(getMonomer: GetMonomerFunc): GetMonomerFunc {
    const logPrefix = `Helm: overrideGetMonomer()`;

    if (this.originalGetMonomer != null)
      throw new Error('');

    const monomers = org.helm.webeditor.Monomers;
    this.originalGetMonomer = monomers.getMonomer.bind(monomers);
    monomers.getMonomer = getMonomer;
    return this.originalGetMonomer!;
  }

  public buildGetMonomerFromLib(monomerLib: IMonomerLib): GetMonomerFunc {
    const logPrefix = `Helm: HelmHelper.buildGetMonomerFromLib()`;
    return (a: Atom<HelmType> | HelmType, name?: string): GetMonomerResType => {
      const logPrefixInt = `${logPrefix}, org.helm.webeditor.Monomers.getMonomer()`;
      try {
        // logger.debug(`${logPrefixInt}, a: ${JSON.stringify(a, helmJsonReplacer)}, name: '${name}'`);

        // Creates monomers in lib
        const dgWem = getWebEditorMonomer(monomerLib, a, name);

        return dgWem; //dgWem;
      } catch (err) {
        const [errMsg, errStack] = errInfo(err);
        this.logger.error(`${logPrefixInt}, Error: ${errMsg}`, undefined, errStack);
        throw err;
      }
    };
  }
}
