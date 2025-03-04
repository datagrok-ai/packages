---
title: Cheminformatics
keywords:
  - cheminformatics
  - SAR
  - R-groups analysis
  - chemical spreadsheet
  - activity cliffs
  - analyze docking
  - small molecules 3D rendering
  - chemical space analysis
  - substructure search
  - scaffold tree
  - chemical scripts
  - calculate descriptors
  - calculate fingerprints
  - drug likeness
  - structural alerts
  - Matched molecular pairs
  - MMP
  - docking
  - admetox
  - admet
---

```mdx-code-block
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
```

<details>
<summary>Requirements</summary>

To access the cheminformatics functionality, install these
packages using the [Package Manager](https://public.datagrok.ai/packages) (on the **Sidebar**, click **Manage** > **Packages**):

* Required. [Chem](https://github.com/datagrok-ai/public/tree/master/packages/Chem).
* Optional. Sketchers: The Chem package includes a built-in OpenChemLib Sketcher, but you can use your favorite sketcher, such as
  [Ketcher](https://github.com/datagrok-ai/public/tree/master/packages/KetcherSketcher) ([Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)), MarvinJS (commercial license), or ChemDraw (commercial license).
* Optional. [Chembl](https://github.com/datagrok-ai/public/tree/master/packages/Chembl): Integration with the ChEMBL database deployed on your premises.
* Optional. [DrugBank](https://github.com/datagrok-ai/public/tree/master/packages/DrugBank): Integration with DrugBank (information on 11,300 drugs is included with the plugin).
* Optional. Integration with external webservices (**these packages transmit your data to external services**):
  * [ChemblAPI](https://github.com/datagrok-ai/public/tree/master/packages/ChemblAPI)
  * [PubChem](https://github.com/datagrok-ai/public/tree/master/packages/PubChemApi)
  * [Enamine](https://github.com/datagrok-ai/public/tree/master/packages/EnamineStore): Integration with Enamine, a service for online shopping for the chemical building blocks.
  * [Chemspace](https://github.com/datagrok-ai/public/tree/master/packages/Chemspace): Integration with Chemspace, a service for online shopping for chemical building blocks.

</details>

Datagrok provides an intuitive interface and a wide range of tools for working
with chemical data:

* Data visualization and exploration
  * Automatic detection of chemical structures upon [data import](../../../../access/access.md).
  * Highly customized 2D (RDKit or OpenChemLib) and 3D (NGL) rendering of molecules.<!--Add links?-->
  * Multiple molecular [sketchers](#sketching).
  * Support for multiple formats, such as SMILES, SMARTS, InChI, InChiKey, SDF, PDB, MOL2, and others.
  * Flexible and fast [chemically-aware spreadsheet](#chemically-aware-spreadsheet).
  * Interactive visualization of chemical data using [chemically aware viewers](#chemically-aware-viewers).
  * Customizable [chemical info panes](#chemical-scripts) with information about molecules and context actions.
  * [Substructure search](#substructure-search--filtering).
  * [Chemical space analysis](#chemical-space).
  * Structure analysis using [R-groups decomposition](#r-groups-analysis), [scaffold tree](#scaffold-tree-analysis), [elemental analysis](#elemental-analysis).
  * SAR: [activity cliffs](#structure-relationship-analysis), [matched molecular pairs](#matched-molecular-pairs).
  <!--* [ADME/Tox calculators](#admetox).-->
  * Property and descriptor [calculators](#calculators).
  * A comprehensive [ML toolkit](../../../solutions/domains/data-science.md) for
clustering, dimensionality reduction techniques, imputation, PCA/PLS, and other tasks. Built-in statistics.
  * Flexible reporting and sharing options, including [dynamic dashboards](../../../../access/databases/databases.md#sharing-query-results).
* [QSAR and QSPR modeling support](#qsar-and-qspr-modeling)
* Common utilities: [identifier conversion](#molecule-identifier-conversions), [structure curation](#curation), [dataset mutation](#mutation), and [virtual synthesis](#virtual-synthesis).
* [Extensible environment](#customizing-and-extending-the-platform)
  * Ability to add or customize any functionality using [scripts](#chemical-scripts).
  * Ability to create custom plugins and fit-for-purpose applications.
* [Enterprise-grade platform](../../enterprise/enterprise-evaluation-faq.md) for efficient data access and management of any data.

## Data access

Datagrok provides a single, unified access point for organizations. You can connect to any of the [30+ supported data sources](../../../../access/databases/connectors/connectors.md), retrieve data, and securely share data with others.

Chemical queries against data sources require a chemical cartridge, such as [RDKit Postgres cartridge](https://www.rdkit.org/docs/Cartridge.html) or [JChem cartridge](https://docs.chemaxon.com/display/docs/JChem+Cartridge). These cartridges allow molecule-specific operations (like substructure or similarity searches) to be integrated into SQL queries using SQL syntax.

<details>
<summary> Example: Substructure search in a database </summary>

To create a chemically-aware query, use the SQL syntax specific to your cartridge. [Annotate parameters](../../../../access/databases/databases.md#parameterized-queries) like you would for a function. Here is an example of querying ChEMBL on Postgres with the RDKit cartridge installed:

Substructure search:

```
--name: @pattern substructure search
--connection: chembl
--input: string pattern {semType: Substructure}
--input: int maxRows = 1000
 select molregno,m as smiles from rdk.mols where m@>@pattern
 limit @maxRows
```

Similarity search:

```
--name: @pattern similarity search
--connection: chembl
--input: string pattern {semType: Substructure}
--input: int maxRows = 1000
select fps.molregno, cs.canonical_smiles as smiles
from rdk.fps fps
join compound_structures cs on cs.molregno = fps.molregno
where mfp2%morganbv_fp(@pattern)
limit @maxRows
````

To run a query, sketch the substructure and click **OK**. Datagrok retrieves the data and opens it in a spreadsheet.

![DB Substructure and Similarity Search](../../../../uploads/gifs/db-substructure-similarity-search.gif "DB Substructure and Similarity Search")

</details>

To learn more about querying data and data access in general, see the [Access](../../../../access/access.md) section of our documentation.

## Exploring chemical data

When you open a dataset, Datagrok automatically detects molecules and makes available molecule-specific context actions. For example, when you open a CSV file containing molecules in the SMILES format, the following happens:

* Data is parsed, and the [semantic type](../../../../govern/catalog/semantic-types.md) _molecule_ is assigned to the corresponding column.
* Molecules are automatically rendered in the spreadsheet.
* Column tooltip now shows the most diverse molecules in your dataset.
* Default column filter is now a sketcher-driven substructure search.
* A top menu item labeled **Chem** appears.
* When you click a molecule, the **Context Panel** on the right shows molecule-specific [info panes](../../../../datagrok/navigation/panels/info-panels.md), such as **Toxicity** or **Drug Likeness**.

![Chem dataset exploration](img/chem-exploration.png)

The following info panes are shown by default for the current molecule:

* Gasteiger Partial Charges (shows a 2D representation with partial charges highlighted).
* Descriptors (shows [descriptors](descriptors.md)).
* Properties (shows molecule properties).
* [Drug Likeness](info-panels/drug-likeness.md).
* [Structural Alerts](info-panels/structural-alerts.md).
* [Toxicity](info-panels/toxicity-risks.md) (predictions using [openchemlib calculations](https://github.com/Actelion/openchemlib)).
* Identifiers (shows [all known identifiers](#molecule-identifier-conversions) for the selected structure).
* 3D Structure
* 2D Structure
* Databases (performs substructure and similarity searches for the selected structure against all connected data sources).

The following info panes are shown by default for the current molecular column:

* Most Diverse Structures
* Rendering (offers rendering options for molecules):
  * Render a molecule or show its textual representation (**Show structures**).
  * Aligned to a particular scaffold (**Scaffold**).
  * Aligned to a scaffold defined in the specified column (**Scaffold column**).
  * Highlight the scaffold (**Highlight from column**).
  * Force regeneration for atom coordinates, even if the molecule is defined as a MOLBLOCK (**Regenerate coords**).
  * Type of the filter for that column (sketcher or categorical)(**Filter type**).

<details>
<summary>Info pane options</summary>

Some info panes can customized. To reveal an info pane's available options, hover over it:

* View and/or edit the underlying script (click the **Script** icon).
* Change parameters (click the **Parameter** icon).
* Change the info pane's settings (click the **Gear** icon).
* Append info pane as a column (click the **More actions** icon and select **Add as a column**).

![Customize-info-panes](img/interactive-panes.gif)

To learn how to customize and extend the platform programmatically, see the **Develop** section of our documentation.

</details>

:::note developers

Info panes can be extended with [functions](../../../concepts/functions/functions.md) in any supported language.

:::

### Chemically aware spreadsheet

The spreadsheet lets you visualize, edit, and efficiently work with chemical structures. Additionally, you can add new columns with calculated values or visualizations from info panes or context actions. The features also include the ability to interactively filter rows, color-code columns, pin rows or columns, set edit permissions, and more. To learn how to work with the spreadsheet, see [this article](../../../../visualize/viewers/grid.md) or complete [this tutorial](https://public.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/GridCustomization).

![Chemical spreadsheet](img/chem-spreadsheet-0.png)

### Chemically aware viewers

Datagrok _viewers_ recognize and display chemical data. The viewers were built from scratch to take advantage of Datagrok's in-memory database, enabling seamless access to the same data across all viewers. They also share a consistent design and usage patterns. Any action taken on one viewer, such as hovering, selecting, or [filtering](../../../../visualize/viewers/filters.md), is automatically applied to all other viewers, creating an interconnected system ideal for exploratory data analysis.

In addition to the chemical spreadsheet, examples of viewers include a [scatterplot](../../../../visualize/viewers/scatter-plot.md), a [network diagram](../../../../visualize/viewers/network-diagram.md), a [tile viewer](../../../../visualize/viewers/tile-viewer.md),a [bar chart](../../../../visualize/viewers/bar-chart.md), a [form viewer](../../../../visualize/viewers/form.md), and [trellis plot](../../../../visualize/viewers/trellis-plot.md), and [others](chemically-aware-viewers.md). All viewers can be saved as part of the [layout](../../../../visualize/view-layout.md) or a dashboard. Some viewers offer built-in statistics.

To learn how to use viewers to explore chemical data, complete [this tutorial](https://public.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/Viewers) or visit the [Visualize](../../../../visualize/viewers/viewers.md) section of our documentation.

:::note developers

You can [add custom viewers](../../../../develop/how-to/develop-custom-viewer.md).

:::

## Sketching

:::note

Datagrok provides integrations with various sketchers, but their availability depends on their licensing options. Some sketchers require a commercial license from the vendor before they can be used in Datagrok. To use these sketchers, you must provide a path to the license server.

<details>
<summary> How to provide a license path </summary>

1. Go to [**Manage** > **Packages**](https://public.datagrok.ai/packages) and select a package that you want to use.
1. Navigate to the **Context Panel** > **Settings** and enter the license path in the **License path** field.
1. Click **SAVE** to activate the license.

</details>

:::

To launch a sketcher, double-click a molecule.  Alternatively, in the **Actions** info pane, select **Sketch**.

You can sketch a molecule or retrieve one by entering SMILES, compound identifier, or a common name (like aspirin).<!--do we support FASTA sequences for small peptides?--> The following compound identifiers are natively understood since they have a prefix that uniquely identifies the data source: SMILES, InChI, InChIKey, ChEMBL, MCULE, comptox, and zinc (example: CHEMBL358225). The rest of the 30+ identifier systems can be referenced by prefixing the source name followed by a colon to the identifier (example: 'pubchem:11122').

<details>
<summary> Supported identifier systems </summary>

|              |             |              |                 |
|--------------|-------------|--------------|-----------------|
| actor        | drugbank    | lipidmaps    | pubchem         |
| atlas        | drugcentral | mcule        | pubchem_dotf    |
| bindingdb    | emolecules  | metabolights | pubchem_tpharma |
| brenda       | fdasrs      | molport      | recon           |
| carotenoiddb | gtopdb      | nih_ncc      | rhea            |
| chebi        | hmdb        | nikkaji      | selleck         |
| chembl       | ibm         | nmrshiftdb2  | surechembl      |
| chemicalbook | kegg_ligand | pdb          | zinc            |
| comptox      | lincs       | pharmgkb     |                 |

</details>

:::note developers

You can register a function to instruct Datagrok to retrieve molecules from a database using custom identifiers. To do so, [annotate the function](../../../concepts/functions/func-params-annotation.md) with the following parameters: `--meta.role: converter`and `--meta.inputRegexp:`. These annotations provide the necessary instructions for Datagrok to recognize the function as a converter and handle the input appropriately.

<details>
<summary>Example</summary>

The following code snippet defines a converter function that retrieves the SMILES representation of a molecule from the ChEMBL database using the provided ChEMBL identifier. The output is the canonical SMILES string representing the molecule.

```
--name: chemblIdToSmiles
--friendlyName: Converters | ChEMBL to SMILES
--meta.role: converter
--meta.inputRegexp: (CHEMBL[0-9]+)
--connection: Chembl
--input: string id = "CHEMBL1185"
--output: string smiles { semType: Molecule }
--tags: unit-test
select canonical_smiles from compound_structures s
join molecule_dictionary d on s.molregno = d.molregno
where d.chembl_id = @id
--end
```

</details>

:::

From the **Hamburger** (☰) menu, you can access the following features:

* Copy a molecule as SMILES or MOLBLOCK.
* View recently sketched structures.
* View/add to favorites.
* Switch between available sketchers. Datagrok remembers your preferred sketcher type, so you don't have to select it every time you use it.

![Sketcher features](img/sketcher-menu-0.png)

Sketchers are synchronized with the **Context Panel**. As you draw or edit a molecule, the info panes on the right dynamically update with the information about the sketched compound.

## Structure search

### Substructure search / Filtering

Datagrok offers an intuitive filtering functionality to explore and filter datasets. Hovering over categories or distributions in the **Filter Panel** instantly highlights relevant data points across all viewers. For molecules, Datagrok uses integrated [sketchers](#sketching) to allow structure-based filtering. After applying the filter, Datagrok highlights the queried substructures in the filtered subset.

![Filter by substructure](img/filter-substructure.gif)

<details>
<summary>How to use</summary>

To filter by substructure, follow these steps:

1. On the **Menu Ribbon**, click the **Filter** icon to open the **Filter Panel**. The panel shows filters for all dataset columns. By default, the substructure filter is displayed on top, but you can rearrange, add, or remove filter columns by using available controls.
1. Open the sketcher by clicking the **Click to edit** button. Sketch or enter a substructure.
1. Once finished, click **OK** to apply the filter.

To clear the filter, use the checkbox provided. To remove the filter altogether, use the **Close** (**x**) icon.

</details>

To learn more about filtering, watch this [video](https://www.youtube.com/watch?v=GM3XixUFFUs&t=2688s) or read [this article](../../../../datagrok/navigation/views/table-view.md#select-and-filter).

### Similarity and diversity search

Datagrok offers two analytical tools to help you analyze a collection of molecules based on molecular similarity: _similarity search_ and _diversity search_. Similarity search finds structures similar to the reference molecule, while diversity search shows N molecules of different chemical classes presented in the dataset. Both tools are based on fingerprints, with the customizable distance metric.

<details>
<summary> Available distance metrics </summary>

* Tanimoto
* Dice
* Cosine

</details>

To sort a dataset by similarity, right-click your reference molecule and select **Current value** > **Sort by similarity**. The dataset is sorted with the reference molecule pinned at the top.

To explore the dataset further, use the similarity and diversity viewers (**Top Menu** > **Chem** > **Search** > **Similarity Search...**  or **Diversity Search...**). The viewers are interactive and let you quickly switch between the molecules of interest. 

<img alt="Similarity and diversity search" src={require('./similarity-and-diversity-search.gif').default} width="800px"/>

<details>
<summary>How to use</summary>

To configure a similarity or diversity viewer, click the **Gear** icon at the viewer's top. The **Context Panel** updates with available controls. You can change parameters like the similarity threshold, fingerprint type<!--we only have Morgan?-->, or the distance measure.

By default, a reference molecule follows the current row. If you click a different molecule, the similarity viewer updates accordingly. To lock in a specific reference molecule, clear the **Follow Current Row** control. To sketch a custom reference molecule, click the **Edit** icon on the reference molecule card.

You can enhance the viewer cards by incorporating column data. To do so, use the **Molecule Properties** control. If a column is color-coded, its format is reflected on the card's value. To adjust how the color is shown (either as a background or text), use the **Apply Color To** control. To remove highlighting, clear the color-coding from the corresponding column in the dataset.

![similarity_search_add_fields](img/simsearch-colors.gif)

</details>

### Chemical space

Datagrok lets you analyze chemical space using distance-based dimensionality reduction algorithms, such as [tSNE](https://scikit-learn.org/stable/modules/generated/sklearn.manifold.TSNE.html) and [UMAP](https://umap-learn.readthedocs.io/en/latest/). These algorithms use fingerprints to convert cross-similarities into 2D coordinates. This allows to visualize the similarities between molecular structures and identify clusters of similar molecules, outliers, or patterns that might be difficult to detect otherwise. The results are visualized on the interactive [scatterplot](../../../../visualize/viewers/scatter-plot.md).

![chem-space](../../../../compute/chem-space.gif)

<details>
<summary> How to use: </summary>

Go to the **Top Menu Ribbon** and choose **Chem** > **Analyze** > **Chemical Space...** This opens a **Chemical Space** parameter dialog.

The dialog has the following inputs:

* **Table**: The table containing the column of sequences.
* **Column**: The column containing the sequences.
* **Encoding function**: The encoding function that will be used for pre-processing of molecules. Currently, only one encoding function is available, that will use [chemical fingerprint](https://www.rdkit.org/UGM/2012/Landrum_RDKit_UGM.Fingerprints.Final.pptx.pdf) distances between each molecule to calculate pairwise distances. The `Fingerprints` function has 1 parameter which you can adjust using the gear (⚙️) button next to the encoding function selection: 
    * Fingerprint type: The type of molecular fingerprints that will be used to generate monomer substitution matrix. Options are `Morgan`, `Pattern` or `RDKit`.
* **Method**: The dimensionality reduction method that will be used. The options are:
    * UMAP: [UMAP](https://umap-learn.readthedocs.io/en/latest/) is a dimensionality reduction technique that can be used for visualization similarly to t-SNE, but also for general non-linear dimension reduction.
    * t-SNE: [t-SNE](https://en.wikipedia.org/wiki/T-distributed_stochastic_neighbor_embedding) is a machine learning algorithm for dimensionality reduction developed by Geoffrey Hinton and Laurens van der Maaten. It is a nonlinear dimensionality reduction technique that is particularly well-suited for embedding high-dimensional data into a space of two or three dimensions, which can then be visualized in a scatterplot.

    Other parameters for dimensionality reduction method can be accessed through the gear (⚙️) button next to the method selection.
* **Similarity**: The similarity/distance function that will be used to calculate pairwise distances between fingerprints of the molecules. The options are: `Tanimoto`, `Asymetric`, `Cosine` and `Sokal`. All this distance functions are based on the [bit array](https://en.wikipedia.org/wiki/Bit_array) representation of the fingerprints.

* **Plot embeddings**: If checked, the plot of the embeddings will be shown after the calculation is finished.
* **Postprocessing**: The postprocessing function that will be applied to the resulting embeddings. The options are:
    * **None**: No postprocessing will be applied.
    * **DBSCAN**: The DBSCAN algorithm groups together points that are closely packed together (points with many nearby neighbors), marking as outliers points that lie alone in low-density regions (whose nearest neighbors are too far away). The DBSCAN algorithm has two parameters that you can adjust through the gear (⚙️) button next to the postprocessing selection:
        * **Epsilon**: The maximum distance between two points for them to be considered as in the same neighborhood.
        * **Minimum points**: The number of samples (or total weight) in a neighborhood for a point to be considered as a core point. This includes the point itself.
    * **Radial Coloring**: The radial coloring function will color the points based on their distance from the center of the plot. The color will be calculated as a gradient from the center to the border of the plot.

**WebGPU (experimental)**

WebGPU is an experimental feature that allows you to use the GPU for calculations in browser. We have implemented the KNN graph generation (with support to all simple and non-trivial distance functions like Tanimoto, Cosine, etc.) and UMAP algorithms in webGPU, which can be enabled in the dimensionality reduction dialog. This can speed up the calculations significantly, especially for large datasets, up to 100x. This option can be found in the gear (⚙️) button next to the method selection (UMAP). 

Please note, that webGPU is still considered as experimental feature, and for now only works in Chrome or Edge browsers (although it is planned to be supported in Firefox and Safari in the future). If webGPU is not supported in your browser, this checkbox will not appear in the dialog. To make sure that your opperating system gives browser access to correct(faster) GPU, you can check the following:
* Go to settings and find display settings
* Go to Graphics settings.
* In the list of apps, make sure that your browser is set to use high performance GPU.

</details>

## Structure analysis

### R-groups analysis

R-group analysis decomposes a set of molecules into a core and R-groups (ligands at certain attachment positions), and visualizes the results. The query molecule
consists of the scaffold and ligand attachment points represented by R-groups.
R-group analysis runs in browser using RDKit JS library.

<img alt="R-Group Analysis" src={require('./img/new_r_group_analysis.gif').default} width="800px"/>

<details>
<summary> How to use </summary>

1. Go to **Chem** > **Analyze SAR** > **R-Groups Analysis...**
A [sketcher](#sketching) opens.
1. In the sketcher, specify the common core (scaffold) for the selected molecular column using one of these methods:
   * Draw or paste a scaffold in the sketcher. You can define core with custom enumerated R groups.
   * Click **MCS** to automatically identify the most common substructure.
   * Click the **Gear** icon to adjust R group analysis parameters.
1. Click **OK** to execute. The R-group columns are added to the dataframe, along with a [trellis plot](../../../../visualize/viewers/trellis-plot.md) for visual exploration.

R-groups are highlighted with different colorsin the initial molecules in dataframe. Molecules are automatically aligned by core. To filter molecules with R group present in each enumerated position use **isHeat** column.

The trellis plot initially displays pie charts. To change the chart type, use the **Viewer** control in the top-left corner to select a different viewer.

If you prefer not to use a trellis plot, close it or clear the **Visual analysis** checkbox
during Step 2. You can manually add it later. You can also use other [chemical viewers](chemically-aware-viewers.md), like scatterplot, box plot, bar chart, and others.

Use **Replace latest** checkbox to remove previous analysis results when running the new one. Or check it to add new analysis results in addition to existing.

</details>

:::note developers

To run the r-group decomposition programmatically, see [this sample script](https://public.datagrok.ai/js/samples/domains/chem/r-group).

:::

### Scaffold tree analysis

Scaffold tree organizes molecular datasets by arranging molecules into a tree hierarchy based on their scaffolds. This hierarchy can then be used for filtering or selecting the corresponding rows in the dataset.

A hierarchy can be either generated automatically, or sketched manually. To access, in the **Menu Ribbon** select **Chem** > **Analyze** > **Scaffold Tree**. When Scaffold Tree is initially created, a tree is generated automatically. You can also sketch the tree manually, or modify the automatically generated one. For tree generation, we use a derivative of the open-source
[ScaffoldGraph](https://github.com/UCLCheminformatics/ScaffoldGraph) library
developed by Oliver Scott.

:::note

Scaffold tree generation is computationally intensive and may take a significant time.

:::

![scaffold-tree-generate-edit](scaffold-tree-generate-edit.gif)

A scaffold tree consists of scaffolds and orphan nodes. Each scaffold should contain its parent scaffold as a substructure. Orphans are molecules that contain the parent scaffold but do not contain any of the sibling scaffolds. A picture best illustrates this:

![Scaffold tree anatomy](scaffold-tree-anatomy.png)

<details>
<summary>Sketch or modify a scaffold tree</summary>
To manually sketch or modify the scaffold tree, use these controls:

* To clear the tree, in the **Toolbar**, click the **Drop all trees** (trash) icon.
* To add a new root node,  in the **Toolbar**, click the **Add new root structure** (**+**) icon. This opens a molecular sketcher.
* To add a new scaffold under an existing one, click the **Add new scaffold** (**+**) icon next to the scaffold.
  Alternatively, right-click the molecule and select **Add New...**.
* To delete a scaffold along with its children, right-click it and select **Remove**.
* To edit a scaffold, click the **Edit...** icon next to the scaffold.
  Alternatively, right-click the molecule, and select **Edit...**. This opens a molecular sketcher.

In addition, you can download a file with the scaffold tree to your local drive. To do so, hover over any scaffold tile and click the **Download** icon in the **Toolbar**. To load a previously saved tree, hover over any scaffold tile and click the **Open** (+) icon in the **Toolbar**, then select the saved file.

![scaffold-tree-controls](img/scaffold-tree-toolbar-actions-1.png)

</details>

Scaffold tree is a viewer, which means it's synchronized with other viewers, can be shared or saved as part of a [layout](../../../../visualize/view-layout.md) or a dashboard, or used to filter a dataset.

<details>
<summary>Filtering and selection</summary>

To highlight rows matching a particular scaffold, hover the mouse over the
scaffold tile. To select rows matching a particular scaffold, click the **Select
rows** icon next to the scaffold. To deselect rows matching a particular
scaffold, click the **Deselect rows** icon next to the scaffold. The state is
picked up by other viewers.

![scaffold-tree-filter-select](scaffold-tree-filter-select.gif)

To filter a dataset using a scaffold tree, do the following:

* To filter by a particular scaffold exclusively, select the checkbox
  to the left of the molecule. This action automatically clears any other checkboxes and helps to navigate quickly within the dataset.
* To add another scaffold to the filtered subset, select the corresponding
  checkbox. Use the **AND/OR** control in the **Toolbar** to set the desired
  logical operation. If needed, you can invert the function of an individual
  checkbox to exclude the scaffold from the subset instead of adding it. To
  invert the checkbox mode, click the **Doesn't equal** icon located in the top
  left corner of the scaffold tile. The change in the state of an individual
  checkbox doesn't affect the state of other checkboxes.
* To clear all filters, click the **Filter** icon in the **Toolbar**.

![scaffold-tree-controls](img/scaffold-tree-toolbar-actions-1.png)

You can add the scaffold tree as a filter to the **Filter Panel**:

1. In the **Menu Ribbon**, click the **Filter** icon to toggle the **Filter panel**.
1. In the top left corner, click the **Hamburger** (☰) icon > **Add External** > **Scaffold Tree Filter**. A dialog opens.
1. In the dialog, select the molecular column and click **OK**. A scaffold tree tile is added to the **Filter Panel**.
1. To filter, click the **Add** (**+**) icon, then paste or draw a scaffold using a sketcher.

![Scaffold tree filter panel](scaffold-tree-filter.gif)

You can use a scaffold tree with other [filters](../../../../visualize/viewers/filters.md), where each filter eliminates rows that do not meet the filtering criteria.

</details>

### Elemental analysis

**Elemental Analysis** analyzes the elemental composition of a molecular structure and visualizes the results in a [radar viewer](../../../../visualize/viewers/radar.md). Each point on the chart represents an element, and the distance from the center of the chart to the point indicates the relative abundance of that element in the structure. Use it as a basic tool to explore the dataset and detect rare elements and unique properties.

<details>
<summary>How to use</summary>

1. In the **Menu Ribbon**, open the **Chem** menu and select **Analyze structure** > **Elemental Analysis...** A parameter input dialog opens.
1. In the dialog:
   1. Select the source table and the molecular column that you want to analyze.
   1. Select the desired visualization option. You can choose between a standalone viewer (select **Radar View**) and sparklines (select **Radar Grid**), both of which use a radar viewer.
1. Click **OK** to execute the analysis. New columns with atom counts and molecule charges are added to the spreadsheet and plotted on a radar chart using the selected visualization option.

</details>

## Structure relationship analysis

### Activity cliffs

The Activity Cliffs tool in Datagrok detects and visualizes pairs of molecules with highly similar structures but significantly different activity levels, known as "activity cliffs." This tool uses distance-based dimensionality reduction algorithms (such as [tSNE](https://scikit-learn.org/stable/modules/generated/sklearn.manifold.TSNE.html) and [UMAP](https://umap-learn.readthedocs.io/en/latest/)) to convert cross-similarities into a [2D scatterplot](../../../../visualize/viewers/scatter-plot.md).

![Activity cliffs](activity-cliffs-0.png)

<details>
<summary>How to use</summary>

1. Open the **Chem** menu and select **Analyze SAR** > **Activity Cliffs**.
1. In the parameter input dialog, specify the following:
   1. Select the source table, molecular column, and activity data column to analyze.
   1. Set the similarity cutoff.
   1. Select a dimensionality reduction algorithm and adjust its parameters using the **Gear** icon next to the **Method** control.
1. Click **OK** to execute the analysis. A scatterplot visualization is added to the view.
1. Optional. In the scatterplot, click the link with the detected number of cliffs to open an **Activity Cliffs** table containing all pairs of molecules identified as cliffs. The tables also have detailed information such as similarity score, activity difference score, and other data.

In the scatterplot, the marker color corresponds to the level of molecule activity, and the size represents the maximum detected activity cliff for that molecule. The opacity of the line connecting molecule pairs corresponds to the size of the activity cliff.

To explore the molecule pairs:

* Click a molecule in the source dataframe to zoom in on the scatterplot and focus on the pair that includes the selected molecule. Hover over molecule pairs and connecting lines to see summary information about them.
* Click the line connecting molecules in the scatterplot to select a corresponding pair of molecules in the underlying dataframe and **Activity Cliffs** table. The reverse also applies: clicking a pair in the **Activity Cliffs** table updates the scatterplot and selects the corresponding rows in the underlying dataframe.

As you browse the dataset, the **Context Panel** updates with relevant information.

</details>

### Matched molecular pairs

The **Matched Molecular Pairs** (MMP) tool is a powerful cheminformatics method for analyzing structural transformations within chemical datasets.
It enables chemists and computational researchers to identify small,
well-defined molecular modifications and quantify their impact on key properties such
as potency, solubility, permeability, and/or ADMET characteristics.

MMP analysis is particularly valuable in lead optimization, where systematic exploration of chemical space can guide the design of more effective drug candidates.
By studying how molecular fragments influence activity, the tool helps users make data-driven decisions when selecting modifications to improve lead compounds.

Traditionally, lead optimization relies on trial and error, guided by medicinal chemistry intuition.
MMP analysis enhances this process by providing quantitative insights into structure-activity relationships (SAR), helping to answer key questions:

* Which molecular transformations are most frequently associated with improved activity?
* Does replacing a specific fragment increase or decrease potency?
* Are there consistent trends in physicochemical properties across multiple transformations?
* Can we predict the impact of a given substitution before synthesizing a new molecule?

By leveraging a data-driven approach, the MMP tool provides a systematic way to explore molecular modifications, ensuring that optimization efforts are based on real-world patterns rather than guesswork.

## How it works

1. **Pair identification** – The algorithm scans the dataset to detect matched molecular pairs, defined as molecules that differ by a single small transformation while having a common core.
2. **Activity & property calculation** – The difference in biological activity or physicochemical properties between each pair is calculated.
3. **Statistical aggregation** – Changes across multiple pairs are averaged to identify consistent transformation trends.
4. **Visualization & exploration** – Users can interactively explore the results through various tables, chemical space plots, and other graphical representations.
5. **Molecule generation** – Transformations identified in the dataset can be applied to new molecules, predicting their potential properties.

## From analysis to action

MMP analysis not only reveals how structural modifications impact molecular properties but also provides a framework for making informed optimization decisions.
By systematically examining transformations, researchers can:

* Identify key substitution patterns that lead to increased activity or improved ADMET/other properties.
* Uncover structure-property relationships that guide rational lead optimization.
* Generate and evaluate new compounds, leveraging known transformations to design better drug candidates.

With its interactive visualizations and predictive capabilities, the MMP tool transforms raw chemical data into actionable insights,
helping scientists refine molecular designs with greater confidence and efficiency.
Whether optimizing a single lead or exploring large compound libraries, MMP analysis provides the clarity needed to make smarter, faster decisions in drug discovery.

![MMP Demo](img/mmp-full.gif)

<details>
<summary>How to use</summary>

To run MMP analysis:

1. In the **Top Menu**, select **Chem** > **Analyze** > **Matched Molecular
 Pairs...** A dialog opens.
1. In the dialog, select the table you want to analyze (**Table**), the column
 containing molecules within this table (**Molecules**), the
 activity/property columns (**Activity**), and the maximum fragment size relative to the core (**Fragment Cutoff**). Click **OK**. An MMP section is
 added to the view. It has four tabs:

<Tabs>
<TabItem value="substitutions" label="Substitutions" default> 

The **Substitutions** tab has two tables:

* **The upper table (Fragments)** shows all fragment substitutions found in the dataset. It includes the frequency of each substitution and the
 corresponding change in the analyzed activity or property. There are two modes to explore fragments dataset:
 - *All* shows all found fragment pairs at once
 - *Current* shows fragment pairs found for the current molecule in the initial dataset. Use *Current* mode and click any molecule in the initial dataset to filter corresponding substitutions.
 The information message on the left top corner of the table shows how many rows are filtered.
 ![Fragments modes](img/mmp_fragments_modes.gif)

 Click any row in the **Fragments** table to show all molecule pairs with corresponding substitution in the **Molecule pairs** table. Molecules are taken from the initial dataset.
 Select rows with `Ctrl` + click in the **Fragments** table to select all molecules with corresponding substitution (having either *From* or *To* fragment) in the initial dataset.
 ![Fragments selection](img/mmp_fragments_selection.gif)


* **The lower table (Molecule pairs)** shows all pairs of molecules associated with the
 substitution from the upper table. It provides details about the analyzed
 activity or property for each pair of molecules.
 Click any row in the **Fragments** table to filter molecule pairs with current substitution. If *Current* mode is selected on the **Fragments** table, then the pair containing the current molecule from the initial dataset will be on top.
 Corresponding fragments are highlighted within each molecule.
 Click any row in **Molecule pairs** table to pin corresponding *From* and *To* molecules in the initial dataset and to open **Context panel** with molecules pair details.
 Select rows with `Ctrl` + click to select corresponding *From* and *To* molecules in the initial dataset.
 ![Molecule pairs](img/mmp_molecule_pairs_navigation.gif)

Click **+** icon above the corresponding table to add it to the workspace.

</TabItem>
<TabItem value="fragments" label="Fragments">

The **Fragments** tab has two components:

* [trellis plot](../../../../visualize/viewers/trellis-plot.md) shows all identified
fragments on the x and y axes. Each intersection in the plot displays the change
in the analyzed activity or property resulting from a fragment substitution.

* **Molecule pairs** table. The same as on **Substitutions** tab

Click on any non-empty cell on the trellis plot to filter molecule pairs with the corresponding substitution in the **Molecule pairs** table.
![Fragments trellis plot](img/fragments_trellis_plot.gif)

Filter the trellis plot using the filter icon above the viewer.
![Filter Fragments trellis plot](img/filter_fragments_trellis_plot.gif)

Sort trellis plot using sort icons on the axes. Two sorting options are available: fragment frequency and molecular weight.
![Sort Fragments trellis plot](img/sort_fragments_trellis_plot.gif)


</TabItem>
<TabItem value="cliffs" label="Cliffs"> 

The **Cliffs** tab has two components:

* [scatterplot](../../../../visualize/viewers/scatter-plot.md) shows clusters of
molecules with similar structures but significant differences in the analyzed
activity or property. Arrows connecting molecules represent changes in the
specified activity or property, with the arrow pointing toward the molecule with
the higher value.

* **Molecule pairs** table. The same as on **Substitutions** tab. Show or hide the table using **Show Pairs** checkbox above the scatterplot.
Click any row to zoom to the corresponding molecule pair on the scatterplot and show details in the **Context Panel**.
Navigation also works vice versa: click an arrow on a scatterplot to zoom in and make molecule pair current in the **Molecule pairs** table.
![Cliffs scatterplot](img/cliffs_scatter_plot.gif)

Use activity filters on a scatterplot to filter pairs by activity difference. The filter is reflected in the **Molecule pairs** table.
![Filter Cliffs scatterplot](img/filter_cliffs_scatter_plot.gif)


</TabItem>
<TabItem value="generation" label="Generation">

In the **Generation** tab, transformation rules derived from the matched molecule pairs in
your dataset are used to generate new molecules and predict their property and
activity values. For every molecule in your dataset, the table shows each
potential transformation, providing:

* Both the starting and new compounds.
* The maximum common substructure for this pair and the substituted fragment.
* Original and predicted values for one of the analyzed activities or
 properties.
* Whether a new molecule already exists in the initial dataset or is newly generated

In the **Context panel** there is a scatterplot showing observed vs predicted values for each activity for molecules from the initial dataset.

![MMP Generations](img/mmp-generations.gif)

</TabItem>
</Tabs>
</details>

<!--### ADME/Tox-->

<!--The **ADME/Tox** tool predicts absorption, distribution, metabolism, excretion, toxicity, solubility, and lipophilicity properties for chemical structures. The tool obtains predictions for either a single chemical structure (implemented as a chemical info pane) or for an entire column of structures (available from the context menu). Under the hood, the tool uses publicly available [ADMETlab](https://github.com/ifyoungnet/ADMETlab) models.

[gif placeholder]

[INSERT DETAILS ADMONITION]
How to use

For individual molecules, the ADME/Tox prediction happens automatically as you browse the dataset. Upon clicking a molecule, the **Context Panel** dynamically updates to show all available predictions in the **ADME/Tox** info pane.

To predict properties for the entire column:

1. In the **Menu Ribbon**, select **Chem** > **ADME/Tox**. An **ADME/Tox** dialog opens.
1. In the dialog, select the desired options for predicting ADMET, lipophilicity, and solubility.
1. Click **OK** to execute. The corresponding numerical columns for each prediction are added to the dataframe, along with the [form viewer](../../../../visualize/viewers/form.md) for visual exploration.

You can visualize or filter these predictions using the built-in tools provided by Datagrok.

[CLOSE DETAILS ADMONITION]-->

## QSAR and QSPR modeling

Datagrok lets you easily train, apply, and manage structure-based [predictive models](../../../solutions/domains/data-science.md#predictive-modeling)
using these modeling methods:

1. Classical models (such as XGBoost) that work on the calculated descriptors.
1. Cheminformatics-specific models, such as [chemprop](https://chemprop.readthedocs.io/en/latest/#).

<details>
<summary>Train</summary>

Train a model based on a measured response using calculated descriptors as
features. Use an integrated [model building mechanism](../../../../learn/learn.md) that supports different backends and
dozens of models with hundreds of hyperparameters available. You may try it as a
[tutorial](https://dev.datagrok.ai/apps/tutorials/Tutorials/Cheminformatics/VirtualScreening)
and walk through an illustrative example of virtual screening exercise.

![Training](../../../../uploads/gifs/chem-train-model.gif "Training")

</details>

<details>
<summary>Apply</summary>

[Model building mechanism](../../../../learn/learn.md#apply-model)

![Applying](../../../../uploads/gifs/chem-apply-model.gif "Applying")

</details>

<details>
<summary>Augment</summary>

A simple yet efficient way to deploy models is through the use of [info panes](../../../../datagrok/navigation/panels/info-panels.md). These panes provide predicted values that dynamically update as you interact with a chemical structure (e.g.,  upon clicking, modifying, or sketching a molecule.) This approach enables quick access to model predictions, enhancing the user experience and facilitating insights.

![Augmenting](../../../../uploads/gifs/chem-model-augment.gif "Augmenting")

</details>

## Chemical scripts

Chem package comes with several scripts that can be used either directly, or as an example for building custom chemical functions in languages such as Python (with RDKit) or R. These chemical functions can be integrated into larger scripts and workflows across the platform, enabling a variety of use cases such as data transformation, enrichment, calculations, building UI components, workflow automation, and more. Here's an example:

```mdx-code-block
<Tabs>
<TabItem value="script" label="Script" default>
```

![Gasteiger partial charges script](img/script-gasteiger-part-charges-0.png)

```mdx-code-block
</TabItem>
<TabItem value="script-output" label="Script output">
```

![Gasteiger partial charges script output](img/script-output-gasteiger-part-charges-0.png)

```mdx-code-block
</TabItem>
<TabItem value="script-output-in-info-pane" label="Script output in info pane">
```

![Script-based info pane](img/script-output-info-pane-0.png)

```mdx-code-block
</TabItem>
</Tabs>
```

In this example, a [Python script based on RDKit](https://public.datagrok.ai/script/276a5929-6f21-5105-8eec-576845aabae0)
calculates and visualizes Gasteiger partial charges. When you run the script
explicitly, Datagrok shows a dialog for sketching a query molecule and
visualizes the results. In this case, however, the script is also tagged as a
`panel`. This instructs Datagrok to show the results as an interactive UI
element that updates dynamically for the current molecule.

To view the chemical scripts you've created or those shared with you, open the [Scripts Gallery](https://public.datagrok.ai/scripts?q=%23chem) (**Functions** > **Scripts**) and filter by the tag `#chem`. You can search for individual scripts and use the **Context Panel** to view details, edit, run, manage, and perform other actions for the selected script.

:::note

For a full list of chemical scripts, along with details on their implementation and associated performance metrics, see [Chemical scripts](scripts/chem-functions.md). To learn more about scripting, see [Scripting](../../../../compute/scripting/scripting.mdx).

:::

## Utilities

Datagrok offers [multiple ways to transform and enrich your data](../../../../transform/transform.md). For example, you can link tables, extract values, or add metadata to annotate your dataset with experimental conditions or assay results<!--need a link out to how to add metadata-->. You can also use [chemical scripts](#chemical-scripts) to execute operations on chemical data, including calculation of fingerprints and descriptors, toxicity prediction, and more.

### Calculators

#### Molecular descriptors and fingerprints

Datagrok supports the calculation of different sets of descriptors and fingerprints:

* Lipinski, Crippen, EState, EState VSA, Fragments, Graph, MolSurf, QED. See [this reference article](descriptors.md) for additional details.
* RDKFingerprint, MACCSKeys, AtomPair, TopologicalTorsion, Morgan/Circular. See [this reference article](fingerprints.md) for additional details.

For individual molecules, descriptors are calculated in real-time and presented in the **Descriptors** info pane (**Context Panel** > **Chemistry** > **Descriptors**), which dynamically updates as you interact with a chemical structure (e.g., upon clicking, modifying, or sketching a molecule.) You can also calculate descriptors or fingerprints for the entire column by choosing the corresponding option from the **Chem** > **Calculate** menu.

#### Molecule identifier conversions

Datagrok supports the conversion of various molecule identifiers, including proprietary identifiers, allowing you to work with multiple data sources and tools. For example, you can convert a SMILES string to an InChI and vice versa.

<details>
<summary> Supported data sources</summary>

|              |             |              |                 |
|--------------|-------------|--------------|-----------------|
| actor        | drugbank    | lipidmaps    | pubchem         |
| atlas        | drugcentral | mcule        | pubchem_dotf    |
| bindingdb    | emolecules  | metabolights | pubchem_tpharma |
| brenda       | fdasrs      | molport      | recon           |
| carotenoiddb | gtopdb      | nih_ncc      | rhea            |
| chebi        | hmdb        | nikkaji      | selleck         |
| chembl       | ibm         | nmrshiftdb2  | surechembl      |
| chemicalbook | kegg_ligand | pdb          | zinc            |
| comptox      | lincs       | pharmgkb     |                 |

</details>

For individual molecules, the conversion happens automatically as you interact with molecules, and the **Context Panel** shows all available identifiers in the **Identifiers** info pane (**Context Panel** > **Structure** > **Identifiers**). You can also convert the entire column by choosing the corresponding option from the **Chem** > **Calculate** menu.

:::note developers

To run programmatically, use the `#{x.ChemMapIdentifiers}` function.

:::

### Curation

Datagrok supports [chemical structure curation](https://pubs.acs.org/doi/10.1021/ci100176x), including kekulization, normalization, reorganization,  neutralization, tautomerization, and the selection of the main component.

<details>
<summary> How to use </summary>

To perform chemical structure curation:

1. Navigate to **Menu Ribbon** > **Chem** > **Transform** > **Curate**.
1. In the **CurateChemStructures** dialog, select from the available options and click **OK**. This action adds a new column containing curated structures.

![Curation](chem_curation_demo.gif "Curation")<!--replace with new UI-->

</details>

### Mutation

You can generate a dataset based on the preferred structure.

<details>
<summary> How to use </summary>

To perform chemical structure mutation:

1. Navigate to **Menu Ribbon** > **Chem** > **Transform** > **Mutate**.
1. In the **Mutate** dialog, draw or paste the desired structure and set other parameters, including the number of mutated molecules. Each mutation step can have randomized mutation mechanisms and places (select the **Randomize** checkbox).
1. Click **OK** to execute. A new table with mutated structures opens.

</details>

### Virtual synthesis

You can use the `Chem: TwoComponentReaction` function to apply specified chemical reactions to a pair of columns containing molecules in a virtual synthesis workflow. The output table contains a row for each product yielded by the reaction for the given inputs.

![Reactions](../../../../uploads/chem/reactions.png "Reactions")

<details>
<summary>How to use</summary>

1. Open the **Two Component Reaction** dialog by executing the `Chem: TwoComponentReaction` function in the **Console**. This opens a parameter input dialog.
1. In the dialog:
   1. Select the reactants to use.
   1. Enter reaction in the filed provided.
   1. Choose whether to combine the reactants from two sets, or sequentially, and whether to randomize, by checking or clearing the Matrix Expansion and Randomize checkboxes.
   1. Set other parameters, such as seed, the number of maximum random reactions.
   1. Click **OK** to execute.

</details>

## Customizing and extending the platform

Datagrok is a highly flexible platform that can be tailored to meet your specific needs and requirements. With its comprehensive set of [functions](../../../../develop/function-roles.md) and
[scripting capabilities](../../../../compute/scripting/scripting.mdx), you can customize and enhance any aspect of the platform to suit your chemical data needs.

For instance, you can add new data formats, apply custom models, and perform other operations on molecules. You can also add or change UI elements, create custom connectors, menus, context actions, and more. You can even develop entire applications on top of the platform or customize any existing [open-source plugins](https://github.com/datagrok-ai/public/tree/master/packages).

[Learn more about extending and customizing Datagrok](../../../../develop/develop.md), including this
[cheminformatics-specific section](../../../../develop/domains/chem/cheminformatics.md).

## Resources

* [Cheminformatics tutorial](https://public.datagrok.ai/apps/tutorials/Tutorials/Cheminformatics/VirtualScreening)
* [Demo app](https://public.datagrok.ai/apps/Tutorials/Demo)
* Videos
  * [Cheminformatics](https://www.youtube.com/watch?v=k1NVdTRpYOM)
  * [Molecular similarity and diversity](https://www.youtube.com/watch?v=wCdzD64plEo)
<!--* [Package help reference]-->
