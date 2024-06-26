import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {
  after, before, category, delay, expect, test, expectArray, testEvent, expectFloat, timeout
} from '@datagrok-libraries/utils/src/test';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {Atom, HelmType, IJsAtom, IWebEditorMonomer, GetMonomerFunc} from '@datagrok-libraries/bio/src/helm/types';
import {IMonomerLib, Monomer, MonomerLibSummaryType} from '@datagrok-libraries/bio/src/types';
import {IHelmHelper, getHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {getMonomerLibHelper, IMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';
import {UserLibSettings} from '@datagrok-libraries/bio/src/monomer-works/types';
import {
  getUserLibSettings, setUserLibSettings, setUserLibSettingsForTests
} from '@datagrok-libraries/bio/src/monomer-works/lib-settings';
import {defaultMonomerLibSummary, expectMonomerLib} from '@datagrok-libraries/bio/src/tests/monomer-lib-tests';

import {getMonomerHandleArgs} from '../utils/get-monomer';
import {JSDraw2HelmModule, OrgHelmModule} from '../types';

import {_package} from '../package-test';
import {HelmHelper} from '../helm-helper';
import {RGROUP_CAP_GROUP_NAME, RGROUP_LABEL, SMILES} from '../constants';
import {getRS} from '../utils/get-monomer-dummy';

declare const org: OrgHelmModule;
declare const JSDraw2: JSDraw2HelmModule;

type TestDataType = { args: { a: any, name?: string }, tgt: any };

const tests: { [testName: string]: TestDataType } = {
  /* eslint-disable */
  //@formatter:off
  t0:{"args":{"a":"HELM_BASE","name":"A"},"tgt":{"id":"A","m":"HELM Core Monomer library\n  Ketcher 10131612512D 1   1.00000     0.00000     0\n\n 11 12  0     0  0            999 V2000\n    0.9632   -3.5449    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0970   -4.0450    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0970   -5.0451    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.9630   -5.5451    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    1.8291   -5.0452    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    1.8293   -4.0451    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8536   -5.3539    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.4413   -4.5449    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8535   -3.7357    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    0.9632   -2.5448    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.1626   -6.3051    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1 10  1  0     0  0\n  1  6  2  0     0  0\n  1  2  1  0     0  0\n  9  2  1  0     0  0\n  2  3  2  0     0  0\n  7  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  2  0     0  0\n  5  6  1  0     0  0\n  7  8  1  0     0  0\n  7 11  1  0     0  0\n  8  9  2  0     0  0\nA   11\nR1\nM  END\n","n":"Adenine","na":"A","rs":1,"at":{"R1":"H"}}},
  t1:{"args":{"a":"HELM_BASE","name":"C"},"tgt":{"id":"C","m":"HELM Core Monomer library\nHELMMonomers071816.sdf \n\n  9  9  0  0  0  0  0  0  0  0999 V2000\n   10.7683  -10.8385    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   10.7683  -12.3385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -13.0885    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.1683  -12.3385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    8.1683  -10.8385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -10.0885    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733   -8.5885    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -14.5885    0.0000 R1  0  0  0  0  0  0  0  0  0  0  0  0\n   12.0673  -13.0885    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0        0\n  2  3  1  0        0\n  3  4  1  0        0\n  4  5  2  0        0\n  5  6  1  0        0\n  1  6  2  0        0\n  6  7  1  0        0\n  3  8  1  0        0\n  2  9  2  0        0\nA    8\nR1\nM  END\n","n":"Cytosine","na":"C","rs":1,"at":{"R1":"H"}}},
  t2:{"args":{"a":"HELM_BASE","name":"G"},"tgt":{"id":"G","m":"HELM Core Monomer library\nHELMMonomers071816.sdf \n\n 12 13  0  0  0  0  0  0  0  0999 V2000\n   12.7698  -10.2854    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   12.7698  -11.7854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4733  -12.5380    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   10.1698  -11.7854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   10.1698  -10.2854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4748   -9.5354    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    7.8623  -11.0354    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    8.7448   -9.8154    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4748   -8.0354    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.0689  -12.5354    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.7448  -12.2479    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.2789  -13.6737    0.0000 R1  0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0        0\n  2  3  2  0        0\n  3  4  1  0        0\n  4  5  2  0        0\n  5  6  1  0        0\n  1  6  1  0        0\n  7  8  2  0        0\n  5  8  1  0        0\n  6  9  2  0        0\n  2 10  1  0        0\n  4 11  1  0        0\n  7 11  1  0        0\n 11 12  1  0        0\nA   12\nR1\nM  END\n","n":"Guanine","na":"G","rs":1,"at":{"R1":"H"}}},
  t3:{"args":{"a":"HELM_LINKER","name":"p"},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  t4:{"args":{"a":"HELM_SUGAR","name":"p"},"tgt":null},
  t5:{"args":{"a":"HELM_SUGAR","name":"r"},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t6:{"args":{"a":{"T":"ATOM","p":{"x":144,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":4}},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t7:{"args":{"a":{"T":"ATOM","p":{"x":144,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":4}},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t8:{"args":{"a":{"T":"ATOM","p":{"x":144,"y":48},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_BASE","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"G","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":5}},"tgt":{"id":"G","m":"HELM Core Monomer library\nHELMMonomers071816.sdf \n\n 12 13  0  0  0  0  0  0  0  0999 V2000\n   12.7698  -10.2854    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   12.7698  -11.7854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4733  -12.5380    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   10.1698  -11.7854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   10.1698  -10.2854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4748   -9.5354    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    7.8623  -11.0354    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    8.7448   -9.8154    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4748   -8.0354    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.0689  -12.5354    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.7448  -12.2479    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.2789  -13.6737    0.0000 R1  0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0        0\n  2  3  2  0        0\n  3  4  1  0        0\n  4  5  2  0        0\n  5  6  1  0        0\n  1  6  1  0        0\n  7  8  2  0        0\n  5  8  1  0        0\n  6  9  2  0        0\n  2 10  1  0        0\n  4 11  1  0        0\n  7 11  1  0        0\n 11 12  1  0        0\nA   12\nR1\nM  END\n","n":"Guanine","na":"G","rs":1,"at":{"R1":"H"}}},
  t9:{"args":{"a":{"T":"ATOM","p":{"x":192,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_LINKER","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"p","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":6}},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  t10:{"args":{"a":{"T":"ATOM","p":{"x":192,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_LINKER","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"p","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":6}},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  t11:{"args":{"a":{"T":"ATOM","p":{"x":205,"y":136},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null,"annotation":"5'","annotationshowright":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":1,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"r"},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t12:{"args":{"a":{"T":"ATOM","p":{"x":205,"y":184},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_BASE","id":1,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"A","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":2,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"A"},"tgt":{"id":"A","m":"HELM Core Monomer library\n  Ketcher 10131612512D 1   1.00000     0.00000     0\n\n 11 12  0     0  0            999 V2000\n    0.9632   -3.5449    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0970   -4.0450    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0970   -5.0451    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.9630   -5.5451    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    1.8291   -5.0452    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    1.8293   -4.0451    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8536   -5.3539    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.4413   -4.5449    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8535   -3.7357    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    0.9632   -2.5448    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.1626   -6.3051    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1 10  1  0     0  0\n  1  6  2  0     0  0\n  1  2  1  0     0  0\n  9  2  1  0     0  0\n  2  3  2  0     0  0\n  7  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  2  0     0  0\n  5  6  1  0     0  0\n  7  8  1  0     0  0\n  7 11  1  0     0  0\n  8  9  2  0     0  0\nA   11\nR1\nM  END\n","n":"Adenine","na":"A","rs":1,"at":{"R1":"H"}}},
  t13:{"args":{"a":{"T":"ATOM","p":{"x":240,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":7}},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t14:{"args":{"a":{"T":"ATOM","p":{"x":240,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":7}},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t15:{"args":{"a":{"T":"ATOM","p":{"x":240,"y":48},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_BASE","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"C","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":8}},"tgt":{"id":"C","m":"HELM Core Monomer library\nHELMMonomers071816.sdf \n\n  9  9  0  0  0  0  0  0  0  0999 V2000\n   10.7683  -10.8385    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   10.7683  -12.3385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -13.0885    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.1683  -12.3385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    8.1683  -10.8385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -10.0885    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733   -8.5885    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -14.5885    0.0000 R1  0  0  0  0  0  0  0  0  0  0  0  0\n   12.0673  -13.0885    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0        0\n  2  3  1  0        0\n  3  4  1  0        0\n  4  5  2  0        0\n  5  6  1  0        0\n  1  6  2  0        0\n  6  7  1  0        0\n  3  8  1  0        0\n  2  9  2  0        0\nA    8\nR1\nM  END\n","n":"Cytosine","na":"C","rs":1,"at":{"R1":"H"}}},
  t16:{"args":{"a":{"T":"ATOM","p":{"x":253,"y":136},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_LINKER","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"p","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":3,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"p"},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  t17:{"args":{"a":{"T":"ATOM","p":{"x":288,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_LINKER","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"p","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":9}},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  t18:{"args":{"a":{"T":"ATOM","p":{"x":301,"y":136},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null,"annotation":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":1,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"r"},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t19:{"args":{"a":{"T":"ATOM","p":{"x":301,"y":184},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_BASE","id":2,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"G","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":2,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"G"},"tgt":{"id":"G","m":"HELM Core Monomer library\nHELMMonomers071816.sdf \n\n 12 13  0  0  0  0  0  0  0  0999 V2000\n   12.7698  -10.2854    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   12.7698  -11.7854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4733  -12.5380    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   10.1698  -11.7854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   10.1698  -10.2854    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4748   -9.5354    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    7.8623  -11.0354    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    8.7448   -9.8154    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   11.4748   -8.0354    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.0689  -12.5354    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.7448  -12.2479    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.2789  -13.6737    0.0000 R1  0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0        0\n  2  3  2  0        0\n  3  4  1  0        0\n  4  5  2  0        0\n  5  6  1  0        0\n  1  6  1  0        0\n  7  8  2  0        0\n  5  8  1  0        0\n  6  9  2  0        0\n  2 10  1  0        0\n  4 11  1  0        0\n  7 11  1  0        0\n 11 12  1  0        0\nA   12\nR1\nM  END\n","n":"Guanine","na":"G","rs":1,"at":{"R1":"H"}}},
  t20:{"args":{"a":{"T":"ATOM","p":{"x":349,"y":136},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_LINKER","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"p","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":6,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"p"},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  t21:{"args":{"a":{"T":"ATOM","p":{"x":397,"y":136},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null,"annotation":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":1,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"r"},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t22:{"args":{"a":{"T":"ATOM","p":{"x":397,"y":184},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_BASE","id":3,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"C","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":2,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"C"},"tgt":{"id":"C","m":"HELM Core Monomer library\nHELMMonomers071816.sdf \n\n  9  9  0  0  0  0  0  0  0  0999 V2000\n   10.7683  -10.8385    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   10.7683  -12.3385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -13.0885    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    8.1683  -12.3385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    8.1683  -10.8385    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -10.0885    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733   -8.5885    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    9.4733  -14.5885    0.0000 R1  0  0  0  0  0  0  0  0  0  0  0  0\n   12.0673  -13.0885    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0        0\n  2  3  1  0        0\n  3  4  1  0        0\n  4  5  2  0        0\n  5  6  1  0        0\n  1  6  2  0        0\n  6  7  1  0        0\n  3  8  1  0        0\n  2  9  2  0        0\nA    8\nR1\nM  END\n","n":"Cytosine","na":"C","rs":1,"at":{"R1":"H"}}},
  t23:{"args":{"a":{"T":"ATOM","p":{"x":445,"y":136},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_LINKER","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"p","color":null,"hcount":null,"selected":false,"f":0,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":9,"ringclosures":null,"_outside":false,"_haslabel":false},"name":"p"},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  t24:{"args":{"a":{"T":"ATOM","p":{"x":48,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":1}},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t25:{"args":{"a":{"T":"ATOM","p":{"x":48,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_SUGAR","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"r","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":1}},"tgt":{"id":"r","m":"HELM Core Monomer library\n  Ketcher 10111608242D 1   1.00000     0.00000     0\n\n 12 12  0     0  0            999 V2000\n  -31.2431   12.8416    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.9523   11.8849    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.9523   11.8659    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.6254   12.8108    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -30.4231   13.4140    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.1882   13.1686    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5552   11.0872    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -31.5220   10.0877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -29.3803   11.0458    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -28.6686   13.1017    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  -32.3775   14.1506    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  -33.2435   14.6506    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\n  1  6  1  1     0  0\n  2  7  1  6     0  0\n  7  8  1  0     0  0\n  3  9  1  6     0  0\n  4 10  1  1     0  0\n  6 11  1  0     0  0\n 11 12  1  0     0  0\nA    8\nR2\nA   10\nR3\nA   12\nR1\nM  END\n","n":"Ribose","na":"r","rs":3,"at":{"R1":"H","R2":"H","R3":"OH"}}},
  t26:{"args":{"a":{"T":"ATOM","p":{"x":48,"y":48},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_BASE","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"A","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":2}},"tgt":{"id":"A","m":"HELM Core Monomer library\n  Ketcher 10131612512D 1   1.00000     0.00000     0\n\n 11 12  0     0  0            999 V2000\n    0.9632   -3.5449    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0970   -4.0450    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0970   -5.0451    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.9630   -5.5451    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    1.8291   -5.0452    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    1.8293   -4.0451    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8536   -5.3539    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.4413   -4.5449    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8535   -3.7357    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n    0.9632   -2.5448    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.1626   -6.3051    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1 10  1  0     0  0\n  1  6  2  0     0  0\n  1  2  1  0     0  0\n  9  2  1  0     0  0\n  2  3  2  0     0  0\n  7  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  2  0     0  0\n  5  6  1  0     0  0\n  7  8  1  0     0  0\n  7 11  1  0     0  0\n  8  9  2  0     0  0\nA   11\nR1\nM  END\n","n":"Adenine","na":"A","rs":1,"at":{"R1":"H"}}},
  t27:{"args":{"a":{"T":"ATOM","p":{"x":96,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_LINKER","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"p","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"_parent":"[object Object]","_aaid":3}},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  t28:{"args":{"a":{"T":"ATOM","p":{"x":96,"y":0},"charge":0,"isotope":null,"radical":null,"group":null,"alias":null,"superatom":null,"attachpoints":[],"rgroup":null,"bio":{"type":"HELM_LINKER","id":null,"ambiguity":null},"locked":false,"hidden":null,"_rect":null,"elem":"p","color":null,"hcount":null,"selected":false,"f":null,"bonds":null,"id":null,"atommapid":null,"query":null,"hasError":null,"hs":null,"val":null,"tag":null,"_parent":"[object Object]","_aaid":3}},"tgt":{"id":"p","m":"HELM Core Monomer library\n  Ketcher 10061618102D 1   1.00000     0.00000     0\n\n  5  4  0     0  0            999 V2000\n   15.7527  -12.0837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.7527  -13.0837    0.0000 P   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6188  -13.5837    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.2527  -13.9496    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.7868  -12.8248    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  2  4  2  0     0  0\n  2  5  1  0     0  0\nA    1\nR1\nA    3\nR2\nM  END\n","n":"Phosphate","na":"p","rs":2,"at":{"R1":"OH","R2":"OH"}}},
  //@formatter:off
  /* eslint-enable */
};

category('getMonomer', ()=>{
  let libHelper: IMonomerLibHelper;
  let helmHelper: IHelmHelper;

  let monomerLibHelper: IMonomerLibHelper;
  /** Backup actual user's monomer libraries settings */
  let userLibSettings: UserLibSettings;

  before(async ()=>{
    [libHelper, helmHelper] = await Promise.all([getMonomerLibHelper(), getHelmHelper()]);

    await timeout(async () => { monomerLibHelper = await getMonomerLibHelper(); }, 5000,
      'get monomerLibHelper');
    await timeout(async () => { userLibSettings = await getUserLibSettings(); }, 5000,
      'get user lib settings for backup');

    // Tests 'findMonomers' requires default monomer library loaded
    await timeout(async () => { await setUserLibSettingsForTests(); }, 5000,
      'set user lib settings for tests');
    await timeout(async ()=> { await monomerLibHelper.awaitLoaded(); }, 5000,
      'await monomerLib to be loaded');
    await timeout(async () => { await monomerLibHelper.loadLibraries(true); }, 5000,
      'reload monomerLib with settings for tests'); // load default libraries for tests
  });

  after(async ()=>{
    await setUserLibSettings(userLibSettings);
    await monomerLibHelper.loadLibraries(true);
  });

  test('original', async () =>{
    const monomerLib = libHelper.getBioLib();
    rewriteLibraries(monomerLib);

    // const overriddenGetMonomer = helmHelper.revertOriginalGetMonomer();
    // try {
    const helmHelper: IHelmHelper = await getHelmHelper();
    expect(helmHelper != null, true);
    // @ts-ignore
    const getMonomerFunc = helmHelper.originalGetMonomer!;

    return _testAll('original', getMonomerFunc);
    // } finally {
    //   helmHelper.overrideGetMonomer(overriddenGetMonomer);
    // }
  }, {isAggregated: true});

  test('monomerLib', async () =>{
    const monomerLib = monomerLibHelper.getBioLib();
    expectMonomerLib(monomerLib);

    const getMonomerFunc = org.helm.webeditor.Monomers.getMonomer;
    return _testAll('monomerLib', getMonomerFunc);
  }, {isAggregated: true});

  function _testAll(prefix: string, getMonomerFunc: GetMonomerFunc): DG.DataFrame {
    const resDf = DG.DataFrame.fromColumns([
      DG.Column.fromStrings('subTest', []),
      DG.Column.fromList(DG.COLUMN_TYPE.BOOL, 'success', []),
      DG.Column.fromStrings('res', []),
      DG.Column.fromStrings('tgt', []),
      DG.Column.fromStrings('error', []),
      DG.Column.fromStrings('stack', []),
    ]);

    // const testCount: number = Object.keys(tests).length + 1;
    // //* eslint-disable no-array-constructor */
    // const subTestList: string[] = new Array<string>(testCount);
    // const successList: boolean[] = new Array<boolean>(testCount);
    // const resList: string[] = new Array<string>(testCount);
    // const tgtList:string[] = new Array<string>(testCount);
    // const errorList: string[] = new Array<string>(testCount);
    // const stackList: string[] = new Array<string>(testCount);
    // /* eslint-enable no-array-constructor */

    const resI = resDf.rows.addNew().idx;
    resDf.set('subTest', resI, 'Monomer lib');
    resDf.set('res', resI, '');
    resDf.set('tgt', resI, '');
    try {
      const monomerLib = monomerLibHelper.getBioLib();
      expectMonomerLib(monomerLib);
      resDf.set('success', resI, true);
    } catch (err) {
      const [errMsg, errStack] = errInfo(err);
      resDf.set('error', resI, errMsg);
      resDf.set('stack', resI, errStack);
      resDf.set('success', resI, false);
    }

    for (const [[testName, testData], testI] of wu.enumerate(Object.entries(tests))) {
      const a: Atom<HelmType> | HelmType = getAtomFromJson(testData.args.a);
      const [biotype, elem] = getMonomerHandleArgs(a, testData.args.name);
      const tgt = testData.tgt;

      const resI = resDf.rows.addNew().idx;
      resDf.set('subTest', resI, `${prefix}-${testName}-${biotype}-${elem}`);
      resDf.set('tgt', resI, JSON.stringify(tgt ? {id: tgt.id, n: tgt.n, rs: tgt.rs} : null));
      try {
        const res: any = getMonomerFunc(a, testData.args.name);
        resDf.set('res', resI, JSON.stringify(res ? {id: res.id, n: res.n, rs: res.rs} : null));
        expectObjectWithNull(res, tgt);
        resDf.set('success', resI, true);
      } catch (err) {
        const [errMsg, errStack] = errInfo(err);
        resDf.set('error', resI, errMsg);
        resDf.set('stack', resI, errStack);
        resDf.set('success', resI, false);
      }
    }
    return resDf;
  }

  test('missing', async ()=> {
    /* Tests getMonomer function adding missing monomers. */
    const helmStr = 'PEPTIDE1{[mis1].R.[mis2].T.C.F}$$$$;';

    expectMonomerLib(monomerLibHelper.getBioLib());
    const editor = new JSDraw2.Editor(ui.div(), {viewonly: true});
    editor.setHelm(helmStr);
    const withMissing = JSON.parse(JSON.stringify(
      defaultMonomerLibSummary)) as MonomerLibSummaryType;
    withMissing['PEPTIDE'] += 2;
    expectMonomerLib(monomerLibHelper.getBioLib(), withMissing);
  });
});

function getAtomFromJson(argA: IJsAtom<HelmType> | HelmType): Atom<HelmType> | HelmType {
  let res: Atom<HelmType> | HelmType;
  const a = argA as IJsAtom<HelmType>;
  if (a.T === 'ATOM')
    res = new JSDraw2.Atom(a.p, a.elem, a.bio);
  else
    res = argA as HelmType;
  return res;
}

export function expectObjectWithNull(actual: { [key: string]: any }, expected: { [key: string]: any }) {
  if (actual == null && expected == null)
    return;
  else if (actual == null && expected != null)
    throw new Error('actual is null, but expected is not null');
  else if (actual!= null && expected == null)
    throw new Error('actual is not null, but expected is null');
  else {
    for (const [expectedKey, expectedValue] of Object.entries(expected)) {
      if (!(expectedKey in actual || actual.hasOwnProperty(expectedKey)))
        throw new Error(`Expected property "${expectedKey}" not found`);

      const actualValue = actual[expectedKey];
      if (actualValue instanceof Array && expectedValue instanceof Array)
        expectArray(actualValue, expectedValue);
      else if (actualValue instanceof Object && expectedValue instanceof Object)
        expectObjectWithNull(actualValue, expectedValue);
      else if (Number.isFinite(actualValue) && Number.isFinite(expectedValue))
        expectFloat(actualValue, expectedValue);
      else if (actualValue != expectedValue)
        throw new Error(`Expected (${expectedValue}) for key '${expectedKey}', got (${actualValue})`);
    }
  }
}

/** Fills org.helm.webeditor.Monomers dictionary for WebEditor */
function rewriteLibraries(monomerLib: IMonomerLib): void {
  org.helm.webeditor.Monomers.clear();
  monomerLib!.getPolymerTypes().forEach((polymerType) => {
    const monomerSymbols = monomerLib!.getMonomerSymbolsByType(polymerType);
    monomerSymbols.forEach((monomerSymbol) => {
      let isBroken = false;
      const monomer: Monomer = monomerLib!.getMonomer(polymerType, monomerSymbol)!;
      const webEditorMonomer: IWebEditorMonomer = {
        id: monomerSymbol,
        m: monomer.molfile,
        n: monomer.name,
        na: monomer.naturalAnalog,
        rs: monomer.rgroups.length,
        type: monomer.polymerType,
        mt: monomer.monomerType,
        at: {},
      };

      if (monomer.rgroups.length > 0) {
        // @ts-ignore
        webEditorMonomer.rs = monomer.rgroups.length;
        const at: { [prop: string]: any } = {};
        monomer.rgroups.forEach((it) => {
          at[it[RGROUP_LABEL]] = it[RGROUP_CAP_GROUP_NAME];
        });
        webEditorMonomer.at = at;
      } else if (monomer[SMILES] != null) {
        // @ts-ignore
        webEditorMonomer.rs = Object.keys(getRS(monomer[SMILES].toString())).length;
        webEditorMonomer.at = getRS(monomer[SMILES].toString());
      } else
        isBroken = true;

      if (!isBroken)
        org.helm.webeditor.Monomers.addOneMonomer(webEditorMonomer);
    });
  });

  // Obsolete
  const grid: DG.Grid = grok.shell.tv?.grid;
  if (grid) grid.invalidate();
}
