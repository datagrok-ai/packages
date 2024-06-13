import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {v4 as uuidv4} from 'uuid';

import {FileInfo as msFileInfo} from 'molstar/lib/mol-util/file-info';
import {Color as msColor} from 'molstar/lib/mol-util/color';
import {StateObjectSelector} from 'molstar/lib/mol-state';
import {PluginStateObject} from 'molstar/lib/mol-plugin-state/objects';
import {StateTransforms} from 'molstar/lib/mol-plugin-state/transforms';
import {createVolumeRepresentationParams} from 'molstar/lib/mol-plugin-state/helpers/volume-representation-params';
import {PluginUIContext} from 'molstar/lib/mol-plugin-ui/context';
import {VolumeIsovalueInfo} from 'molstar/lib/apps/viewer';

import {BiostructureData} from '@datagrok-libraries/bio/src/pdb/types';

import {PluginCommands} from 'molstar/lib/mol-plugin/commands';
import {BuiltInTrajectoryFormat, TrajectoryFormatProvider} from 'molstar/lib/mol-plugin-state/formats/trajectory';
import {MolScriptBuilder} from 'molstar/lib/mol-script/language/builder';
import {Script} from 'molstar/lib/mol-script/script';
import {StructureSelection} from 'molstar/lib/mol-model/structure';

import {molecule3dFileExtensions} from './consts';

import {_package} from '../../package';

export type LigandData = {
  data: string,
  format: BuiltInTrajectoryFormat | TrajectoryFormatProvider,
  rowIdx: number
};

/** For molstar entities */
const LIGAND_LABEL: string = 'ligand';

enum ParsedParts {
  format = 'format', // No specific treatment
  trajectory = 'trajectory',
  structure = 'structure',
  topology = 'topology',
  shape = 'shape',
  volume = 'volume',
  volumes = 'volumes',
  // density = 'density',
}

export interface ISplash {
  close(): void;
}

export async function removeVisualsData(
  plugin: PluginUIContext, structureRefs: string[] | null, caller?: string
): Promise<void> {
  _package.logger.debug(`removeVisualsData(${caller ? ` <- ${caller}, ` : ''}` +
    `structureRefs = ${JSON.stringify(structureRefs)} )`);
  await Promise.all((structureRefs ?? []).map((ref) => {
    plugin.commands.dispatch(PluginCommands.State.RemoveObject,
      {
        state: plugin.state.data,
        ref: ref,
      });
  }));
}

/** Adds ligand and returns component keys. single component has multiple refs when created manually */
export async function addLigandOnStage(
  plugin: PluginUIContext, ligand: LigandData, _color: DG.Color | null, zoom: boolean
): Promise<string[]> {
  const ligandLabel: string = `<Ligand at row ${ligand.rowIdx}>`;
  const _molData = await plugin.builders.data.rawData({data: ligand.data, label: LIGAND_LABEL});
  const _molTrajectory = await plugin.builders.structure.parseTrajectory(_molData, ligand.format);
  const _model = await plugin.builders.structure.createModel(_molTrajectory);
  const _structure = await plugin.builders.structure.createStructure(_model);
  const _component = await plugin.builders.structure.tryCreateComponentStatic(
    _structure, 'ligand', {label: ligandLabel});
  await plugin.builders.structure.hierarchy.applyPreset(_molTrajectory, 'default',
    {representationPreset: 'polymer-and-ligand'});

  if (zoom) {
    const polymer = MolScriptBuilder.struct.generator.all();
    const sel = Script.getStructureSelection(polymer, _structure.data!);
    const loci = StructureSelection.toLociWithSourceUnits(sel);
    plugin.managers.structure.focus.addFromLoci(loci);
    plugin.managers.camera.focusLoci(loci);
  }
  return [_molData.ref, _molTrajectory.ref, _model.ref, _structure.ref, _component!.ref];
}

