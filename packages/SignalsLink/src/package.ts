/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {u2} from "@datagrok-libraries/utils/src/u2";


export const _package = new DG.Package();

//tags: app
//name: Signals
//meta.icon: images/signals-icon.png
//output: view v
//meta.browsePath: Chem
export async function signalsApp(): Promise<DG.ViewBase> {

  const appHeader = u2.appHeader({
    iconPath: _package.webRoot + '/images/signals-icon.png',
    learnMoreUrl: 'https://github.com/datagrok-ai/public/blob/master/packages/Signals/README.md',
    description: '- Connect to the Revvity Signals ELN.\n' +
      '- Analyze assay data.\n' +
      '- Find contextual information on molecules.\n'
  });

  return DG.View.fromRoot(appHeader);
}


//input: dynamic treeNode
//input: view browseView
export async function signalsAppTreeBrowser(treeNode: DG.TreeViewGroup, browseView: any){
  treeNode.group('Projects');
  treeNode.group('Experiments');
  treeNode.group('Equipment');
  treeNode.group('Requests');
  treeNode.group('Favorites');
}


//name: Signals
//input: string data
export async function saveToSignalsEln(data: string) {
  grok.shell.info('Successfully saved to Signals ELN.');
}