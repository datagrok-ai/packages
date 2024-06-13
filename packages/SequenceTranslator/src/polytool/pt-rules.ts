import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {ActiveFiles} from '@datagrok-libraries/utils/src/settings/active-files-base';

export const RULES_PATH = 'System:AppData/SequenceTranslator/polytool-rules/';
export const RULES_STORAGE_NAME = 'Polytool';
export const RULES_TYPE_LINK = 'link';
export const RULES_TYPE_HOMODIMER = 'fragmentDuplication';
export const RULES_TYPE_HETERODIMER = 'differentFragments';

export class RuleInputs extends ActiveFiles {
  constructor(path: string, userStorageName: string, ext: string ) {
    super(path, userStorageName, ext);
  }
}

export type Rules = {
  homodimerCode: string | null,
  heterodimerCode: string | null,
  linkRules: RuleLink[]
}

export type RuleLink = {
  code: number,
  firstMonomer: string,
  secondMonomer: string,
  firstSubstitution: string,
  secondSubstitution: string,
  firstLinkingGroup: number,
  secondLinkingGroup: number
}

export async function getRules(ruleFiles: string[]): Promise<Rules> {
  const fileSource = new DG.FileSource(RULES_PATH);
  const linkRules: RuleLink[] = [];
  const rules: Rules = {homodimerCode: null, heterodimerCode: null, linkRules: linkRules};

  for (let i = 0; i < ruleFiles.length; i++) {
    const rulesRaw = await fileSource.readAsText(ruleFiles[i].replace(RULES_PATH, ''));
    const ruleSingle = JSON.parse(rulesRaw);
    for (let j = 0; j < ruleSingle.length; j++) {
      if (ruleSingle[j].type !== undefined && ruleSingle[j].code !== undefined) {
        switch (ruleSingle[j].type) {
        case RULES_TYPE_LINK: {
          const rule = ruleSingle[j].monomericSubstitution;
          rule['code'] = ruleSingle[j].code;
          linkRules.push(rule);
          break;
        }
        case RULES_TYPE_HOMODIMER: {
          if (rules.homodimerCode)
            grok.shell.warning(`PolyTool: homodimer code is duplicated in rules.`);
          rules.homodimerCode = ruleSingle[j].code;
          break;
        }
        case RULES_TYPE_HETERODIMER: {
          if (rules.heterodimerCode)
            grok.shell.warning(`PolyTool: heterodimer code is duplicated in rules.`);
          rules.heterodimerCode = ruleSingle[j].code;
          break;
        }
        default:
          grok.shell.warning(`PolyTool: Unexpected type - '${ruleSingle[j]}'.`);
          break;
        }
      } else {
        grok.shell.warning('Polytool: rules contain invalid rule');
      }
    }
  }

  return rules;
}
