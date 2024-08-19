import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {getRdKitService} from '../../utils/chem-common-rdkit';
import {webGPUMMP} from '@datagrok-libraries/math/src/webGPU/mmp/webGPU-mmp';
//import {getGPUDevice} from '@datagrok-libraries/math/src/webGPU/getGPUDevice';
import {MmpRules, MMP_CONSTRICTIONS, MMP_ERRORS} from './mmp-constants';
import {IMmpFragmentsResult} from '../../rdkit-service/rdkit-service-worker-substructure';


type MolecularPair = {
  first: number,
  second: number,
  core: string,
  firstR: string,
  secondR: string
}

/**
* Runs paralled fragmentation for molecules
* @param {DG.Column} molecules column with molecules
*/
export async function getMmpFrags(molecules: string[]): Promise<IMmpFragmentsResult> {
  const service = await getRdKitService();
  const res = await service.mmpGetFragments(molecules);
  return res;
}

export async function getMmpRules(
  fragsOut: IMmpFragmentsResult, fragmentCutoff: number, gpu: boolean, strictCPU = false):
  Promise<[MmpRules, number, boolean]> {
  let rules: MmpRules | null = null;
  let allCaseesNumber = 0;
  let useGpu = false;

  try {
    if (fragsOut.frags.length < 10 || !gpu || strictCPU) {
      if (fragsOut.frags.length > MMP_CONSTRICTIONS.CPU)
        throw new Error(MMP_ERRORS.FRAGMENTS_CPU);

      [rules, allCaseesNumber, useGpu] = getMmpRulesCPU(fragsOut, fragmentCutoff);
    } else {
      useGpu = true;
      [rules, allCaseesNumber, useGpu] = await getMmpRulesGPU(fragsOut, fragmentCutoff);
    }
  } catch (e: any) {
    const eMsg: string = e instanceof Error ? e.message : e.toString();
    if (eMsg === MMP_ERRORS.FRAGMENTS_CPU) {
      grok.shell.warning(MMP_ERRORS.GPU_ABORTED);
      grok.shell.error(MMP_ERRORS.FRAGMENTS_CPU);
      throw new Error(MMP_ERRORS.FRAGMENTS_CPU);
    }
    if (useGpu) {
      grok.shell.warning(MMP_ERRORS.GPU_ABORTED);
      [rules, allCaseesNumber, useGpu] = await getMmpRules(fragsOut, fragmentCutoff, gpu, true);
    } else {
      grok.shell.error(MMP_ERRORS.PAIRS);
      throw new Error(MMP_ERRORS.PAIRS);
    }
  }

  return [rules!, allCaseesNumber, useGpu];
}

function getBestFragmentPair(
  dimFirst: number, idxFirst: number,
  dimSecond: number, idxSecond: number,
  fragsOut: IMmpFragmentsResult): [string, string, string] {
  let core = '';
  let r1 = ''; // molecule minus core for first molecule in pair
  let r2 = ''; // molecule minus core for second molecule in pair

  //here we get the best possible fragment pair
  for (let p1 = 0; p1 < dimFirst; p1++) {
    for (let p2 = 0; p2 < dimSecond; p2++) {
      if (fragsOut.frags[idxFirst][p1][0] === fragsOut.frags[idxSecond][p2][0]) {
        const newCore = fragsOut.frags[idxFirst][p1][0];
        if (newCore.length > core.length) {
          core = newCore;
          r1 = fragsOut.frags[idxFirst][p1][1];
          r2 = fragsOut.frags[idxSecond][p2][1];
        }
      }
    }
  }

  return [core, r1, r2];
}

function fillRules(
  mmpRules: MmpRules,
  rFirst:string, idxFirst: number,
  rSecond: string, idxSecond: number,
  ruleCounter: number, allCasesCounter: number) {
  let ruleSmiles1 = mmpRules.smilesFrags.indexOf(rFirst);
  let ruleSmiles2 = mmpRules.smilesFrags.indexOf(rSecond);
  let ruleIndexStraight = -1;
  let ruleIndexInverse = -1;

  for (let ind = 0; ind < mmpRules.rules.length; ind++) {
    if (mmpRules.rules[ind].smilesRule1 == ruleSmiles1 && mmpRules.rules[ind].smilesRule2 == ruleSmiles2)
      ruleIndexStraight = ind;
    if (mmpRules.rules[ind].smilesRule1 == ruleSmiles2 && mmpRules.rules[ind].smilesRule2 == ruleSmiles1)
      ruleIndexInverse = ind;
  }

  if (ruleSmiles1 == -1) {
    mmpRules.smilesFrags.push(rFirst);
    ruleSmiles1 = mmpRules.smilesFrags.length -1;
  }
  if (ruleSmiles2 == -1) {
    mmpRules.smilesFrags.push(rSecond);
    ruleSmiles2 = mmpRules.smilesFrags.length -1;
  }

  const indxFirst = ruleSmiles1 < ruleSmiles2;
  if (ruleIndexStraight == -1) {
    mmpRules.rules.push({
      smilesRule1: indxFirst ? ruleSmiles1: ruleSmiles2,
      smilesRule2: indxFirst ? ruleSmiles2: ruleSmiles1,
      pairs: [],
    });
    mmpRules.rules[ruleCounter].pairs
      .push({firstStructure: indxFirst ? idxFirst : idxSecond, secondStructure: indxFirst ? idxSecond : idxFirst});
    ruleCounter++;
    mmpRules.rules.push({
      smilesRule1: indxFirst ? ruleSmiles2: ruleSmiles1,
      smilesRule2: indxFirst ? ruleSmiles1: ruleSmiles2,
      pairs: [],
    });
    mmpRules.rules[ruleCounter].pairs
      .push({firstStructure: indxFirst ? idxSecond : idxFirst, secondStructure: indxFirst ? idxFirst : idxSecond});
    ruleCounter++;
    allCasesCounter += 2;
  } else {
    mmpRules.rules[ruleIndexStraight].pairs
      .push({firstStructure: idxFirst, secondStructure: idxSecond});
    mmpRules.rules[ruleIndexInverse].pairs
      .push({firstStructure: idxSecond, secondStructure: idxFirst});
    allCasesCounter += 2;
  }

  return [ruleCounter, allCasesCounter];
}

