/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {LIB_PATH, DEFAULT_LIB_FILENAME} from './const';
import {SYNTHESIZERS, TECHNOLOGIES} from '../hardcode-to-be-eliminated/map';

import {Monomer} from '@datagrok-libraries/bio/src/types';

type CodesField = {
  [synthesizer: string]: {
    [technology: string]: string[]
  }
}

type MonomerExtension = {
  [key: string]: string | CodesField
}

type ExtendedMonomer = Monomer & MonomerExtension;

type FormattedMonomer = {
  [key: string]: string
}

const EXTENDED_SYNTHESIZERS = Object.assign({}, SYNTHESIZERS, {'Modification': 'Modification'});

const EXTENDED_TECHNOLOGIES = Object.assign({}, TECHNOLOGIES, {'modification': 'modification'});

const enum RELEVANT_FIELD {
  NAME = 'name',
  MOLFILE = 'molfile',
  CODES = 'codes',
}

export async function viewMonomerLib(): Promise<void> {
  const table = await parseMonomerLib(LIB_PATH, DEFAULT_LIB_FILENAME);
  table.name = 'Monomer Lib Viewer';
  grok.shell.addTableView(table);
}

async function parseMonomerLib(path: string, fileName: string): Promise<DG.DataFrame> {
  const fileSource = new DG.FileSource(path);
  const file = await fileSource.readAsText(fileName);
  const objList = JSON.parse(file);
  const formattedObjectsList = new Array(objList.length);
  for (let i = 0; i < objList.length; i++)
    formattedObjectsList[i] = formatMonomerObject(objList[i]);
  const df = DG.DataFrame.fromObjects(formattedObjectsList)!;
  return df;
}

function formatMonomerObject(sourceObj: ExtendedMonomer): FormattedMonomer {
  const formattedObject: FormattedMonomer = {};
  formattedObject[RELEVANT_FIELD.NAME] = sourceObj[RELEVANT_FIELD.NAME];
  formattedObject[RELEVANT_FIELD.MOLFILE] = sourceObj[RELEVANT_FIELD.MOLFILE];
  const codes = sourceObj[RELEVANT_FIELD.CODES] as CodesField;
  for (const synthesizer of Object.values(EXTENDED_SYNTHESIZERS)) {
    const fieldName = synthesizer;
    const valuesList = [];
    const technologySet = new Set();
    for (const technology of Object.values(EXTENDED_TECHNOLOGIES)) {
      if (codes[synthesizer] !== undefined) {
        if (codes[synthesizer][technology] !== undefined) {
          valuesList.push(codes[synthesizer][technology].toString());
          technologySet.add(technology);
        }
      }
    }
    formattedObject['technologies'] = [...technologySet].toString();
    formattedObject[fieldName] = valuesList.toString();
  }
  console.log('formatted:', formattedObject);
  return formattedObject;
}
