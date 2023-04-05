import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {smilesTo3DCoordinates} from '../scripts-api';
import {getRdKitModule} from '../utils/chem-common-rdkit';
import {_convertMolNotation} from '../utils/convert-notation-utils';

const WIDTH = 300;
const HEIGHT = 300;

export async function structure3dWidget(molecule: string): Promise<DG.Widget> {
  let sdf: string;
  try {
    sdf = (await smilesTo3DCoordinates(molecule)).replaceAll('\\n', '\n');
  } catch (e) {
    return new DG.Widget(ui.divText('Molecule has no atoms or malformed'));
  }
  const stringBlob = new Blob([sdf], {type: 'text/plain'});

  const nglHost = ui.div([], {classes: 'd4-ngl-viewer', id: 'ngl-3d-host'});
  nglHost.style.width = `${WIDTH}px`;
  nglHost.style.height = `${HEIGHT}px`;
  nglHost.style.backgroundColor = 'white';

  //@ts-ignore
  const stage = new NGL.Stage(nglHost, {backgroundColor: 'white'});
  //@ts-ignore
  stage.loadFile(stringBlob, {ext: 'sdf'}).then(function(comp: NGL.StructureComponent) {
    stage.setSize(WIDTH, WIDTH);
    comp.addRepresentation('ball+stick');
    comp.autoView();
  });
  return new DG.Widget(nglHost);
}