function encodeFragments(fragsOut: IMmpFragmentsResult): [[number, number][][], string[], Uint32Array] {
  const res: [number, number][][] = new Array(fragsOut.frags.length)
    .fill(null).map((_, i) => new Array(fragsOut.frags[i].length).fill(null).map((_) => [0, 0]));

  let fragmetnCounter = 0;
  const fragmentMap: Record<string, number> = {};
  for (let i = 0; i < fragsOut.frags.length; i++) {
    for (let j = 0; j < fragsOut.frags[i].length; j++) {
      if (!fragmentMap[fragsOut.frags[i][j][0]]) {
        fragmentMap[fragsOut.frags[i][j][0]] = fragmetnCounter;
        fragmetnCounter++;
      }
      if (!fragmentMap[fragsOut.frags[i][j][1]]) {
        fragmentMap[fragsOut.frags[i][j][1]] = fragmetnCounter;
        fragmetnCounter++;
      }
      res[i][j][0] = fragmentMap[fragsOut.frags[i][j][0]];
      res[i][j][1] = fragmentMap[fragsOut.frags[i][j][1]];
    }
  }

  const maxFragmentIndex = fragmetnCounter;
  const fragIdToFragName = new Array<string>(maxFragmentIndex);
  Object.entries(fragmentMap).forEach(([key, val]) => {
    fragIdToFragName[val] = key;
  });

  const fragSizes = new Uint32Array(maxFragmentIndex).map((_, i) => fragIdToFragName[i].length);


  return [res, fragIdToFragName, fragSizes];
}

function getMmpRulesCPU(fragsOut: IMmpFragmentsResult, fragmentCutoff: number): [MmpRules, number, boolean] {
  const mmpRules: MmpRules = {rules: [], smilesFrags: []};
  const dim = fragsOut.frags.length;

  const pairs: MolecularPair[] = [];

  for (let i = 0; i < dim; i++) {
    const dimFirstMolecule = fragsOut.frags[i].length;
    for (let j = i + 1; j < dim; j++) {
      const dimSecondMolecule = fragsOut.frags[j].length;
      const [core, firstR, secondR] = getBestFragmentPair(dimFirstMolecule, i, dimSecondMolecule, j, fragsOut);
      if (core === '' ||
      firstR.length / core.length > fragmentCutoff ||
      secondR.length / core.length > fragmentCutoff) {/*idx++;*/ continue;}

      pairs.push({first: i, second: j, core, firstR, secondR});
    }
  }

  let ruleCounter = 0;
  let allCasesCounter = 0;

  for (let i = 0; i < pairs.length; i++) {
    [ruleCounter, allCasesCounter] = fillRules(mmpRules,
      pairs[i].firstR, pairs[i].first, pairs[i].secondR, pairs[i].second,
      ruleCounter, allCasesCounter);
  }

  return [mmpRules, allCasesCounter, false];
}

async function getMmpRulesGPU(fragsOut: IMmpFragmentsResult, fragmentCutoff: number):
  Promise<[MmpRules, number, boolean]> {
  const mmpRules: MmpRules = {rules: [], smilesFrags: []};

  const [encodedFrags, fragIdToFragName, fragSizes] = encodeFragments(fragsOut);
  const pairs = await webGPUMMP(encodedFrags, fragSizes, fragmentCutoff);

  let ruleCounter = 0;
  let allCasesCounter = 0;

  for (let i = 0; i < pairs!.coreIdx.length; i++) {
    [ruleCounter, allCasesCounter] = fillRules(mmpRules,
      fragIdToFragName[pairs!.frag1Idx[i]], pairs!.mol1Idx[i], fragIdToFragName[pairs!.frag2Idx[i]], pairs!.mol2Idx[i],
      ruleCounter, allCasesCounter);
  }

  return [mmpRules, allCasesCounter, true];
}
