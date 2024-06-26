import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {
  HelmType, IWebEditorMonomer, MonomerType, PolymerType, WebEditorRGroups
} from '@datagrok-libraries/bio/src/helm/types';

import {Monomer} from '@datagrok-libraries/bio/src/types/index';
import {
  HELM_REQUIRED_FIELD as REQ, HELM_OPTIONAL_FIELDS as OPT, HELM_RGROUP_FIELDS as RGP,
} from '@datagrok-libraries/bio/src/utils/const';

export function getRS(smiles: string) {
  const newS = smiles.match(/(?<=\[)[^\][]*(?=])/gm);
  const res: { [name: string]: string } = {};
  let el = '';
  let digit;
  if (!!newS) {
    for (let i = 0; i < newS.length; i++) {
      if (newS[i] != null) {
        if (/\d/.test(newS[i])) {
          digit = newS[i][newS[i].length - 1];
          newS[i] = newS[i].replace(/[0-9]/g, '');
          for (let j = 0; j < newS[i].length; j++) {
            if (newS[i][j] != ':')
              el += newS[i][j];
          }
          res['R' + digit] = el;
          el = '';
        }
      }
    }
  }
  return res;
}

/* eslint-disable camelcase */
export abstract class DummyWebEditorMonomer implements IWebEditorMonomer {
  //@formatter:off
  public abstract get backgroundcolor(): string | undefined;
  public abstract get linecolor(): string | undefined;
  public abstract get textcolor(): string | undefined;
  //@formatter:on

  get issmiles(): boolean { return !!this.smiles; }

  /** R-Group index os single digit only is allowed in Pistoia code */
  public readonly at: WebEditorRGroups = {
    R1: 'H', R2: 'H', R3: 'H', R4: 'H', R5: 'H', R6: 'H', R7: 'H', R8: 'H', R9: 'H'
  };

  public get rs(): number { return Object.keys(this.at).length; }

  protected constructor(
    public readonly biotype: string,
    /** symbol */ public readonly id: string,
    /** name */ public readonly n: string | undefined = 'missing',
    /** molfile */ public readonly m: string | undefined = undefined,
    /* Pistoia.HELM deletes .type and .mt in Monomers.addOneMonomer() */
    /** polymer type */ public readonly type: PolymerType | undefined = undefined,
    /** monomer type */ public readonly mt: MonomerType | undefined = undefined,
    public readonly smiles?: string,
  ) {
    if (!this.id)
      throw new Error('Invalid arg undefined [id].');

    // return new Proxy(this, {
    //   get: (target: any, prop: string | symbol, _receiver: any) => {
    //     const logPrefix = `${this.toLog()}.proxy.get( '${String(prop)}' )`;
    //     switch (prop) {
    //     case 'id':
    //     case 'at':
    //     case 'na':
    //     case 'nature':
    //     case 'backgroundcolor':
    //     case 'linecolor':
    //     case 'textcolor': {
    //       // these attributes are known and handled
    //       return target[prop];
    //     }
    //     case 'rs': {
    //       /* R-Group count (?), 2 is default for monomer "?" */
    //       throw new Error('Not supported get "rs" attribute.');
    //     }
    //     default:
    //       // Unexpected attribute requested
    //       _package.logger.warning(`${logPrefix}`);
    //       return target[prop];
    //     }
    //   },
    //   set: (target, prop, value: any, _receiver: any): boolean => {
    //     throw new Error(`Not supported set '${String(prop)}' attribute, any.`);
    //   },
    //   apply: (target: any, thisArg: any, argArray: any[]): any | undefined => {
    //     throw new Error(`Not supported call (apply) '${thisArg.toString()}' method, any.`);
    //   }
    // });
  }

  private static objCounter: number = -1;
  private readonly objId: number = ++DummyWebEditorMonomer.objCounter;

  private readonly className: string = 'DummyWebEditorMonomer';

  protected toLog(): string {
    return `Helm: ${this.className}<${this.objId}>`;
  }
}

export class GapWebEditorMonomer extends DummyWebEditorMonomer {
  public readonly backgroundcolor: string = '#FFFFFF';
  public readonly linecolor: string = '#808080';
  public readonly textcolor: string = '#808080';

  constructor(biotype: string, id: string) {
    super(biotype, id, 'gap');
  }
}

export class AmbiguousWebEditorMonomer extends DummyWebEditorMonomer {
  public readonly backgroundcolor: string = '#808080';
  public readonly linecolor: string = '#000000';
  public readonly textcolor: string = '#000000';

  constructor(biotype: string, id: string) {
    super(biotype, id, 'ambiguous');
  }
}

export class MissingWebEditorMonomer extends DummyWebEditorMonomer {
  public readonly backgroundcolor: string = '#FF4444';
  public readonly linecolor: string = '#800000';
  public readonly textcolor: string = '#FFFFFF';

  constructor(biotype: string, id: string) {
    super(biotype, id, 'missing');
  }
}

export class BrokenWebEditorMonomer extends DummyWebEditorMonomer {
  public readonly backgroundcolor: string = '#FFFF44';
  public readonly linecolor: string = '#800000';
  public readonly textcolor: string = '#000000';

  constructor(biotype: string, id: string) {
    super(biotype, id, 'broken');
  }
}
