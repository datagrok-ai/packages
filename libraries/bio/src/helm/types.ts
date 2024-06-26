import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import type {
  HelmType, PolymerType, MonomerType, IWebEditorMonomer, WebEditorRGroups, IMonomerColors
} from '@datagrok-libraries/js-draw-lite/src/types/org';

import type {Atom} from '@datagrok-libraries/js-draw-lite/src/Atom';
import type {IJsAtom} from '@datagrok-libraries/js-draw-lite/src/types/jsdraw2';
import type {Bond} from '@datagrok-libraries/js-draw-lite/src/Bond';
import type {Mol} from '@datagrok-libraries/js-draw-lite/src/Mol';
import type {Editor} from '@datagrok-libraries/js-draw-lite/src/JSDraw.Editor';

import type {App} from '@datagrok-libraries/helm-web-editor/helm/App';
import type {
  IOrgHelmWebEditor, IOrgHelmMonomers, GetMonomerFunc, GetMonomerResType
} from '@datagrok-libraries/helm-web-editor/src/types/org-helm';
import type {HweWindow} from '@datagrok-libraries/helm-web-editor/src/types';

import type {JSDraw2ModuleType, ScilModuleType} from '@datagrok-libraries/js-draw-lite/src/types';
import type {OrgType} from '@datagrok-libraries/helm-web-editor/src/types/org-helm';
import type {Monomers} from '@datagrok-libraries/helm-web-editor/helm/Monomers';
import type {DojoType, DojoxType} from '@datagrok-libraries/js-draw-lite/src/types/dojo';

export {HelmType, PolymerType, MonomerType, WebEditorRGroups};
export {Atom, IJsAtom, Bond, Mol, Editor};

export {
  IWebEditorMonomer, IMonomerColors, IOrgHelmWebEditor, IOrgHelmMonomers, App,
  Monomers, GetMonomerFunc, GetMonomerResType
};

export {DojoType, DojoxType};
export {HweWindow, ScilModuleType, JSDraw2ModuleType, OrgType};


export interface IHelmWebEditor {
  get editor(): Editor<HelmType>;
  get host(): HTMLDivElement;

  resizeEditor(width: number, height: number): void;
}
