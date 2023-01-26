import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {
  after,
  before,
  category,
  test,
  expect,
  expectArray,
  expectObject,
  Test
} from '@datagrok-libraries/utils/src/test';

import {_package} from '../../src/package-test';
import {TreeHelper} from '../utils/tree-helper';
import {NO_NAME_ROOT, parseNewick} from '@datagrok-libraries/bio/src/trees/phylocanvas';
import {ITreeHelper} from '@datagrok-libraries/bio/src/trees/tree-helper';
import {NodeType} from '@datagrok-libraries/bio/src/trees';

const enum Tests {
  nwk1 = 'nwk1',
  noNameRoot = 'noNameRoot',
}

const data: {
  [name: string]: { nwk: string, tgtLeafNameList: string[], tgtNodeNameList: string[], tgtNewickToDf: DG.DataFrame }
} = {
  [Tests.nwk1]: {
    nwk: `(
  leaf1:0.18,
  (
    leaf2:0.13,
    leaf3:0.01
  )node-l2-l3:0.17
)node-l1-l2-l3:0.14;`,
    tgtLeafNameList: ['leaf1', 'leaf2', 'leaf3'],
    tgtNodeNameList: ['node-l1-l2-l3', 'leaf1', 'node-l2-l3', 'leaf2', 'leaf3'],
    tgtNewickToDf: DG.DataFrame.fromCsv(`node,parent,leaf,distance
node-l1-l2-l3,,false,0.14
leaf1,node-l1-l2-l3,true,0.18
node-l2-l3,node-l1-l2-l3,false,0.17
leaf2,node-l2-l3,true,0.13
leaf3,node-l2-l3,true,0.01`)
  },

  // -- NoRootName
  [Tests.noNameRoot]: {
    nwk: `(
  leaf1:0.18,
  (
    leaf2:0.13,
    leaf3:0.01
  )node-l2-l3:0.17
):0.14;`,
    tgtLeafNameList: ['leaf1', 'leaf2', 'leaf3'],
    tgtNodeNameList: ['[root]', 'leaf1', 'node-l2-l3', 'leaf2', 'leaf3'],
    tgtNewickToDf: DG.DataFrame.fromCsv(`node,parent,leaf,distance
${NO_NAME_ROOT},,false,0.14
leaf1,${NO_NAME_ROOT},true,0.18
node-l2-l3,[root],false,0.17
leaf2,node-l2-l3,true,0.13
leaf3,node-l2-l3,true,0.01`)
  }
};

