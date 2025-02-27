// Menu advanced item customization. For top menu, see menu.js

// Generate a dataframe for column selectors
const dataFrame = grok.data.testData('demog', 50);
const columnNames = dataFrame.columns.toList().map(c => c.name);
const numericalColumnNames = columnNames.filter(c => dataFrame.columns.byName(c).isNumerical);

// Create menu and disable immediate close after the first click
const menu = DG.Menu.popup();
menu.closeOnClick = false;

// Store selected items
let selectedContinuousPaletteIndex = -1;
let selectedCategoricalPaletteIndex = -1;
let lastHoveredCategoricalPaletteIndex = -1;
let selectedMultipleColumns = [];
let selectedSingleColumn = null;
let lastHoveredSingleColumn = null;

menu
	// Add header with no extra options.
  .header('Default header')
	.separator()
	// Add continuous color palette on the same menu level which stores and displays selected palette index.
  .colorPalette(DG.Color.continuousSchemes, {
		onSelect: color => {
			selectedContinuousPaletteIndex = DG.Color.continuousSchemes.indexOf(color);
			grok.shell.info(`Selected continuous palette: ${selectedContinuousPaletteIndex + 1}`);
		},
	})
	.separator()
	// Add categorical color palette which stores and displays selected palette index,
	// has hover and reset after hover effects. Placed in a nested 'Categorical Colors' group.
  .colorPalette(DG.Color.categoricalSchemes, {
		categorical: true,									// the way how colors are displayed
		asGroup: 'Categorical Colors',						// nested submenu group name
		getInitial: () => DG.Color.categoricalSchemes[0],	// initial value on menu open
		onPreview: color => {
			lastHoveredCategoricalPaletteIndex = DG.Color.categoricalSchemes.indexOf(color);
			grok.shell.info('Preview categorical palette: ' + (lastHoveredCategoricalPaletteIndex + 1));
		},
		onSelect: color => {
			selectedCategoricalPaletteIndex = DG.Color.categoricalSchemes.indexOf(color);
			grok.shell.info(`Selected categorical palette: ${selectedCategoricalPaletteIndex + 1}`);
		},
	})
	.separator()
	// Sdd header with some additional options
	.header('Clickable header', {
		hasHoverEffect: true,									// enable effects on hover
		onClick: () => grok.shell.info('Clicked on header!'),	// add click action
		getDescription: () => 'Click me!',						// add description on hover
	})
	.separator()
	// Add multi-column selector which allows to select column name array.
	// Displays current action (select/deselect, or dragging)
	// Placed in a nested 'multiColumSelector' group.
	.multiColumnSelector(dataFrame, {
		asGroup: 'multiColumSelector',
		initialValue: columnNames.slice(0, 5),	// select first 5 columns by default
		onChange: grid => {
			const previousLength = selectedMultipleColumns.length;
			selectedMultipleColumns = grid.getCheckedColumnNames();
			grok.shell.info( previousLength !== selectedMultipleColumns.length
				? `${selectedMultipleColumns.length} columns selected`	// if size is changed, then some column either added or removed
				: `"${grid.currentColumn}" column drag and dropped`);	// otherwise refresh fired because of drag and drop action
		},
	})
	.separator()
	// Add single-column selector which on the same menu
	// which stores and displays selected and last hovered column name.
	.singleColumnSelector(dataFrame, {
		initialValue: numericalColumnNames.at(-2),	// select 2nd from the end of numerical columns by default
		onChange (grid, column, currentRowChanged) {
			if (currentRowChanged) {				// if current row is changed on click
				selectedSingleColumn = column;
				grok.shell.info( `"${column.name}" column selected`);
			} else {								// otherwise on hover
				lastHoveredSingleColumn = grid.mouseOverColumn;
				grok.shell.info(`"${lastHoveredSingleColumn?.name ?? '[none]'}" column hovered`);
			}
		},
		columnFilter: (c) => c.isNumerical,	// show only numerical columns
	})
  .show();
