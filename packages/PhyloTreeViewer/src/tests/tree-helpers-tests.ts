import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {after, before, category, test, expect, expectArray, expectObject} from '@datagrok-libraries/utils/src/test';

import {_package} from '../package-test';
import {newickToDf} from '../utils';
import {TreeHelper} from '../utils/tree-helper';
import {ITreeHelper, NodeType, parseNewick} from '@datagrok-libraries/bio';


category('treeHelpers', () => {
  const th: ITreeHelper = new TreeHelper();

  const enum Tests {
    nwk1 = 'nwk1',
  }

  const data = {
    [Tests.nwk1]: {
      nwk: `(
  leaf1:0.1802344390,
  (
    leaf2:0.1333847170,
    leaf3:0.0019327403
  )node-l2-l3:0.1708239517
)node-l1-l2-l3:0.1740107642;`,
      tgtLeafNameList: ['leaf1', 'leaf2', 'leaf3'],
      tgtNodeNameList: ['node-l1-l2-l3', 'leaf1', 'node-l2-l3', 'leaf2', 'leaf3'],
    }
  };

  test('getLeafList1', async () => {
    _testGetLeafList(data[Tests.nwk1].nwk, data[Tests.nwk1].tgtLeafNameList);
  });

  test('getNodeList1', async () => {
    _testGetNodeList(data[Tests.nwk1].nwk, data[Tests.nwk1].tgtNodeNameList);
  });

  test('setGridOrder', async () => {
    _testSetGridOrder(data[Tests.nwk1].nwk);
  });

  function _testGetLeafList(nwk: string, tgtLeafNameList: string[]) {
    const root: NodeType = parseNewick(nwk);
    const leafList: NodeType[] = th.getLeafList(root);
    const leafNameList: string[] = leafList.map((n) => n.name);
    expectArray(leafNameList, tgtLeafNameList);
  }

  function _testGetNodeList(nwk: string, tgtNodeNameList: string[]) {
    const root: NodeType = parseNewick(nwk);
    const nodeList: NodeType[] = th.getNodeList(root);
    const nodeNameList: string[] = nodeList.map((n) => n.name);

    expectArray(nodeNameList, tgtNodeNameList);

    // side check for newickToDf order
    const nwkDf = newickToDf(nwk, '');
    expectArray(nwkDf.getCol('node').toList(), tgtNodeNameList.map((n, i) => i == 0 ? 'root' : n));
  }

  function _testSetGridOrder(nwk: string) {

  }
});
