import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';

import { BiostructureData } from '@datagrok-libraries/bio/src/pdb/types';

import { BINDING_ENERGY_COL, CACHED_RESULTS, POSE_COL, setAffinity, setPose, TARGET_PATH } from './constants';

export function getFromPdbs(pdb: DG.SemanticValue, inBoltz: boolean = false): DG.DataFrame {
  const col = pdb.cell.column;
  if (CACHED_RESULTS.has(col.toString()))
    return CACHED_RESULTS.get(col.toString())!;
    
  const resultDf = DG.DataFrame.create(col.length);
  
  for (let idx = 0; idx < col.length; idx++) {
    const pdbValue = col.get(idx);
    const remarkRegex = inBoltz 
      ? /REMARK\s+\d+\s+([^\d]+?)\s+([-\d.]+)/g
      : /REMARK\s+\d+\s+([\w\s\(\)-]+)\.\s+([-\d.]+)/g;
    let match;
  
    while ((match = remarkRegex.exec(pdbValue)) !== null) {
      const colName = match[1].trim();
      const value = parseFloat(match[2].trim());
        
      let resultCol = resultDf.columns.byName(colName);
      if (!resultCol) resultCol = resultDf.columns.addNewFloat(colName);
        
      resultDf.set(colName, idx, value);
    }
  }
  
  CACHED_RESULTS.set(col.toString(), resultDf);
  
  return resultDf;
}
  
export async function getReceptorData(pdb: string): Promise<BiostructureData> {
  const match = pdb.match(/REMARK\s+1\s+receptor\.\s+(\S+)\s+J\./);
  const receptorName = match ? match[1] : '';
  const receptor = await getReceptorFile(receptorName);
  
  const receptorData: BiostructureData = {
    binary: false,
    data: receptor ? (await grok.dapi.files.readAsText(receptor)) : (await fetchPdbContent(receptorName.toUpperCase())),
    ext: receptor ? receptor.extension : 'pdb',
    options: {name: receptorName,},
  };
  return receptorData;
}
  
export async function getReceptorFile(receptorName: string): Promise<DG.FileInfo | undefined> {
  const receptorPath = `${TARGET_PATH}/${receptorName}`;
  const folderExists = await grok.dapi.files.exists(receptorPath);
  if (!folderExists) return undefined;
  
  const files = await grok.dapi.files.list(receptorPath);
  return files.find(file => ['pdbqt', 'pdb'].includes(file.extension));
}
  
async function fetchPdbContent(pdbId: string, format: string = 'pdb'): Promise<string> {
  const baseUrl = 'https://files.rcsb.org/download';
  const url = `${baseUrl}/${pdbId}.${format}`;
  
  try {
    const response = await grok.dapi.fetchProxy(url);
    if (response.ok) {
      const pdbContent = await response.text();
      return pdbContent;
    }
  } catch (error) {

  }
  return '';
}

export function prop(molecule: DG.SemanticValue, propertyCol: DG.Column, host: HTMLElement, descriptions: { [colName: string]: string }) : HTMLElement {
  const addColumnIcon = ui.iconFA('plus', () => {
    const df = molecule.cell.dataFrame;
    propertyCol.name = df.columns.getUnusedName(propertyCol.name);
    propertyCol.setTag(DG.TAGS.DESCRIPTION, descriptions[propertyCol.name]);
    df.columns.add(propertyCol);
  }, `Calculate ${propertyCol.name} for the whole table`);

  ui.tools.setHoverVisibility(host, [addColumnIcon]);
  $(addColumnIcon)
    .css('color', '#2083d5')
    .css('position', 'absolute')
    .css('top', '2px')
    .css('left', '-12px')
    .css('margin-right', '5px');
  
  const idx = molecule.cell.rowIndex;
  return ui.divH([addColumnIcon, propertyCol.get(idx)], {style: {'position': 'relative'}});
}

export function formatColumns(autodockResults: DG.DataFrame) {
  for (let col of autodockResults.columns.numerical)
    col.meta.format = '0.00';
}

export function addColorCoding(column: DG.GridColumn) {
  column.isTextColorCoded = true;
  column.column!.meta.colors.setLinear([DG.Color.green, DG.Color.red]);
}

export function processAutodockResults(autodockResults: DG.DataFrame, table: DG.DataFrame): DG.DataFrame {
  const affinityDescription = 'Estimated Free Energy of Binding.\
    Lower values correspond to stronger binding.';
  const poseCol = autodockResults.col(POSE_COL);
  poseCol!.name = table.columns.getUnusedName(POSE_COL);
  setPose(poseCol!.name);
  const affinityCol = autodockResults.col(BINDING_ENERGY_COL);
  affinityCol!.name = table.columns.getUnusedName(BINDING_ENERGY_COL);
  setAffinity(affinityCol!.name);
  const processedTable = DG.DataFrame.fromColumns([poseCol!, affinityCol!]);
  affinityCol!.setTag(DG.TAGS.DESCRIPTION, affinityDescription);
  return processedTable;
}