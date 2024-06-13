import {OligoPatternUI} from '../../pattern/view/ui';
import {OligoStructureUI} from '../../structure/view/ui';
import {OligoTranslatorUI} from '../../translator/view/ui';
import {IsolatedAppUIBase} from './isolated-app-ui';
import {ITranslationHelper} from '../../../types';
import {APP_NAME} from './const';

/** For plugins from external packages */
export class ExternalPluginUI extends IsolatedAppUIBase {
  constructor(viewName: string, private content: HTMLDivElement) {
    super(viewName);
  }

  protected getContent(): Promise<HTMLDivElement> {
    return Promise.resolve(this.content);
  }
}

export function getSpecifiedAppUI(appName: string, th: ITranslationHelper): IsolatedAppUIBase {
  switch (appName) {
  case APP_NAME.TRANSLATOR:
    return new OligoTranslatorUI(th);
  case APP_NAME.PATTERN:
    return new OligoPatternUI(th);
  case APP_NAME.STRUCTURE:
    return new OligoStructureUI(th);
  default:
    throw new Error(`Unknown app name: ${appName}`);
  }
}
