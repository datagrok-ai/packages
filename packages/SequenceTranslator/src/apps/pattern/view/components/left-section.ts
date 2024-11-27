import * as ui from 'datagrok-api/ui';

import $ from 'cash-dom';

import {DataManager} from '../../model/data-manager';
import {EventBus} from '../../model/event-bus';
import {TableControlsManager} from './bulk-convert/table-controls';
import {PatternEditControlsManager} from './edit-block-controls';
import {PatternLoadControlsManager} from './load-block-controls';

export class PatternAppLeftSection {
  constructor(
    private eventBus: EventBus,
    private dataManager: DataManager
  ) { };

  getLayout(): HTMLDivElement {
    //const loadControlsManager = new PatternLoadControlsManager(this.eventBus, this.dataManager);

    const editControlsManager = new PatternEditControlsManager(this.eventBus, this.dataManager);
    const tableControlsManager = new TableControlsManager(this.eventBus);

    //const loadControls = loadControlsManager.createControls();
    const editControls = editControlsManager.createControls();
    const tableControls = tableControlsManager.createControls();

   // const loadControlsContainer = ui.div(loadControls);
   // $(loadControlsContainer).css({'padding-bottom': '20px'});

    const form = ui.div([
      ...editControls,
      ...tableControls
    ], 'ui-form');

    const container = ui.div([
     // loadControlsContainer,
      form
    ]);
    $(container).css({'padding': '25px'});

    const layout = ui.box(container, {style: {'maxWidth': '450px'}});
    return layout;
  }
}
