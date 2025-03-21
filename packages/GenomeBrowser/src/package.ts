/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { getGenomeFileBrowserComponent } from './genome-file-browse-viewer-wrapper'
export const _package = new DG.Package();

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

async function genomeFileBrowse(data: string, fileName : string = 'GenomeFileBrowse'): Promise<DG.View> {
  let viewerHost = ui.div();
  getGenomeFileBrowserComponent(viewerHost, data);
  let view = DG.View.fromRoot(viewerHost);
  view.name = fileName;
  return view;
}


//name: previewGenomeFileBrowse
//tags: fileViewer
//meta.fileViewer: json
//meta.fileViewerCheck: GenomeBrowse:checkGenomeConfig
//input: file file
//output: view v
export async function previewGenomeFileBrowse(fileData: DG.FileInfo): Promise<DG.View> {
  let view = await genomeFileBrowse( await fileData.readAsString(), fileData.name);
  grok.shell.addView(view);
  return view;
}