export async function parseAndVisualsData(
  plugin: PluginUIContext, dataEff: BiostructureData, caller?: string
): Promise<string[]> {
  const logPrefix = `parseAndVisualsData(${caller ? ` <- ${caller} ` : ''})`;
  if (!dataEff)
    throw new Error(`Argument null exception 'dataEff'.`);

  const refListRes: string[] = [];
  const binary = dataEff.binary !== undefined ? dataEff.binary : molecule3dFileExtensions[dataEff.ext].binary;
  const data: PluginStateObject.Data.Binary | PluginStateObject.Data.String = binary ?
    new PluginStateObject.Data.Binary(dataEff.data as Uint8Array) :
    new PluginStateObject.Data.String(dataEff.data as string);

  //await plugin.dataTransaction(async () => {
  const dataProvider = plugin.dataFormats.auto({ext: dataEff.ext} as msFileInfo, data)!;
  if (!dataProvider)
    throw new Error(`Can not find data provider for file ext '${dataEff.ext}'.`);

  const entryId = uuidv4();
  let dataVal: BiostructureData;
  if (dataEff.binary && (dataEff.ext === 'pdb' || dataEff.ext === 'pdbqt')) {
    dataVal = {
      binary: false, ext: dataEff.ext, options: dataEff.options,
      data: (new TextDecoder()).decode(dataEff.data as Uint8Array)
    };
  } else
    dataVal = dataEff;

  const _data = await plugin.builders.data.rawData(
    {data: dataVal.data, label: dataVal.options?.dataLabel});
  refListRes.push(_data.ref);
  const parsed = await dataProvider.parse(plugin, _data, {entryId: entryId});
  // refListRes.push(parsed.ref);
  validateParsedObject(parsed, dataVal);

  if (parsed.hasOwnProperty(ParsedParts.trajectory) || parsed.hasOwnProperty(ParsedParts.structure) ||
    parsed.hasOwnProperty(ParsedParts.topology) || parsed.hasOwnProperty(ParsedParts.shape) ||
    parsed.hasOwnProperty(ParsedParts.format)
  ) {
    if (dataProvider.visuals) {
      const visualsPromise = dataProvider.visuals(plugin, parsed);
      if (visualsPromise) {
        const visuals = await visualsPromise;
        if (!visuals || !('structure' in visuals) || !('ref' in visuals['structure']))
          _package.logger.warning(`${logPrefix}, unexpected visuals without .structure.ref`);
        else
          refListRes.push(visuals.structure.ref);
      }
    }
  }

  if (parsed.hasOwnProperty(ParsedParts.volume) || parsed.hasOwnProperty(ParsedParts.volumes)) {
    const firstVolume = (parsed.volume || parsed.volumes[0]) as StateObjectSelector<PluginStateObject.Volume.Data>;
    const repr = plugin.build();

    // Defaults
    const isovalues: VolumeIsovalueInfo[] = [{
      type: 'relative',
      value: 1,
      color: msColor(0x3377aa),
    }];

    for (const iso of isovalues) {
      const reprRes = repr
        .to(parsed.volumes?.[iso.volumeIndex ?? 0] ?? parsed.volume)
        .apply(
          StateTransforms.Representation.VolumeRepresentation3D,
          createVolumeRepresentationParams(plugin, firstVolume.data!, {
            type: 'isosurface',
            typeParams: {
              alpha: iso.alpha ?? 1,
              isoValue: iso.type === 'absolute' ? {kind: 'absolute', absoluteValue: iso.value} : {
                kind: 'relative',
                relativeValue: iso.value,
              },
            },
            color: 'uniform',
            colorParams: {value: iso.color},
          }));
    }

    await repr.commit();
    const k = 42;
  }

  const unhandledParsedPartList = Object.getOwnPropertyNames(parsed)
    .filter((propName) => !(Object.values(ParsedParts) as string[]).includes(propName));
  if (unhandledParsedPartList.length > 0)
    throw new Error(`Unhandled parsed parts '${JSON.stringify(unhandledParsedPartList)}'.`);

  _package.logger.debug(`${logPrefix} -> structureRefs = ${JSON.stringify(refListRes)} `);

  return refListRes;
}

export function buildSplash(root: HTMLElement, description: string): ISplash {
  const indicator = ui.loader();
  indicator.style.cssText = 'margin: 0 auto; padding-right:50px;';

  const panel = ui.divV([
    indicator,
    ui.p(description),
  ], {style: {textAlign: 'center'}});

  const loaderEl = ui.div([panel], 'bsv-modal-background');
  loaderEl.style.cssText = 'display:flex; justify-content:center; align-items:center; color:white';

  root.append(loaderEl);

  return new class implements ISplash {
    constructor(
      private readonly el: HTMLElement,
    ) {};

    close(): void { this.el.remove(); }
  }(loaderEl);
}

export function validateParsedObject(parsedObj: any, dataVal: BiostructureData): void {
  if (!Object.values(ParsedParts).some((pp) => pp in parsedObj && parsedObj[pp]))
    throw new Error(`Parsed object is empty, ext: '.${dataVal.ext}', name: '${dataVal.options?.name}'.`);
}
