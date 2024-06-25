import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import {fromEvent, Unsubscribable} from 'rxjs';

import {App, IHelmWebEditor} from '@datagrok-libraries/bio/src/helm/types';
import {getHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {ILogger} from '@datagrok-libraries/bio/src/utils/logger';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {delay} from '@datagrok-libraries/utils/src/test';

import {updateDivInnerHTML} from '../utils/ui-utils';
import {helmSubstructureSearch} from '../substructure-search/substructure-search';
import {BioFilterBase, BioFilterProps} from './bio-substructure-filter-types';

import {_package} from '../package';

export class HelmBioFilter extends BioFilterBase<BioFilterProps> /* implements IRenderer */ {
  readonly emptyProps = new BioFilterProps('');

  helmEditor: IHelmWebEditor;
  _filterPanel = ui.div('', {style: {cursor: 'pointer'}});

  private readonly logger: ILogger;

  private static viewerCounter: number = -1;
  private readonly viewerId: number = ++HelmBioFilter.viewerCounter;

  private viewerToLog(): string { return `HelmBioFilter<${this.viewerId}>`; }

  get type(): string { return 'HelmBioFilter'; }

  constructor() {
    super();
    this.logger = _package.logger;
  }

  viewSubs: Unsubscribable[] = [];

  async detach(): Promise<void> {
    await super.detach();
    for (const sub of this.viewSubs) sub.unsubscribe();
  }

  async attach(): Promise<void> {
    const logPrefix = `${this.viewerToLog()}.init()`;
    try {
      const helmHelper = await getHelmHelper();
      this.helmEditor = helmHelper.createHelmWebEditor();
      this.logger.warning('TEST: HelmBioFilter.init().sync() waitForElementInDom waiting...');
      await ui.tools.waitForElementInDom(this._filterPanel);
      this.logger.warning('TEST: HelmBioFilter.init().sync() waitForElementInDom ready');
      this.updateFilterPanel();
      let webEditorHost: HTMLDivElement | null;
      let webEditorApp: App | null;
      // TODO: Unsubscribe 'click' and 'sizeChanged'
      this.viewSubs.push(fromEvent(this._filterPanel, 'click').subscribe(() => {
        webEditorHost = ui.div();
        webEditorApp = helmHelper.createWebEditorApp(webEditorHost, this.props.substructure);
        const dlg = ui.dialog({showHeader: false, showFooter: true})
          .add(webEditorHost!)
          .onOK(() => {
            try {
              const webEditorValue = webEditorApp!.canvas.getHelm(true)
                .replace(/<\/span>/g, '').replace(/<span style='background:#bbf;'>/g, '');
              this.props = new BioFilterProps(webEditorValue);
            } catch (err: any) {
              this.logger.error(err);
            } finally {
              $(webEditorHost).empty();
              webEditorHost = null;
              webEditorApp = null;
            }
          })
          .onCancel(() => {
            $(webEditorHost).empty();
            webEditorHost = null;
            webEditorApp = null;
          })
          .show({modal: true, fullScreen: true});
        // const onCloseSub = dlg.onClose.subscribe(() => {
        //   onCloseSub.unsubscribe();
        //   $(editorDiv).empty();
        //   editorDiv = undefined;
        //   webEditor = undefined;
        // });
      }));
      this.viewSubs.push(ui.onSizeChanged(this._filterPanel).subscribe((_: any) => {
        try {
          if (!!webEditorApp) {
            const helmString = webEditorApp.canvas.getHelm(true)
              .replace(/<\/span>/g, '').replace(/<span style='background:#bbf;'>/g, '');
            this.updateFilterPanel(helmString);
          }
        } catch (err: any) {
          const [errMsg, errStack] = errInfo(err);
          this.logger.error(errMsg, undefined, errStack);
        }
      }));
    } catch (err: any) {
      const [errMsg, _errStack] = errInfo(err);
      const fp = this._filterPanel;
      fp.innerText = 'error';
      fp.classList.add('d4-error');
      ui.tooltip.bind(fp, errMsg);
    }
  }

  applyProps() {
    if (!this.helmEditor) return; // helmEditor is not created, the filter is not in dom yet
    this.updateFilterPanel(this.props.substructure);
  }

  get filterPanel() {
    return this._filterPanel;
  }

  updateFilterPanel(helmString?: string) {
    if (!this.helmEditor) throw new Error('helmEditor is not created, the filter is not in dom yet');

    const width = this._filterPanel.parentElement!.clientWidth < 100 ? 100 :
      this._filterPanel.parentElement!.clientWidth;
    const height = width / 2;
    if (!helmString) {
      const editDiv = ui.divText('Click to edit', 'helm-substructure-filter');
      updateDivInnerHTML(this._filterPanel, editDiv);
    } else {
      updateDivInnerHTML(this._filterPanel, this.helmEditor.host);
      this.helmEditor.editor.setHelm(helmString);
      this.helmEditor.resizeEditor(width, height);
    }
  }

  async substructureSearch(column: DG.Column): Promise<DG.BitSet | null> {
    const logPrefix = `${this.viewerToLog()}.substructureSearch( column = <${column.name}> )`;
    _package.logger.debug(`${logPrefix}, start`);
    try {
      await delay(10);
      const res = await helmSubstructureSearch(this.props.substructure, column);
      return res;
    } finally {
      _package.logger.debug(`${logPrefix}, end`);
    }
  }

  // // -- IRenderer --
  //
  // private _onRendered = new Subject<void>();
  //
  // get onRendered(): Observable<void> { return this._onRendered; }
  //
  // invalidate(caller?: string): void {
  //   const logPrefix = `${this.viewerToLog()}.invalidate(${caller ? ` <- ${caller} ` : ''})`;
  //   this.viewSyncer.sync(logPrefix, async () => { this._onRendered.next(); });
  // }
  //
  // async awaitRendered(timeout: number = 10000): Promise<void> {
  //   const callLog = `awaitRendered( ${timeout} )`;
  //   const logPrefix = `${this.viewerToLog()}.${callLog}`;
  //   await delay(0);
  //   await testEvent(this.onRendered, () => {
  //     this.logger.debug(`${logPrefix}, ` + '_onRendered event caught');
  //   }, () => {
  //     this.invalidate(callLog);
  //   }, timeout, `${logPrefix} ${timeout} timeout`);
  //
  //   // Rethrow stored syncer error (for test purposes)
  //   const viewErrors = this.viewSyncer.resetErrors();
  //   if (viewErrors.length > 0) throw viewErrors[0];
  // }
}

