import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {TutorialRunner, TutorialSubstitute} from './tutorial-runner';
import {chem} from './tracks/chem';
import {eda} from './tracks/eda';
import {da} from './tracks/data-access';
import {ml} from './tracks/ml';
import {dataTransformation} from './tracks/transform';
import {scientificComputing} from './tracks/compute';
import {TutorialWidget} from './widget';
import '../css/tutorial.css';
import {Track} from '@datagrok-libraries/tutorials/src/track';
import {DemoView} from './demo-app/demo-app';
import {viewerDemo} from './demo-app/platform-viewers-demo';
import {DemoAppWidget} from './demo-app/widget';

export const _package = new DG.Package();

const tracks: Track[] = [];

//name: Tutorials
//tags: app
//top-menu: Help | Tutorials @Toolbox Help | Tutorials
export function trackOverview() {
  const tutorialRunners = tracks.map((track) => new TutorialRunner(track));
  const root = ui.div([
    ...tutorialRunners.map((runner) => runner.root),
    ui.panel([], {id: 'tutorial-child-node', style: {paddingTop: '10px'}}),
  ], 'tutorials-root');

  grok.shell.dockManager.dock(root, DG.DOCK_TYPE.LEFT, null, 'Tutorials', 0.27);
  setPath(window.location.pathname, tutorialRunners);
}

//output: widget tutorial
export function tutorialWidget(): DG.Widget {
  return new TutorialWidget(...tracks.map((track) => new TutorialRunner(track)));
}

//tags: init
export function tutorialsInit() {
  const properties = _package.settings;
  setProperties(properties as unknown as { [propertyName: string]: boolean });

  const tutorialFuncs = DG.Func.find({tags: ['tutorial']});
  const trackFuncs = DG.Func.find({tags: ['track']});
  const defaultIcon = `${_package.webRoot}package.png`;
  const tutorialIconPaths: { [packageName: string]: { [tutorialName: string]: {
    tutorial: TutorialSubstitute,
    imageUrl: string,
  } } } = {};

  for (const track of tracks) {
    for (const tutorial of track.tutorials) {
      if (tutorial.imageUrl === '')
        tutorial.imageUrl = `${_package.webRoot}images/${tutorial.name.toLowerCase().replace(/ /g, '-')}.png`;
    }
  }

  for (const func of trackFuncs) {
    const t = tracks.find((t) => t.name === func.options['name']);
    if (!t)
      tracks.push(new Track(func.options['name'], [], func.helpUrl ?? ''));
    else
      console.error(`Tutorials: Couldn't add a track. Track ${func.options['name']} already exists.`);
  }

  for (const func of tutorialFuncs) {
    const trackName = func.options['track'] ?? func.package.friendlyName;
    const tutorial = new TutorialSubstitute(func.options['name'], func.description, defaultIcon, func);

    if (func.options['icon']) {
      tutorialIconPaths[func.package.name] = {[func.options['name']]: {
        tutorial,
        imageUrl: func.options['icon'],
      }};
    }

    const track = tracks.find((t) => t.name === trackName);
    if (track) {
      const t = track.tutorials.find((t) => t.name === tutorial.name);
      if (!t)
        track.tutorials.push(tutorial);
      else {
        console.error(`Tutorials: Couldn't add a tutorial to track ${track.name}. ` +
          `Tutorial ${tutorial.name} already exists.`);
      }
    } else
      tracks.push(new Track(trackName, [tutorial], ''));
  }

  grok.events.onPackageLoaded.subscribe((p) => {
    if (p.name in tutorialIconPaths) {
      for (const tutorial in tutorialIconPaths[p.name]) {
        if (tutorialIconPaths[p.name].hasOwnProperty(tutorial)) {
          const data = tutorialIconPaths[p.name][tutorial];
          data.tutorial.imageUrl = `${data.tutorial.func.package.webRoot}${data.imageUrl}`;
        }
      }
    }
  });
}

//name: Demo
//tags: app
//description: Interactive demo of major Datagrok capabilities
//meta.icon: images/icons/demoapp-icon.png
//meta.browseOnly: true
//input: string path {meta.url: true; optional: true}
//input: string filter {optional: true}
//output: view v
export function demoApp(path?: string, filter?: string): DG.ViewBase {
  const pathSegments = (!path || path === '') ? [] : path.split('/');
  const demoView = new DemoView();
  if (pathSegments.length > 0) {
    const pathElements = pathSegments.map((elem) => elem.replaceAll('-', ' '));
    const node = demoView.tree.items.find((node) => node.text === pathElements[pathElements.length - 1])?.root;
    node?.click();
  }
  return demoView;
}

