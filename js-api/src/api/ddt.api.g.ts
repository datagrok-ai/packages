/// this file was generated automatically from ddt classes declarations
import { toDart } from "../wrappers";
let api = <any>window;

export function histogram(col: any, bitset: any, flag: boolean, options?: {bins?: number, logScale?: boolean}): Int32List
  { return api.grok_histogram(toDart(col), toDart(bitset), toDart(flag), toDart(options?.bins), toDart(options?.logScale)); }

export class Tags {
  static Description = 'description';

  /// A user that created this entity
  static CreatedBy = 'createdBy';

  static SemanticDetectionDuration = '.semantic-detection-duration';

  static Tooltip = '.tooltip';

  static TooltipShowLabels = '.tooltip-show-labels';

  static TooltipVisibility = '.tooltip-visibility';

  static TooltipForm = '.tooltip-form';

  static RowGroupTooltip = '.row-group-tooltip';

  static ValueFunction = '.value-function';

  static ColorCoding = '.color-coding';

  static ColorCodingType = '.color-coding-type';

  static ColorCodingText = '.color-coding-text';

  static ColorCodingLinear = '.color-coding-linear';

  static ColorCodingConditional = '.color-coding-conditional';

  static ColorCodingCategorical = '.color-coding-categorical';

  static ColorCodingValueColumn = '.color-coding-value-column';

  static ColorCodingSchemeMax = '.color-coding-scheme-max';

  static ColorCodingSchemeMin = '.color-coding-scheme-min';

  static ColorCodingMatchType = '.color-coding-match-type';

  static ColorCodingFallbackColor = '.color-coding-fallback-color';

  static ShowMarkersAlways = '.show-markers-always';

  static DefaultAxisType = '.default-axis-type';

  static MarkerCoding = '.marker-coding';

  static HelpUrl = 'help.url';

  static OriginalTableName = '.orig.table.name';

  static OriginalViewName = '.orig.view.name';

  static CellRenderer = 'cell.renderer';

  /// Comma-separated list of domains the entity belongs to
  static Domains = 'domains';

  static Quality = 'quality';

  static Notation = 'notation';

  static LayoutColumnId = 'layout-column-id';

  static Units = 'units';

  static Format = 'format';

  static FormatFormula = '%formatFormula';

  static TooltipType = '.tooltip-type';

  static Markup = 'markup';

  static SourcePrecision = '.source-precision';

  static Formula = 'formula';

  static FormulaColumnType = '.%formula-column-type';

  /// JSON-encoded list of strings to be used in a cell editor.
  /// Applicable for string columns only.
  /// See also [AutoChoices].
  static Choices = '.choices';

  /// JSON-encoded order of categories. Applicable to string columns only.
  static CategoryOrder = '.category-order';

  static DefaultFilter = '.default-filter';

  static IgnoreCustomFilter = '.ignore-custom-filter';

  static CustomFilterType = '.custom-filter-type';

  static UseAsFilter = '.use-as-filter';

  static PickupColumnsTags = '.pickup-column-tags';

  static Charts = '.charts';

  /// When set to 'true', switches the cell editor to a combo box that only allows to choose values
  /// from a list of already existing values in the column.
  /// Applicable for string columns only.
  /// See also [Choices].
  static AutoChoices = '.auto-choices';

  static ImportTime = 'import-time';

  static Source = 'source';

  static SourceUri = 'source.uri';

  static SourceFile = 'source.file';

  static Db = 'Db';

  static DbSchema = 'DbSchema';

  static DbTable = 'DbTable';

  static DbColumn = 'DbColumn';

  static DbPath = 'DbPath';

  static SparqlEndpoint = 'sparql.endpoint';

  static SparqlOntology = 'sparql.ontology';

  static AggregationPivotValues = 'aggr.pivot.values';

  static AggregationSourceTableName = 'aggr.src.table.name';

  static AggregationSourceColumnName = 'aggr.src.col.name';

  static AggregationType = 'aggr.type';

  static PredictiveModel = 'predictive.model';

  static Id = '.id';

  static TableInfo = '.table-info';

  static VariableName = '.VariableName';

