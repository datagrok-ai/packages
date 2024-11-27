import * as ui from 'datagrok-api/ui';

import {APP_NAME} from '../../common/view/const';
import {IsolatedAppUIBase} from '../../common/view/isolated-app-ui';
import {DataManager} from '../model/data-manager';
import {EventBus} from '../model/event-bus';
import {URLRouter} from '../model/router';
import {PatternAppLeftSection} from './components/left-section';
import {PatternAppRightSection} from './components/right-section';
import {PatternConfigRecord} from '../model/types';
import {ITranslationHelper} from '../../../types';


export class OligoPatternUI extends IsolatedAppUIBase {
  constructor(
    private readonly th: ITranslationHelper
  ) {
    super(APP_NAME.PATTERN);
  }

  protected getContent(): Promise<HTMLDivElement> {
    return getContent();
  }
}


async function getContent(): Promise<HTMLDivElement> {
  const dataManager = await DataManager.getInstance();
  const urlRouter = new URLRouter();

  const initialPatternRecord = await getInitialPatternRecord(dataManager, urlRouter);
  const eventBus = new EventBus(dataManager, initialPatternRecord);
  urlRouter.subscribeToObservables(eventBus);

  //const leftSection = new PatternAppLeftSection(eventBus, dataManager).getLayout();
  const rightSection = new PatternAppRightSection(eventBus, dataManager).getLayout();

  const isResizeable = true;

  const layout = ui.splitH([
   // leftSection,
    rightSection,
  ], {}, isResizeable);

  return layout;
}

async function getInitialPatternRecord(
  dataManager: DataManager,
  urlRouter: URLRouter
): Promise<PatternConfigRecord> {
  const patternHash = urlRouter.getPatternHash();
  if (!patternHash) {
    urlRouter.clearPatternURL();
    return dataManager.getDefaultPatternRecord();
  }

  let initialPatternRecord = await dataManager.getPatternRecordByHash(patternHash);
  if (!initialPatternRecord) {
    urlRouter.clearPatternURL();
    initialPatternRecord = dataManager.getDefaultPatternRecord();
  }
  return initialPatternRecord;
}