//input: dynamic treeNode
//input: view browseView
export async function demoAppTreeBrowser(treeNode: DG.TreeViewGroup, browseView: DG.BrowseView) {
  new DemoView();
}

function setProperties(properties: { [propertyName: string]: boolean }): void {
  if (tracks.length > 0)
    return;

  const registry: { [propertyName: string]: Track } = {
    'dataAnalysisTrack': eda,
    'machineLearningTrack': ml,
    'cheminformaticsTrack': chem,
    'dataAccessTrack': da,
    'dataTransformation': dataTransformation,
    'scientificComputing': scientificComputing,
  };

  for (const property in properties) {
    if (property in registry && properties[property])
      tracks.push(registry[property]);
  }
}

function setPath(path: string, tutorialRunners: TutorialRunner[]): void {
  const pathParts = path.split('/');
  const removeSpaces = (s: string) => s.replaceAll(' ', '');
  const trackShortNames: {[key: string]: Track} = {
    'eda': eda,
    'ml': ml,
    'chem': chem,
    'access': da,
    'compute': scientificComputing,
  };

  if (pathParts.length !== 6)
    return;

  const [trackName, tutorialName] = pathParts.slice(4);
  let track: Track | null = null;
  let trackIdx: number | null = null;
  if (trackName in trackShortNames) {
    track = trackShortNames[trackName];
    const _idx = tracks.findIndex((t) => t === track);
    trackIdx = _idx === -1 ? null : _idx;
  } else {
    track = tracks.find((t, idx) => {
      if (removeSpaces(t.name) === trackName) {
        trackIdx = idx;
        return true;
      }
      return false;
    }) ?? null;
  }
  const tutorial = track?.tutorials?.find((t) => removeSpaces(t.name) === tutorialName);
  if (tutorial && trackIdx != null)
    tutorialRunners[trackIdx].run(tutorial);
}

//output: widget tutorial
export function demoAppWidget(): DG.Widget {
  return new DemoAppWidget();
}

//name: filesDemo
//description: The File Manager is an interface that allows you to manage connections, browse and preview file content, and perform standard file and folder actions such as opening, downloading, deleting, and renaming.
//meta.demoPath: Data Access | Files
export function _filesDemo() {
  grok.shell.addView(DG.FilesView.create());
}

//name: databasesDemo
//description: Database Manager provides a hierarchical browsing interface for schemas and database objects, such as queries, tables, and table columns (if supported by the providers). You can perform various operations like adding new connections and queries, previewing data, running queries, and managing objects using context actions that are accessible through right-clicking an object.
//meta.demoPath: Data Access | Databases
export async function _databasesDemo() {
  grok.shell.addView(DG.View.createByType(DG.View.DATABASES));
}

//name: scatterPlotDemo
//description: A scatter plot (also called a scatter graph, scatter chart, scattergram, or scatter diagram) is a type of plot or mathematical diagram using Cartesian coordinates to display values for typically two variables for a set of data. If the points are color-coded, you can increase the number of displayed variables to three. The data is displayed as a collection of points, each having the value of one variable determining the position on the horizontal axis and the value of the other variable determining the position on the vertical axis.
//meta.demoPath: Visualization | General | Scatter Plot
export async function _scatterPlotDemo() {
  await viewerDemo(DG.VIEWER.SCATTER_PLOT);
}

//name: histogramDemo
//description: A histogram is a graphical representation of the distribution of numerical data.
//meta.demoPath: Visualization | General | Histogram
export async function _histogramDemo() {
  await viewerDemo(DG.VIEWER.HISTOGRAM);
}

//name: lineChartDemo
//description: A line chart is a simple, two-dimensional chart with an X and Y axis, each point representing a single value. The data points are joined by a line to depict a trend, usually over time.
//meta.demoPath: Visualization | General | Line Chart
export async function _lineChartDemo() {
  await viewerDemo(DG.VIEWER.LINE_CHART);
}

//name: barChartDemo
//description: A bar chart presents grouped data as rectangular bars with lengths proportional to the values that they represent. Unlike histograms which you can apply to display the distribution of numerical data, bar charts are primarily designed for categorical values.
//meta.demoPath: Visualization | General | Bar Chart
export async function _barChartDemo() {
  await viewerDemo(DG.VIEWER.BAR_CHART, {stackColumnName: 'SEX'});
}

