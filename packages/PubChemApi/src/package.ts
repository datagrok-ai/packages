/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {getBy, smilesToPubChem} from './pubchem';
import {getSearchWidget, buildAccordion} from './widget';
import {pubChemRest} from './tests/const';

export const _package = new DG.Package();

/*
name: PubChem | Info
tags: panel, widgets
input: string molString {semType: Molecule}
output: widget result
export async function pubChemPanel(molString: string): Promise<DG.Widget> {
  const pubChemId = await smilesToPubChem(molString);
  return new DG.Widget(ui.wait(async () => await buildAccordion(pubChemId)));
}
*/

//name: PubChem | Substructure Search
//tags: panel, widgets
//input: string molString {semType: Molecule}
//output: widget result
export async function pubChemSubstructureSearchPanel(molString: string): Promise<DG.Widget> {
  return molString ? await getSearchWidget(molString, 'substructure') : new DG.Widget(ui.divText('SMILES is empty'));
}

//name: PubChem | Similarity Search
//tags: panel, widgets
//input: string molString {semType: Molecule}
//output: widget result
export async function pubChemSimilaritySearchPanel(molString: string): Promise<DG.Widget> {
  return molString ? await getSearchWidget(molString, 'similarity') : new DG.Widget(ui.divText('SMILES is empty'));
}

//name: PubChem | Identity Search
//tags: panel, widgets
//input: string molString {semType: Molecule}
//output: widget result
export async function pubChemIdentitySearch(molString: string): Promise<DG.Widget> {
  return molString ? await getSearchWidget(molString, 'identity') : new DG.Widget(ui.divText('SMILES is empty'));
}

//name: pubChemToSmiles
//input: string id
//output: string smiles {semType: Molecule}
//meta.role: converter
//meta.inputRegexp: (^[0-9]+$)
//connection: PubChemApi
export async function pubChemToSmiles(id: string) {
  const url = `${pubChemRest}/pug/compound/cid/${id}/property/CanonicalSMILES/JSON`;
  const response = await grok.dapi.fetchProxy(url);
  const json = await response.json();
  return json['PropertyTable']['Properties'][0]['CanonicalSMILES'];
}

//name: inchiKeysToSmiles
//input: string id
//output: string smiles {semType: Molecule}
//meta.role: converter
//meta.inputRegexp: ([A-Z]{14}-[A-Z]{10}-N)
//connection: PubChemApi
export async function inchiKeysToSmiles(id: string) {
  const s = await getBy('InChIKey', 'cids', id);
  const cids = s['IdentifierList']['CID'][0];
  const smiles = await pubChemToSmiles(cids);
  return smiles;
}
