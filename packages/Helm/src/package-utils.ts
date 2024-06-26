import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {delay, timeout} from '@datagrok-libraries/utils/src/test';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import type {
  DojoType, DojoxType, IOrgHelmWebEditor, Monomers
} from '@datagrok-libraries/bio/src/helm/types';
import {HelmServiceBase} from '@datagrok-libraries/bio/src/viewers/helm-service';
import {IMonomerLib} from '@datagrok-libraries/bio/src/types';

import {HelmHelper} from './helm-helper';
import {HelmService} from './utils/helm-service';
import {OrgHelmModule, ScilModule} from './types';

import {_package} from './package';

declare const dojo: DojoType;
declare const dojox: DojoxType;
declare const scil: ScilModule;
declare const org: OrgHelmModule;

// eslint-disable-next-line
var dojoConfig = {async: true};

type HelmWindowType = Window & {
  $helmService?: HelmServiceBase,
}
declare const window: HelmWindowType;

export function _getHelmService(): HelmServiceBase {
  let res = window.$helmService;
  if (!res) res = window.$helmService = new HelmService();
  return res;
}

export async function initHelmLoadAndPatchDojo(): Promise<void> {
  const logPrefix = `Helm: _package.initHelmPatchDojo()`;
  // patch window.dojox.gfx.svg.Text.prototype.getTextWidth hangs
  /** get the text width in pixels */
  // @ts-ignore
  await timeout(async () => {
    try { dojo.require('dojo.ready'); } catch (err: any) {
      _package.logger.warning(err.message);
    }
    try { dojo.require('dojo.window'); } catch (err: any) {
      _package.logger.warning(err.message);
    }
    try { dojo.require('dojo.io.script'); } catch (err: any) {
      _package.logger.warning(err.message);
    }
    try { dojo.require('dojo.request.iframe'); } catch (err: any) {
      _package.logger.warning(err.message);
    }
    try { dojo.require('dojo.dom'); } catch (err: any) {
      _package.logger.warning(err.message);
    }
    try { dojo.require('dojox.gfx'); } catch (err: any) {
      _package.logger.warning(err.message);
    }
    try { dojo.require('dojox.gfx.svg'); } catch (err: any) {
      _package.logger.warning(err.message);
    }
    try { dojo.require('dojox.gfx.shape'); } catch (err: any) {
      _package.logger.warning(err.message);
    }
    // @formatter:off
    while (!(
      dojo && dojo.window && dojo.io?.script && dojo.request?.iframe &&
      dojox && dojox.gfx && dojox.gfx?.svg && dojox.gfx?.shape && !dojox.gfx?.createSurface
    )) await delay(100);
    // @formatter:on
  }, 60000, 'timeout dojox.gfx.svg');

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
  public alertOriginal: (s: string) => void;
  public readonly hh: HelmHelper;

  constructor() {
    super();
    this.hh = new HelmHelper(this.logger);
  }

  public initHelmPatchScilAlert(): void {
    const logPrefix: string = 'Helm: initHelmPatchScilAlert()';
    this.alertOriginal = scil.Utils.alert;
    scil.Utils.alert = (s: string): void => {
      this.logger.warning(`${logPrefix}, scil.Utils.alert() s: "${s}".`);
    };
  }

  /** Patches Pistoia Monomers.getMonomer method to utilize DG Bio monomer Lib */
  public async initHelmPatchPistoia(monomerLib: IMonomerLib): Promise<void> {
    const logPrefix: string = 'Helm: initHelmPatchPistoia()';
    const monomers = org.helm.webeditor.Monomers;

    this.logger.debug(`${logPrefix}, this.getMonomerOriginal stored`);

    this.hh.overrideGetMonomer(this.hh.buildGetMonomerFromLib(monomerLib));

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
}