//name: pieChartDemo
//description: A pie chart is useful for reflecting numerical proportions. Conceptually, it is similar to a bar chart in that it represents categorical values. A pie chart shows the relative size of a given category (a slice of the pie) compared to the entire dataset (the whole pie).
//meta.demoPath: Visualization | General | Pie Chart
export async function _pieChartDemo() {
  await viewerDemo(DG.VIEWER.PIE_CHART);
}

//name: trellisPlotDemo
//description: Trellis Charts are useful for finding the structure and patterns in complex data. A Trellis Chart is a layout of smaller charts in a grid with consistent scales. Each smaller chart represents rows that belong to a corresponding category. The grid layout looks similar to a garden trellis, hence the name Trellis Chart.
//meta.demoPath: Visualization | Data Separation | Trellis Plot
export async function _trellisPlotDemo() {
  await viewerDemo(DG.VIEWER.TRELLIS_PLOT);
}

//name: matrixPlotDemo
//description: Use a Matrix Plot to assess the relationship among many pairs of columns at the same time.
//meta.demoPath: Visualization | Data Separation | Matrix Plot
export async function _matrixPlotDemo() {
  await viewerDemo(DG.VIEWER.MATRIX_PLOT);
}

//name: scatterPlot3DDemo
//description: Use a 3D scatter plot to plot data points on three axes to show the relationship between three variables. Each row in the data table is represented by a marker whose position depends on its values in the columns set on the X, Y, and Z axes. Additionally, you can color-code and size-code points, as well as display labels next to markers.
//meta.demoPath: Visualization | General | 3D Scatter Plot
export async function _scatterPlot3DDemo() {
  await viewerDemo(DG.VIEWER.SCATTER_PLOT_3D);
}

//name: densityPlotDemo
//description: Unlike a scatter plot that visualizes each individual data point, the density plot splits 2D area by bins and color-codes it depending on the number of points that fall within this bin. The darker the color, the more points it contains.
//meta.demoPath: Visualization | General | Density Plot
export async function _densityPlotDemo() {
  await viewerDemo(DG.VIEWER.DENSITY_PLOT);
}

//name: pcPlotDemo
//description: Parallel coordinates are a common way of visualizing high-dimensional geometry and analyzing multivariate data. To show a set of points in an n-dimensional space, a backdrop is drawn consisting of n parallel lines, typically vertical and equally spaced. A point in n-dimensional space is represented as a polyline with vertices on the parallel axes; the position of the vertex on the i-th axis corresponds to the i-th coordinate of the point. This visualization is closely related to time series visualization, except that it is applied to data where the axes do not correspond to points in time, and therefore do not have a natural order. Therefore, different axis arrangements may be of interest.
//meta.demoPath: Visualization | Statistical | PC Plot
export async function _pcPlotDemo() {
  await viewerDemo(DG.VIEWER.PC_PLOT);
}

//name: networkDiagramDemo
//description: A network diagram is used to visualize graphs, where values of the specified two columns become nodes, and rows become edges. It is possible to color-code and size-code nodes and columns by choosing the aggregate function that would apply to the values that represent an edge or a Node.js.
//meta.demoPath: Visualization | Data Flow and Hierarchy | Network Diagram
export async function _networkDiagramDemo() {
  await viewerDemo(DG.VIEWER.NETWORK_DIAGRAM, {'node1ColumnName': 'Source', 'node2ColumnName': 'Target', useGoogleImage: true});
}

//name: boxPlotDemo
//description: The box plot (a.k.a. box and whisker diagram) is a standardized way of displaying the distribution of data based on the five-number summary: minimum, first quartile, median, third quartile, and maximum.
//meta.demoPath: Visualization | Statistical | Box Plot
export async function _boxPlotDemo() {
  await viewerDemo(DG.VIEWER.BOX_PLOT);
}

//name: treeMapDemo
//description: Treemap displays hierarchical (tree-structured) data as nested rectangles. The branches are rectangles, then tiled with smaller rectangles representing sub-branches. Rectangles have areas proportional to a specified dimension of the data using the specified aggregation function (count by default).
//meta.demoPath: Visualization | Data Flow and Hierarchy | Tree Map
export async function _treeMapDemo() {
  await viewerDemo(DG.VIEWER.TREE_MAP, {splitByColumnNames: ['DIS_POP', 'SEX', '']});
}

//name: statisticsDemo
//description: Provides specified descriptive statistics for the chosen columns.
//meta.demoPath: Visualization | Statistical | Statistics
export async function _statisticsDemo() {
  await viewerDemo(DG.VIEWER.STATISTICS);
}

