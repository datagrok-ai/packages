/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {ExternalPluginUI} from '../apps/common/view/utils';
import {ColoredTextInput} from '../apps/common/view/components/colored-input/colored-text-input';
import {MERMADE} from './const';
import {ITranslationHelper} from '../types';

import {_package} from '../package';

export async function getExternalAppViewFactories(
  th: ITranslationHelper
): Promise<{ [name: string]: () => DG.View } | undefined> {
  const externalPluginData = {
    [MERMADE.FUNCTION_NAME]: {
      tabName: MERMADE.TAB_NAME,
      parameters: getMerMadeParameters(th)
    },
  };

  const result: { [tabName: string]: () => DG.View } = {};

  for (const [pluginName, data] of Object.entries(externalPluginData)) {
    let div: HTMLDivElement;
    try {
      div = await grok.functions.call(pluginName, data.parameters);
      const pluginUI = new ExternalPluginUI(data.tabName, div);

      // intentonally don't await for the promise
      pluginUI.initView();

      result[data.tabName] = () => pluginUI.getView();
    } catch (err) {
      console.warn(`Plugin ${pluginName} not loaded, reason:`, err);
      continue;
    }
  }
  return result;
}

function getMerMadeParameters(th: ITranslationHelper): { [name: string]: any } {
  const base = ui.textInput('', '');
  const input = new ColoredTextInput(base, th.highlightInvalidSubsequence);

  return {
    coloredInput: input,
    codes: th.jsonData.codesToSymbolsDict
  };
}