category('treeHelper', () => {
  test('getLeafList1', async () => {
    _testGetLeafList(data[Tests.nwk1].nwk, data[Tests.nwk1].tgtLeafNameList);
  });

  test('getNodeList1', async () => {
    _testGetNodeList(data[Tests.nwk1].nwk, data[Tests.nwk1].tgtNodeNameList);
  });

  test('setGridOrder', async () => {
    // _testSetGridOrder(data[Tests.nwk1].nwk);
  }, {skipReason: 'not implemented'});

  test('treeGenerator', async () => {
    const size = 100;
    const th = new TreeHelper();
    const treeRoot: NodeType = th.generateTree(size);
    const newickStr: string = th.toNewick(treeRoot);
    const treeDf = th.newickToDf(newickStr, 'treeGenerator');
    expect(treeDf.rowCount, size);
  });

  test('getNodesByLeaves0', async () => {
    const newick: string = await _package.files.readAsText('data/tree95.nwk');
    const df: DG.DataFrame = await _package.files.readCsv('data/tree95df.csv');
    await _testGetNodesByLeaves(newick, df, {}, []);
  });

  test('getNodesByLeaves1', async () => {
    const newick: string = await _package.files.readAsText('data/tree95.nwk');
    const df: DG.DataFrame = await _package.files.readCsv('data/tree95df.csv');
    await _testGetNodesByLeaves(newick, df,
      {'leaf6': null, 'leaf7': null, 'leaf8': null},
      ['node-l6-l7-l8']);
  });

  test('getNodesByLeaves2', async () => {
    const newick: string = await _package.files.readAsText('data/tree95.nwk');
    const df: DG.DataFrame = await _package.files.readCsv('data/tree95df.csv');
    await _testGetNodesByLeaves(newick, df,
      {
        'leaf6': null, 'leaf7': null,
        'leaf10': null, 'leaf11': null
      },
      ['node-l6-l7', 'node-l9-l10-l11']);
  });

  test('getNodesByLeaves3', async () => {
    const newick: string = await _package.files.readAsText('data/tree95.nwk');
    const df: DG.DataFrame = await _package.files.readCsv('data/tree95df.csv');
    await _testGetNodesByLeaves(newick, df,
      {
        'leaf6': null, 'leaf7': null, 'leaf8': null,
        'leaf10': null, 'leaf11': null
      },
      ['node-l6-l7-l8-l9-l10-l11']);
  });

  test('newickToDf', async () => {
    const testData = data[Tests.nwk1];
    const th: ITreeHelper = new TreeHelper();
    const resDf = th.newickToDf(testData.nwk, '');
    expectDataFrame(resDf, testData.tgtNewickToDf);
  });

  function _testGetNodesByLeaves(
    newick: string, df: DG.DataFrame, leaves: { [name: string]: any }, tgtNameList: string[]
  ) {
    const th: ITreeHelper = new TreeHelper();
    const treeRootNwk: NodeType = parseNewick(newick);
    const dfLeaves: { [name: string]: any } = {};
    const dfRowCount: number = df.rowCount;
    for (let rowI = 0; rowI < dfRowCount; rowI++)
      dfLeaves[df.get('id', rowI)] = rowI;
    const treeRoot: NodeType = th.filterTreeByLeaves(treeRootNwk, dfLeaves)!;
    const resList: NodeType[] = th.getNodesByLeaves(treeRoot, leaves);
    const tgtList: NodeType[] = th.getNodeList(treeRoot).filter((n) => tgtNameList.includes(n.name));
    expectArray(resList, tgtList);
  }
});

category('treeHelper: noNameRoot', () => {
  // -- noRootName --

  test('getLeafList', async () => {
    const testData = data[Tests.noNameRoot];
    _testGetLeafList(testData.nwk, testData.tgtLeafNameList);
  });

  test('getNodeList', async () => {
    const testData = data[Tests.noNameRoot];
    _testGetNodeList(testData.nwk, testData.tgtNodeNameList);
  });

  test('newickToDf', async () => {
    const testData = data[Tests.noNameRoot];
    const th: ITreeHelper = new TreeHelper();
    const resDf: DG.DataFrame = th.newickToDf(testData.nwk, '');
    expectDataFrame(resDf, testData.tgtNewickToDf);
  });
});

function _testGetLeafList(nwk: string, tgtLeafNameList: string[]) {
  const th: ITreeHelper = new TreeHelper();
  const root: NodeType = parseNewick(nwk);
  const leafList: NodeType[] = th.getLeafList(root);
  const leafNameList: string[] = leafList.map((n) => n.name);
  expectArray(leafNameList, tgtLeafNameList);
}

function _testGetNodeList(nwk: string, tgtNodeNameList: string[]) {
  const th: ITreeHelper = new TreeHelper();
  const root: NodeType = parseNewick(nwk);
  const nodeList: NodeType[] = th.getNodeList(root);
  const nodeNameList: string[] = nodeList.map((n) => n.name);

  expectArray(nodeNameList, tgtNodeNameList);

  // side check for newickToDf order
  const nwkDf = th.newickToDf(nwk, '');
  expectArray(nwkDf.getCol('node').toList(), tgtNodeNameList);
}

function _testSetGridOrder(nwk: string) {

}

function expectDataFrame(actual: DG.DataFrame, expected: DG.DataFrame) {
  expect(actual.rowCount, expected.rowCount);
  expect(actual.columns.length, expected.columns.length);
  for (let colI: number = 0; colI < actual.columns.length; colI++) {
    const actualCol: DG.Column = actual.columns.byIndex(colI);
    const expectedCol: DG.Column = expected.columns.byIndex(colI);
    expect(actualCol.name, expectedCol.name);
    expectArray(actualCol.toList(), expectedCol.toList());
  }
}
