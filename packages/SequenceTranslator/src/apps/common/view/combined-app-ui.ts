/* Do not change these import lines to match external modules in webpack configuration */
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {_package} from '../../../package';
import {OligoPatternUI} from '../../pattern/view/ui';
import {OligoStructureUI} from '../../structure/view/ui';
import {OligoTranslatorUI} from '../../translator/view/ui';
import {AppUIBase} from './app-ui-base';
import {IsolatedAppUIBase} from './isolated-app-ui';
import {APP_NAME, TAB_NAME} from './const';
import {ITranslationHelper} from '../../../types';

type ViewFactories = { [name: string]: () => DG.View };

export class CombinedAppUI extends AppUIBase {
  constructor(
    private readonly externalViewFactories: ViewFactories,
    private readonly th: ITranslationHelper
  ) {
    super(APP_NAME.COMBINED);

    const factories = this.getViewFactories(this.th);
    this.multiView = new DG.MultiView({viewFactories: factories});
  }

  private multiView: DG.MultiView;

  private getViewFactories(th: ITranslationHelper): ViewFactories {
    function viewFactory(UiConstructor: new (th: ITranslationHelper) => IsolatedAppUIBase): () => DG.View {
      const view = DG.View.create();
      const translateUI = new UiConstructor(th);
      translateUI.initView().catch(
        (e) => console.error(`Failed to initialize ${UiConstructor.name}: ${e}`)
      );
      return () => translateUI.getView();
    }

    let result: { [key: string]: () => DG.View } = {
      [TAB_NAME.TRANSLATOR]: viewFactory(OligoTranslatorUI),
      [TAB_NAME.PATTERN]: viewFactory(OligoPatternUI),
      [TAB_NAME.STRUCTURE]: viewFactory(OligoStructureUI),
    };

    if (this.externalViewFactories)
      result = Object.assign({}, result, this.externalViewFactories);

    return result;
  }

  private getCurrentPanePath(): string {
    let name = this.multiView.tabs.currentPane.name;
    name = name.charAt(0).toUpperCase() + name.substring(1).toLowerCase();
    const path = `/apps/${_package.name}/OligoToolkit/${name}`;
    return path;
  }

  private setUrl(): void {
    this.multiView.path = this.getCurrentPanePath();
  }

  protected async constructView(): Promise<DG.ViewBase> {
    this.multiView.tabs.onTabChanged.subscribe(() => this.setUrl());
    this.setUrl();
    return this.multiView;
  }
}

