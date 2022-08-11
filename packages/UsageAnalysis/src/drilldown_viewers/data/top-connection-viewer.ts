import {UaFilterableQueryViewer} from "../../viewers/ua-filterable-query-viewer";
import * as DG from "datagrok-api/dg";
import {UaQueryViewer} from "../../viewers/abstract/ua-query-viewer";
import {TopQueriesUsingDataSource} from "../top-queries-using-data-source";
import * as grok from "datagrok-api/grok";
import * as ui from "datagrok-api/ui";
import {UaFilter} from "../../filter2";
import {PropertyPanel} from "../../property-panel";
import {UaDataFrameQueryViewer} from "../../viewers/ua-data-frame-query-viewer";
import {BehaviorSubject} from "rxjs"
import {TopFunctionErrorsViewer} from "../function_errors/top-function-errors-viewer";

export class TopConnectionsViewer extends UaFilterableQueryViewer {

  public constructor(filterStream: BehaviorSubject<UaFilter>) {
    super(
        filterStream,
        'Connections',
        'TopConnections',
        (t: DG.DataFrame) => {
          let viewer = DG.Viewer.barChart(t, UaQueryViewer.defaultBarchartOptions);
          viewer.onEvent('d4-bar-chart-on-category-clicked').subscribe(async (args) => {
            let entity = await grok.dapi.connections.filter(`shortName = "${args.args.categories[0]}"`).first();
            let pp = new PropertyPanel(
                entity,
                null,
                [
                new UaDataFrameQueryViewer(
                    'Users',
                    'TopUsersOfConnection',
                    (t: DG.DataFrame) => DG.Viewer.barChart(t, UaQueryViewer.defaultBarchartOptions).root,
                    null as any,
                    {name: args.args.categories[0]},
                    filterStream.getValue(),
                    false
                )
            ],
            `Connection: ${args.args.categories[0]}`,
            'Connection');

            grok.shell.o = pp.getRoot();
          });
          return viewer.root;
        }
    );
  }

}