import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {Unsubscribable} from 'rxjs';

import {delay, timeout} from '@datagrok-libraries/utils/src/test';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {
  DojoType, DojoxType, HweWindow, IOrgHelmWebEditor, Monomers
} from '@datagrok-libraries/bio/src/helm/types';
import {HelmServiceBase} from '@datagrok-libraries/bio/src/viewers/helm-service';
import {IMonomerLib} from '@datagrok-libraries/bio/src/types';
import {LoggerWrapper} from '@datagrok-libraries/bio/src/utils/logger';
import {getMonomerLibHelper, IMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';

import {HelmHelper} from './helm-helper';
import {HelmService} from './utils/helm-service';
import {OrgHelmModule, ScilModule} from './types';
import {rewriteLibraries} from './utils/get-monomer';

import {_package} from './package';

declare const dojo: DojoType;
declare const dojox: DojoxType;
declare const scil: ScilModule;
declare const org: OrgHelmModule;

type DojoConfigWindowType = {
  dojoConfig: {
    packages?: (string | { name: string, location: string })[],
    deps?: string[], callback: Function, has?: any, parseOnLoad?: boolean, async?: boolean | string, locale?: string,
  },
};
type HelmWindowType = {
  $helmService?: HelmServiceBase,
  require: Function,
};
declare const window: Window & DojoConfigWindowType & HweWindow & HelmWindowType;

export function _getHelmService(): HelmServiceBase {
  let res = window.$helmService;
  if (!res) res = window.$helmService = new HelmService();
  return res;
}

export async function initHelmLoadAndPatchDojo(): Promise<void> {
  const logPrefix = `Helm: _package.initHelmPatchDojo()`;
  // patch window.dojox.gfx.svg.Text.prototype.getTextWidth hangs
  /** get the text width in pixels */
  const pi = DG.TaskBarProgressIndicator.create('Loading Helm Web Editor ...');
  try {
    const requireBackup = window.require;

    // dojo.window','dojo.io.script','dojo.io.iframe','dojo.dom','dojox.gfx','dojox.gfx.svg','dojox.gfx.shape','dojox.charting'
    const dojoTargetList: { name: string, checker: () => boolean }[] = [
      {name: 'dojo.window', checker: () => !!dojo?.window},
      {name: 'dojo.ready', checker: () => !!dojo?.ready},
      {name: 'dojo.io.script', checker: () => !!dojo?.io?.script},
      {name: 'dojo.io.iframe', checker: () => !!dojo?.io?.iframe},
      // {name: 'dojo.dom', checker: () => !!dojo?.dom},
      {name: 'dojox.gfx', checker: () => !!dojox?.gfx},
      {name: 'dojox.gfx.svg', checker: () => !!dojox?.gfx?.svg},
      {name: 'dojox.gfx.createSurface', checker: () => !!dojox?.gfx?.createSurface},
      {name: 'dojox.gfx.shape', checker: () => !!dojox?.gfx?.shape},
      {name: 'dojox.storage.Provider', checker: () => !!dojox?.storage?.Provider},
      {name: 'dojox.storage.LocalStorageProvider', checker: () => !!dojox?.storage?.LocalStorageProvider},
      // {name: 'dojox.charting', checker: () => !!dojox.charting},
      // {name: 'dojox.charting.themes.Claro', checker: () => !!dojox.charting?.themes?.Claro},
      // {name: 'dojox.charting.themes.Wetland', checker: () => !!dojox.charting?.themes?.Wetland},
      // {name: 'dojox.charting.plot2d.Base', checker: () => !!dojox.charting?.plot2d?.Base},
      // {name: 'dojox.charting.Series', checker: () => !!dojox?.charting?.Series},
      // {name: 'dojox.charting.Chart2D', checker: () => !!dojox?.charting?.Chart2D},
    ];
    /** Gets list ofd modules not ready yet */
    const getDojoNotReadyList = (): string[] => {
      return dojoTargetList.filter((dt) => !dt.checker()).map((dt) => dt.name);
    };

    try {
      await timeout(async () => {

        await new Promise<void>((resolve, reject) => {
          window.dojoConfig = {
            callback: () => { resolve(); },
            parseOnLoad: true,
            async: false,
            locale: 'en-us', // to limit dijit/nls file set
          };
          // Load dojo without package/sources section for the settings dojoConfig to take effect
          DG.Utils.loadJsCss([
            // 'https://ajax.googleapis.com/ajax/libs/dojo/1.10.4/dojo/dojo.js.uncompressed.js',
            `${_package.webRoot}/vendor/dojo-1.10.10/dojo/dojo.js.uncompressed.js`,
          ]).then(() => {});
        });

        const dojoRequire = window.require;
        const cmp = dojoRequire == requireBackup;
        try {
          await new Promise<void>((resolve, reject) => {
            dojoRequire(['dojo/window', 'dojo/dom', 'dojo/io/script', 'dojo/io/iframe',
                'dojox/gfx', 'dojox/gfx/svg', 'dojox/gfx/shape',
                'dojox/storage/Provider', 'dojox/storage/LocalStorageProvider',
                'dijit/_base', 'dijit/Tooltip', 'dijit/form/_FormValueWidget',
                'dijit/form/DropDownButton', 'dijit/layout/AccordionContainer', 'dijit/form/ComboButton',
                'dijit/layout/StackController', 'dijit/layout/StackContainer',
              ],
              (...args: any[]) => { resolve(); });
          });
        } finally {
          // TODO: Check interference with NGL
          window.require = function(...args: any[]) {
            _package.logger.debug(`${logPrefix}, window.require( ${JSON.stringify(args)} )`);
            dojoRequire(...args);
          };
        }

        /** List of dojo modules not ready yet */ let dojoNotReadyList: string[];
        while ((dojoNotReadyList = getDojoNotReadyList()).length > 0) {
          const dojoProgress = dojoTargetList.length - dojoNotReadyList.length;
          pi.update(Math.round(100 * dojoProgress / dojoTargetList.length),
            `Loading Helm Web Editor ${dojoProgress}/${dojoTargetList.length}`);
          _package.logger.debug(`${logPrefix}, dojo loading ... ${dojoNotReadyList.map((m) => `'${m}'`).join(',')} ...`);
          await delay(100);
        }
        _package.logger.debug(`${logPrefix}, dojo ready all modules`);
      }, 60000, 'timeout dojox.gfx.svg');
    } catch (err: any) {
      const dojoNotReadyList = getDojoNotReadyList();
      _package.logger.error(`${logPrefix}, dojo not ready ${dojoNotReadyList.map((m) => `'${m}'`).join(',')} ...`);
    }

    _package.logger.debug(`${logPrefix}, patch window.dojox.gfx.svg.Text.prototype.getTextWidth`);
    // @ts-ignore
    window.dojox.gfx.svg.Text.prototype.getTextWidth = function() {
      // Patched via Datagrok Helm package
      const rawNode = this.rawNode;
      const oldParent = rawNode.parentNode;
      const _measurementNode = rawNode.cloneNode(true);
      _measurementNode.style.visibility = 'hidden';

      // solution to the "orphan issue" in FF
      let _width = 0;
      const _text = _measurementNode.firstChild.nodeValue;
      oldParent.appendChild(_measurementNode);

      // solution to the "orphan issue" in Opera
      // (nodeValue == "" hangs firefox)
      if (_text != '') {
        let watchdogCounter = 100;
        while (!_width && --watchdogCounter > 0) { // <-- hangs
          //Yang: work around svgweb bug 417 -- http://code.google.com/p/svgweb/issues/detail?id=417
          if (_measurementNode.getBBox)
            _width = parseInt(_measurementNode.getBBox().width);
          else
            _width = 68;
        }
      }
      oldParent.removeChild(_measurementNode);
      return _width;
    };
    _package.logger.debug(`${logPrefix}, end`);
  } finally {
    pi.close();
  }
}

export const helmJsonReplacer = (key: string, value: any): any => {
  switch (key) {
  case '_parent': {
    return `${value.toString()}`;
  }
  default:
    return value;
  }
};

export class HelmPackage extends DG.Package {
  public alertOriginal: ((s: string) => void) | null = null;
  public readonly helmHelper: HelmHelper;
  public libHelper!: IMonomerLibHelper;

  constructor(opts: { debug: boolean } = {debug: false}) {
    super();
    // @ts-ignore
    super._logger = new LoggerWrapper(super.logger, opts.debug);

    this.helmHelper = new HelmHelper(this.logger);
  }

  // -- Init --
  /** Loads Dojo and HelmWebEditor, waits for init, patches */
  async initHELMWebEditor(): Promise<void> {
    const logPrefix: string = 'Helm: Package.initDojo()';

    _package.logger.debug(`${logPrefix}, dependence loading …`);
    const t1: number = performance.now();

    _package.logger.debug(`${logPrefix}, dojox loading and patching …`);
    await initHelmLoadAndPatchDojo();
    _package.logger.debug(`${logPrefix}, dojox loaded and patched`);

    // Alternatively load old bundles by package.json/sources
    _package.logger.debug(`${logPrefix}, HelmWebEditor awaiting …`);
    // require('../helm/JSDraw/Scilligence.JSDraw2.Lite-uncompressed');
    // require('../helm/JSDraw/Pistoia.HELM-uncompressed');
    require('../node_modules/@datagrok-libraries/helm-web-editor/dist/package.js');
    await window.helmWebEditor$.initPromise;
    _package.logger.debug(`${logPrefix}, HelmWebEditor loaded`);

    org.helm.webeditor.kCaseSensitive = true; // GROK-13880

    _package.logger.debug(`${logPrefix}, scil.Utils.alert patch`);
    _package.initHelmPatchScilAlert(); // patch immediately

    const t2: number = performance.now();
    _package.logger.debug(`${logPrefix}, dependence loaded, ET: ${(t2 - t1)} ms`);
  }

  public initHelmPatchScilAlert(): void {
    const logPrefix: string = 'Helm: initHelmPatchScilAlert()';
    this.alertOriginal = scil.Utils.alert;
    scil.Utils.alert = (s: string): void => {
      this.logger.warning(`${logPrefix}, scil.Utils.alert() s: "${s}".`);
    };
  }

  /** Patches Pistoia Monomers.getMonomer method to utilize DG Bio monomer Lib */
  public initHelmPatchPistoia(): void {
    const logPrefix: string = 'Helm: initHelmPatchPistoia()';
    const monomers = org.helm.webeditor.Monomers;

    this.logger.debug(`${logPrefix}, this.getMonomerOriginal stored`);

    this.helmHelper.overrideMonomersFuncs(this.helmHelper.buildMonomersFuncsFromLib(this.monomerLib));

    // @ts-ignore, intercept with proxy to observe access and usage
    org.helm.webeditor.Monomers = new class {
      constructor(base: Monomers) {
        return new Proxy(base, {
          get(target: any, p: string | symbol, _receiver: any): any {
            return target[p];
          },
          set(target: any, p: string | symbol, newValue: any, _receiver: any): boolean {
            if (p != 'sugars' && p != 'linkers' && p != 'bases' && p != 'aas') {
              const k = 11;
            }
            target[p] = newValue;
            return true;
          },
          apply(target: any, thisArg: any, argArray: any[]): any {
            return target[thisArg](...argArray);
          },
        });
      }
    }(org.helm.webeditor.Monomers) as Monomers;

    // @ts-ignore, intercept with proxy to observe access and usage
    org.helm.webeditor = new class {
      constructor(base: IOrgHelmWebEditor) {
        return new Proxy(base, {
          get(target: any, p: string | symbol, _receiver: any): any {
            return target[p];
          },
          set(target: any, p: string | symbol, newValue: any, _receiver: any): boolean {
            target[p] = newValue;
            return true;
          },
          apply(target: any, thisArg: any, argArray: any[]): any {
            return target[thisArg](...argArray);
          },
        });
      }
    }(org.helm.webeditor) as IOrgHelmWebEditor;
  }

  // -- MonomerLib --

  public get monomerLib(): IMonomerLib {
    if (!this.libHelper)
      throw new Error(`Helm: _package.libHelper is not initialized yet`);
    return this.libHelper.getMonomerLib();
  }

  private _monomerLibSub?: Unsubscribable;

  /** Requires both Bio & HELMWebEditor initialized */
  initMonomerLib(libHelper: IMonomerLibHelper): void {
    this.libHelper = libHelper;

    const lib = this.monomerLib;
    rewriteLibraries(lib); // initHelm()
    this._monomerLibSub = lib.onChanged
      .subscribe(this.monomerLibOnChangedHandler.bind(this));

    this.initHelmPatchPistoia();
  }

  monomerLibOnChangedHandler(): void {
    const logPrefix = `Helm: _package.monomerLibOnChangedHandler()`;
    try {
      const libSummary = this.monomerLib!.getSummaryObj();
      const isLibEmpty = Object.keys(libSummary).length == 0;
      const libSummaryLog = isLibEmpty ? 'empty' : Object.entries(libSummary)
        .map(([pt, count]) => `${pt}: ${count}`)
        .join(', ');
      _package.logger.debug(`${logPrefix}, start, lib: { ${libSummaryLog} }`);

      const libSummaryHtml = isLibEmpty ? 'empty' : Object.entries(libSummary)
        .map(([pt, count]) => `${pt} ${count}`)
        .join('<br />');
      const libMsg: string = `Monomer lib updated:<br /> ${libSummaryHtml}`;
      grok.shell.info(libMsg);

      _package.logger.debug(`${logPrefix}, org,helm.webeditor.Monomers updating ...`);
      rewriteLibraries(this.monomerLib); // initHelm() monomerLib.onChanged()
      _package.logger.debug(`${logPrefix}, end, org.helm.webeditor.Monomers completed`);
    } catch (err: any) {
      const errMsg = errorToConsole(err);
      console.error(`${logPrefix} error:\n` + errMsg);
      // throw err; // Prevent disabling event handler
    }
  }
}