  static DataConnectionId = '.data-connection-id';

  static DataConnection = '.data-connection';

  static DataSource = '.DataSource';

  static DataSchema = '.DataSchema';

  static DataQueryId = '.DataQuery.id';

  static DataQueryName = 'DataQuery.name';

  static DataQueryFinished = '.DataQuery.query.finished';

  static Presentation = '.presentation';

  static QueryJson = '.query-json';

  /// Expression that was used to derive the column.
  static Expression = 'expression';

  static TableSchema = 'table_schema';

  static ReferencesTable = 'references_table';

  static ReferencesColumn = 'references_column';

  static ChemDescriptor = 'chem-descriptor';

  static ChemFingerprinter = 'chem-fingerprinter';

  static DataHistory = '.history';

  static CreationScript = '.script';

  static DataSync = '.data-sync';

  static IsDbEntity = '.db.entity';

  static IsDbView = '.db.view';

  static ColumnConverter = '.column.converter';

  static ValueValidators = '.value-validators';

  /// Applies to default filters for string columns only.
  /// When specified, treats the split strings as separate values in the filter
  static MultiValueSeparator = '.multi-value-separator';

  /// Name to be shown in the UI
  static FriendlyName = 'friendlyName';

  /// Whether users can rename this table from the UI
  static AllowRename = '.allow-rename';

  /// Applies to columns or dataframes.
  /// Comma-separated list of user or group names that are allowed to make changes to that column.
  static EditableBy = 'editableBy';

  /// Pin this column if you are specifically an editor (see "editable by").
  static PinIfEditable = 'pinIfEditable';

  /// Boolean flag that specifies whether the column is exported as part of the CSV file. Defaults to true.
  static IncludeInCsvExport = '.includeInCsvExport';

  /// Boolean flag that Specifies whether the column is exported as part of the binary file. Defaults to true.
  static IncludeInBinaryExport = '.includeInBinaryExport';

  /// Specifies the behavior of link click (open in new tab, open in context panel, custom)
  static LinkClickBehavior = '.linkClickBehavior';

  /// Pipe-separated path that defines where this column is within the hierarchy
  /// Used for dynamic forms construction, etc. Applies to columns.
  static Group = 'group';

  /// JSON string containing [JS API: GroupsDescription].
  /// Used to initialize the grid with group columns, colors, etc
  static ColumnGroups = '.columnGroups';

  /// Links column and db property
  static DbPropertyName = 'dbPropertyName';

  /// Links column and db property schema
  static DbPropertySchema = 'dbPropertySchema';

  /// Specifies the column that has entity key
  static DbPropertyReference = 'dbPropertyReference';

  /// Specifies entity type that reference entity had
  static DbPropertyReferenceType = 'dbPropertyReferenceType';

  /// Specifies if calculated columns are subscribed
  static CalculatedColumnsSubscribed = '.calculatedColumnsSubscribed';

  /// Boolean flag that allows not to show property panel for the cell/column
  static ShowPropPanels = '.show-prop-panels';

}
export class FuncOptions {
  /// Fully qualified name of the function that edits corresponding function calls
  static Editor = 'editor';

  /// Shows the function in the 'Action' pane
  static Action = 'action';

  /// Shows the function in the toolbox
  static Toolbox = 'toolbox';

  static AutostartImmediate = 'autostartImmediate';

  /// Applies to [FuncTypes.CellRenderer].
  /// Comma-separated list of key-value pairs that represent
  /// required tags for a column to be picked up by the renderer.
  static CellRendererColumnTags = 'columnTags';

  /// Applies to [FuncTypes.CellRenderer].
  /// Cell type (name of the renderer to be used in the UI).
  static CellRendererCellType = 'cellType';

  /// Applies to [FuncTypes.ValueEditor]. Refers to [Types].
  static InputPropertyType = 'propertyType';

  /// Applies to [FuncTypes.ValueEditor].
  static SemType = 'semType';

  /// Applies to [FuncTypes.Panel]
  static VisibilityCondition = 'condition';

  /// Demo path, such as 'Viewers | Radar'
  static DemoPath = 'demoPath';