//name: correlationPlotDemo
//description: A quick way to assess correlations between all columns at once. Cells are color-coded by the Pearson correlation coefficient or Spearman's rank correlation coefficient. Histograms along the diagonal show the corresponding distribution. Hover over the cell to see the corresponding scatter plot. The grid is sortable. Select columns in the view by selecting corresponding rows.
//meta.demoPath: Visualization | Statistical |Correlation Plot
export async function _correlationPlotDemo() {
  await viewerDemo(DG.VIEWER.CORR_PLOT);
}

//name: calendarDemo
//description: Calendar lets you analyze longitudinal data. It needs at least one column of type DateTime.
//meta.demoPath: Visualization | Time and Date | Calendar
export async function calendarDemo() {
  await viewerDemo(DG.VIEWER.CALENDAR);
}

//name: gridDemo
//description: A grid table contains a set of data that is structured in rows and columns. It allows the user to scroll in both directions and can handle large numbers of items and columns.
//meta.demoPath: Visualization | Input and Edit | Grid
export async function _gridDemo() {
  await viewerDemo(DG.VIEWER.GRID);
}

//name: markupDemo
//description: Use this viewer to host any text, arbitrary HTML content, or markdown-formatted text. In most cases, the viewer will auto-detect content type. Use the "mode" property to explicitly specify it.
//meta.demoPath: Visualization | General | Markup
export async function _markupDemo() {
  await viewerDemo(DG.VIEWER.MARKUP);
}

//name: tileViewerDemo
//description: Visualizes rows as a collection of forms that are positioned as tiles.
//meta.demoPath: Visualization | General | Tile Viewer
export async function _tileViewerDemo() {
  await viewerDemo(DG.VIEWER.TILE_VIEWER);
}

//name: formDemo
//description: Form allows you to customize the appearance of the row by manually positioning the fields, and adding other visual elements, such as pictures or panels. A form can be used either as a stand-alone viewer or as a row template of the Tile Viewer.
//meta.demoPath: Visualization | Input and Edit | Form
export async function _formDemo() {
  await viewerDemo(DG.VIEWER.FORM);
}

////name: shapeMapDemo
////description: Shows a map that is applicable to the specified dataset. Typically, it would represent a geographical area (countries, states, counties, etc), but it also supports arbitrary shapes (such as a store floor plan, brain regions, or EEG electrodes).
////meta.demoPath: Visualization | Geographical | Shape Map
//export async function _shapeMapDemo() {
//  await viewerDemo(DG.VIEWER.SHAPE_MAP);
//}

//name: pivotTableDemo
//description: A pivot table is a table of grouped values that aggregates the individual items of a more extensive table within one or more discrete categories. This summary might include sums, averages, or other statistics, which the pivot table groups together using a chosen aggregation function applied to the grouped values.
//meta.demoPath: Visualization | Statistical | Pivot Table
export async function _pivotTableDemo() {
  await viewerDemo('Pivot table');
}

//name: filtersDemo
//description: Filter is a set of controls for quick filtering, selection, and visual assessment of column values.
//meta.demoPath: Visualization | General | Filters
export async function _filtersDemo() {
  await viewerDemo(DG.VIEWER.FILTERS);
}

//name: tableLinkingDemo
//description: Table linking is based on the key columns. The link type determines which records should be synchronized between the datasets (current record, filter, selection, and mouse-over record).
//meta.demoPath: Data Access | Table Linking
export async function _tableLinkingDemo() {
  const TABLE1_PATH = 'files/demog-types.csv';
  const TABLE2_PATH = 'files/demog.csv';
  const HELP_URL = '/help/transform/link-tables';

  const demogTypes = await grok.data.loadTable(`${_package.webRoot}/${TABLE1_PATH}`);
  const demog = await grok.data.loadTable(`${_package.webRoot}/${TABLE2_PATH}`);
	
  grok.shell.addTableView(demog);
  const demogTypesTableView = grok.shell.addTableView(demogTypes);

  grok.data.linkTables(demogTypes, demog, ['sex', 'race'], ['sex', 'race'],
    [DG.SYNC_TYPE.CURRENT_ROW_TO_FILTER]);
  const demogGridViewer = demogTypesTableView.addViewer(DG.VIEWER.GRID, {table: 'Table'});
  demogTypesTableView.dockManager.dock(demogGridViewer, DG.DOCK_TYPE.RIGHT, null, 'demog', 0.7);
  
  grok.shell.windows.showContextPanel = false;
  grok.shell.windows.showHelp = true;
  grok.shell.windows.help.syncCurrentObject = false;
  grok.shell.windows.help.showHelp(HELP_URL);
}