  /// When set to 'true', the app operates in 'browseOnly' mode, using the browse tree for navigation
  /// and displaying results only within the browse view
  static BrowseOnly = 'browseOnly';

  /// Path in the browse tree, such as 'Oligo'
  static BrowsePath = 'browsePath';

  /// Viewer path in the top menu, should include the viewer name (Add | JavaScript Viewers | <ViewerPath>)
  static ViewerPath = 'viewerPath';

  /// When set to 'true', the function is shown in the grid context menu: Add | Summary Columns | ...
  static GridChart = 'gridChart';

  /// Boolean value that controls whether a function should be executed when the input changes.
  static RunOnInput = 'runOnInput';

  /// Boolean value that controls whether a function should be executed when the function preview opens.
  /// Applicable to models as well.
  static RunOnOpen = 'runOnOpen';

  /// When set to 'true', the function is higher-priority to be set in Filters Panel
  static PrimaryFilter = 'primaryFilter';

  /// Function that returns a Widget that gets added as a tab to the "Inspector" window
  static InspectorPanel = 'inspectorPanel';

  /// Function that should be cached
  static Cache = 'cache';

  /// Cron string that specifies when the cache is invalidated
  static CacheInvalidateOn = 'cache.invalidateOn';

  /// Specifies the position of the viewer (top, bottom, left, right, fill, auto)
  static ViewerPosition = 'viewerPosition';

  /// Specifies language of this [FuncTypes.ScriptHandler].
  /// Mandatory options if tag [FuncTypes.ScriptHandler] is present.
  static ScriptHandlerLanguage = 'scriptHandler.language';

  /// Specifies comma separated extensions that this [FuncTypes.ScriptHandler] supports.
  /// Mandatory options if tag [FuncTypes.ScriptHandler] is present.
  static ScriptHandlerExtensions = 'scriptHandler.extensions';

  /// Specifies friendlyName of this [FuncTypes.ScriptHandler] to be used in UI.
  /// Defaults to language
  static ScriptHandlerName = 'scriptHandler.friendlyName';

  /// Specifies comment start sign for this [FuncTypes.ScriptHandler]. Default: #
  static ScriptHandlerComment = 'scriptHandler.commentStart';

  /// Specifies function that will handle vectorizations of scripts for this [FuncTypes.ScriptHandler].
  /// The function should accept Script and return String with code that is vectorized.
  /// Scalar script inputs in this case are corresponding to dataframe column names. Dataframe that has [VectorScript.vecInputTableName]
  /// name should be used as target.
  static ScriptHandlerVectorization = 'scriptHandler.vectorizationFunction';

  /// Specifies template script for this [FuncTypes.ScriptHandler].
  static ScriptHandlerTemplate = 'scriptHandler.templateScript';

  /// Specifies code editor mode that will be used in CodeMirror for this [FuncTypes.ScriptHandler].
  /// Defaults to language.
  static ScriptHandlerEditorMode = 'scriptHandler.codeEditorMode';

}
export class FuncParamOptions {
  static SemType = 'semType';

  static Category = 'category';

  static Optional = 'optional';

  static Type = 'type';

  static Format = 'format';

  static AllowNulls = 'allowNulls';

  static Action = 'action';

  static Choices = 'choices';

  static Suggestions = 'suggestions';

  static Min = 'min';

  static Max = 'max';

  static Validators = 'validators';

  static Caption = 'caption';

  static Postfix = 'postfix';

  static Units = 'units';

  static Editor = 'editor';

  static Nullable = 'nullable';

  static Separators = 'separators';

  static Layout = 'layout';

  static EditorParam = 'editorParam';

  /// Column filter.
  /// Applies to dataframes and columns
  /// Example: `{columns: numerical}`
  static Columns = 'columns';

  /// A viewer that visualizes the result
  /// Example: `viewer: Line chart(x: "time", y: "temperature")`
  static Viewer = 'viewer';

  /// Works together with choices. When set to "all", changing of the choice
  /// would trigger propagation of this choice's default values for other parameters.
  /// Example: Compute/cars.js
  static PropagateChoice = 'propagateChoice';

}
