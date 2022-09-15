<!-- TITLE: Cheminformatics -->
<!-- SUBTITLE: -->

# Cheminformatics

Cheminformatics (see also the [Wikipedia](https://en.wikipedia.org/wiki/Cheminformatics) article) is the application of
computer and information science methods to a wide range of problems in chemistry. The associated _in silico_
techniques (see below) are used, for example, during the process of drug discovery in pharmaceutical companies and
academic environments, and can be employed in chemical and allied industries.

As contrasted to _in vitro_ biochemical experiments (conducted in labware without the living cells) and
_in vivo_ ones (conducted in cell cultures or organisms), _in silico_ biochemical experiments are defined as the ones
performed by means of computer simulations, because silicon is the main component of modern CPUs. Cheminformatics is a
complex _in silico_ discipline, serving multiple purposes, such as:

* development of methods for storage and operating chemical data
* determining the structure-property and structure-activity relationships by means of simulation
* virtual screening aimed at discovery of most potent drug candidates
* generation of possible chemical structures
* synthesis planning and prediction of synthetic routes
* facilitation of a researcher's work by means of visualization and reaction prediction
* molecular design
* etc.

Cheminformatics tends to consider _molecular structure_ as a principal chemical object, which can be studied in various
data representations. More complex objects, such as mixtures, materials and reactions, can also be investigated in this
setting, but have to be related to the associated molecular structures in each case.

<!--corr: now goes the description of Datagrok functionality -- is it apt here? The style requires refactoring,
for it resembles a dull prayer -->
<!--corr: to improve style, one should mention that Datagrok is a powerful cheminformatics tool, which
has the following instruments...-->
Datagrok supplies a researcher with a powerful cheminformatics arsenal, in particular:
<!--corr: LINKS!!!-->

* The platform supports widely accepted _types of notation_ for representing chemical (sub)structures, such as SMILES
  and SMARTS.
* It provides first-class support for _small molecules_, as well as most popular building blocks for
  simulations.<!--corr: a good idea to mention those blocks-->
* Molecules can be sketched and rendered as 2D or 3D models, equipped with auxiliary _visualization options_.

* _Chemical properties_, _descriptors_, and _fingerprints_ can be extracted on the fly.
* _Predictive models_, accepting molecular structures as their input, can be trained, assessed, executed, deployed,
  reused by other scientists, and incorporated in pipelines or [info panels](../../discover/info-panels.md). Predictive
  models for _toxicity_ and _drug-likeness_ are also supported.
* _Substructure and similarity search_ works out-of-the box for the imported data and can efficiently be utilized for
  querying databases with the help of Postgres chemical cartridge.
* In order to further explore collections of molecules, one can use advanced tools like _diversity search_
  and _similarity search_.

Though it might seem that cheminformatics covers all the "molecular" needs <!--corr: a very vague formulation-->, it has
its limitations. In particular, its applicability is limited to small molecules and some types of peptides. It shows
real power when combined with other _in silico_ approaches, including but not limited to: docking and molecular
dynamics, systems biology and pharmacology, bioinformatics, proteomics.<!--corr:
This paragraph leaves the feeling of being unfinished-->

## Data formats in cheminformatics

### Molecular graphs

Each cheminformatic problem is usually associated with a specific structure set, and thus all structures should be
represented in the forms convenient both for researchers and computations. In these two cases the structure is typically
modelled as a graph, with atoms being its vertices and bonds, its edges. Usually, researchers tend to use the graphical
representations, planar and 3D.

### Importing molecular data in Datagrok<!--corr: should it be here?-->

[Import the dataset](../../access/file-browser-and-file-shares.md), as you normally would, by opening a file, querying a database,
connecting to a webservice, or by any other method. The platform is smart enough to automatically recognize chemical
structures.
![representations1](../../uploads/chem/representations1.png "graphs")

One might expect planar representations to be the most convenient form for small molecules and use 3D representations
only when conformational properties of molecules are of importance, are which is an everyday situation in such areas
like molecular modelling. Macromolecular representations are also supposed to be 3D.

The generalizations of molecules with varied substitutes or chemical groups, also known as Markush structures, only
describe a scaffold and can have any substitutes in R positions.
![representations2](../../uploads/chem/representations2.png
"graphs")

These representations can be of great importance for description of monomers of a decomposed macromolecule, or for
description of chemical classes, which is widely used in high throughput screening or umbrella patents. The concept of _
scaffold_ is widely applied in medicinal chemistry. Scaffolds are mostly used to represent core structures of bioactive
compounds. Although the scaffold concept has its limitations and is often viewed differently from a chemical and
computational perspective, it has provided a basis for systematic investigations of molecular cores and building blocks,
going far beyond the consideration of individual compound series. (On scaffolds, also
see [here](functions/murcko-scaffolds.md)).

Datagrok is sharpened to process chemical structures. The platform is smart enough to automatically recognize them, so
Datagrok provides these representations as soon as it detects any molecule-associated type in every entity whether it is
a table, tooltip, any other element.
![representations3](../../uploads/chem/representations3.png
"graphs")

### Formats for storage of molecular data in cheminformatics

The most vivid representation of molecular structure is _molecular graph_, and Datagrok provides to its users the set of
tools for work with such graphs. <!--corr: Which ones? Examples, please-->  From the viewpoint of mathematics, graphs
are sets of vertices and edges, and can be encoded in different formats.

In order to store comprehensive structural information about a molecule, the MOL file format is widely used (
see [here](http://c4.cabrillo.edu/404/ctfile.pdf) and
[here](https://en.wikipedia.org/wiki/Chemical_table_file#Molfile)). It encodes the information about atoms (vertices),
bonds (edges), and the associated data, such as atom coordinates, charges, isotopes, etc. Multiple MOL files are stored
as an SDF file (see
[here](https://en.wikipedia.org/wiki/Chemical_table_file#SDF)), its feature is the possibility to include any other
additional information (e.g. experimental activity values). Being very convenient, MOL is widely used in the
overwhelming majority of cheminformatics software.

Very similar to MOL is
[PDB notation](https://pdb101.rcsb.org/learn/guide-to-understanding-pdb-data/dealing-with-coordinates), utilized for
macromolecules. The most compact popular format for encoding molecular data is
[SMILES string](https://www.daylight.com/dayhtml/doc/theory/theory.smiles.html). Datagrok uses SMILES to restore MOL
files for subsequent processing. For chemical reactions, the modified strings
of [SMIRKS notation](https://www.daylight.com/dayhtml/doc/theory/theory.smirks.html) are employed.

MOL and SMILES are, perhaps, the best existing formats for storing the structural data for a single molecule. However,
some applications rely upon the idea of _uncertain chemical structures_, like fragments that do not correspond to any
specific molecule. For such purposes, logical expressions become essential,
(e.g. _carbon or oxygen_ atom, _double or aromatic_ bond) and
[SMARTS notation](https://www.daylight.com/dayhtml/doc/theory/theory.smarts.html)
comes in handy with this option. One might say that SMARTS is the "regular expressions of cheminformatics", for this
notation is used to define substructural _patterns_ in molecules.

Datagrok makes use of SMARTS for search of structural alerts, substructure search and R-group analysis.
<!--corr: it is necessary to list here other exapmles of the aforementioned formats in use-->

### Descriptors and fingerprints

Although molecular graph is a useful representation for molecular structure, it is less appropriate for a range of
cheminformatics applications, in particular, machine learning (ML) tasks. For such tasks, molecules can be represented
as a set of _molecular descriptors_ or _molecular fingerprints_. The purpose of these representations is to meet the
linear algebra requirements of the majority of ML methods, namely, provide a vector describing the molecule.

Fingerprints are an abstract representation of molecular structure in the form of binary vectors. They are used in
similarity measures (calculations that quantify the similarity of two molecules), and screening
(a way of rapidly excluding molecules from the set of candidates in a substructure search). Descriptors and fingerprint
have the following properties:

* A variety of different descriptors and fingerprints could be derived from a single molecular graph.
* They are invariant to numberings in a molecule.
* In most cases, they can be interpretated in terms of chemical or physical properties.
* Reactions, mixtures of compounds, nanoparticles could also be represented as descriptors.

Descriptors and fingerprints are frequently used for processing similar chemical structures. These representations are
helpful in similarity search and diversity search. In combination with clustering and self-organizing maps, the methods
like stochastic proximity embedding allow one to reduce the dimensionality of the abstract vector representations, and
to separate the most significant features of the molecule. It helps us to visualize the chemical space in 2D maps in the
problems of molecular data mining, and compound activity prediction.

Datagrok supports generation of different sets of descriptors and fingerprints:

* Lipinski, Crippen, EState, EState VSA, Fragments, Graph, MolSurf, QED. See [molecular descriptors](descriptors.md)
  for more details and a demo about descriptors.

* RDKFingerprint, MACCSKeys, AtomPair, TopologicalTorsion, Morgan/Circular.
  See [molecular fingerprints](fingerprints.md) for more details and a demo about fingerprints.

## Descriptor-based tools

Descriptor representation of molecular structure enables us to consider molecules as points in an abstract
_chemical space_. This space is supposed to have more than 10<sup>60</sup> such points, corresponding to actual or
possible molecules, as estimated by Lipinski and Hopkins<!--corr: links?-->. Each molecular dataset defines a chemical
space which could be interpreted as a linear/vector space based on molecular descriptors, which allows to implement the
mechanisms of similarity estimation.<!--corr: revision of
this phrase required-->

### Chemical space maps

The visualization of multidimensional abstract chemical/feature space can be facilitated with the help of 2D projections
of descriptor vectors, or _planar maps_<!--corr: is it a correct term?-->. Such maps reduce the dimensionality of the
initial vector space, and place points/projections closer to each other if they correspond to similar structures, and
farther otherwise, so that the distance between two points on a projection is determined by the similarity of molecules.
This is possible due to the introduction of various metrics (such as
[Tanimoto distance](https://en.wikipedia.org/wiki/Jaccard_index#Tanimoto_similarity_and_distance))
over the feature space. Datagrok has a tool called "Chemical space", that helps researchers to analyze a collection of
molecules in terms of structural similarity. The possibility of choice of descriptors/fingerprints and distance metrics
leads to various planar representations of the explored dataset.
![dt1](../../uploads/chem/descriptorBasedTools1.png
"chemSpace")

### Similarity search

"Similarity search" is another analytical tool of Datagrok based on descriptors/fingerprints. It allows one to readily
find all molecules that have similar structure and, contrary to chemical space visualization, the similarities are used
here for direct investigation.

![dt2](../../uploads/chem/descriptorBasedTools2.png "similaritySearch")

Datagrok's "Similarity Search" finds structures similar to the specified one. Options for descriptors/fingerprints and
metrics selection are present to get the desired results.

See [Similarity Search](similarity-search.md) for a demo about this tool.

### Diversity search

Another application of computed similarity measures is to find the most diverse structures in the dataset.
"Diversity Search" tool finds 10 most distinct molecules. These structures can be used to estimate the variety of
chemical classes presented in the dataset. "Similarity search" and "Diversity search" tools can be combined together to
form a collection browser. 'Diverse structures' window shows different classes of compounds present in the dataset; when
you click on a molecule representing a class, similar molecules will be exposed in the 'Similar structures' window.

See [Diversity Search](diversity-search.md) for a demo about this tool.

### Structure-property predictions

Some descriptors have a strong relation to the physical and chemical properties of the molecule. This makes it possible
to derive such properties by means of direct calculations or by employing the quantitative structure-property
relationship (QSPR) models. Datagrok provides the following properties<!--corr: related
to QSPR?--> : formula, drug likeness, acceptor count, donor count, logP, logD, polar surface area, rotatable bond count,
stereo center count. One may develop a custom QSPR model basing upon the provided descriptors/fingerprints and all the
powers of Datagrok machine learning tools.

Learn more about [predictive modeling for cheminformatics](chem-predictive-modeling.md) and a demo of building and
applying a model.

## Molecular graph tools

<!-- Descriptors and fingerprints are handful for various computations, but their application is limited
by a number of specific tasks. Operating with native molecular graphs could benefit in additional insights
and greatly increases the pool of supported tools in Datagrok making it possible to quickly handle and
filter large amounts of chemical data.-->
<!--corr: a very vague formulation-->

### Subgraph tools

Datagrok automatically detects the supported types of chemical notation in order to unveil the structure in each element
possible<!--corr: what element? what structure?-->. It can also handle special chemical queries for subgraphs. This is
apt in filtering of chemical datasets, because a subgraph may not be related to existing structure (e.g. query can have
a single aromatic atom or bond)<!--corr: what?--> . Each time the filter is applied, such a query detects a subgraph in
the structures containing it, and Datagrok highlights queried substructures in the subset after performing the
filtering. Suchlike queries can be drawn in the sketcher or cast as SMARTS strings. Another application of subgraph
analysis is the most common substructure (MCS). MCS problem is of great importance in multiple aspects of
cheminformatics. It has diverse applications ranging from lead prediction to automated reaction mapping and visual
alignment of similar compounds. MCS feature is integrated into several Datagrok tools<!--corr: list!-->, with sketching
options.

### R-groups

<!--corr: this paragraph should be refactored-->
R-Group Analysis is a chemical methodology, which typically involves R-group decomposition, followed by the visual
analysis of the obtained R-groups. This analysis uses the graph of a selected scaffold in order to find all the entries
in the dataset sharing that scaffold, and get all the corresponding substitutes. Datagrok's "Trellis Plot" is a natural
fit for such an analysis.

![gt1](../../uploads/chem/graphTools2.png "rGroups")

See [R-group analysis](r-group-analysis.md) for more details and a demo.

### Structure generations

Combination of two subgraphs yields a new graph. Molecule-generating functions in Datagrok are capable of generating
structures based on selected scaffold, thus enriching the chemical space being studied.<!--corr:
examples-->

### Virtual reactions

Not all of the potential chemical structures, that can be obtained from graph models combinatorially, can be synthesized
in real-world reactions. To estimate the possibility and complexity of new structure synthesis, Datagrok makes use of _
virtual synthesis_. This feature consists in applying a specified chemical reaction to a pair of columns containing
molecules. The output table contains a row for each product yielded by the reaction for the given inputs. Each row
contains the product molecule, index information, and the reactant molecules that were involved. Virtual reaction is an
alternative to plain structure generation, because it produces structures that are more likely to exist in reality than
those ones generated combinatorially. In combination with structure generation, virtual reactions enrich the explored
chemical space.

'Do Matrix Expansion': If checked, each reactant 1 will be combined with each reactant 2, yielding the combinatorial
expansion of the reactants. If not checked, reactants 1 and 2 will be combined sequentially, with the longer list
determining the number of output rows.

Corresponding function: #{x.demo:demoscripts:TwoComponentReaction}

See details [here](functions/reactions.md).

## Virtual screening

Perhaps, the most prolific application of cheminformatics is the search of new structures that could be considered as
potential drugs. Here we describe Datagrok's support for virtual screening and special tools intended for this purpose.

### Dataset curation<!--corr: curation?-->

The methods described above<!--corr: examples, please--> assume that descriptors and graphs correspond to a real
molecule. However, data-associated errors may lead to biases in descriptors, wrong interpretation of modeling outputs,
and meaninglessness of the obtained results. The most sensitive cases are duplicated vectors in the training set, and
errors derived from the incorrect structure representation. In order to avoid that, curation of chemical data is usually
integrated into the analysis pipeline. To assure the quality of analysis and predictive models development, Datagrok
provides the tools for chemical dataset curation. Curation tools include, but are not limited to:

* kekulization
* normalization
* neutralization
* tautomerization
* selection of the main component

See [Chemical dataset curation](chem-curate.md) for more details, and a demo with curation examples.

References:

* [Chemical structures curation in cheminformatics](https://pubs.acs.org/doi/10.1021/ci100176x)

### Filtering driven by biological data

Drug design tasks are essentially related to a wide spectrum of biological issues. Biological aspects restrict the
chemical space that could be used for drug discovery purposes. Datagork provides the following tools to filter the
explored dataset:

* 'Toxicity' - predicts the following toxicity properties: mutagenicity, tumorigenicity, irritating effects,
  reproductive effects.

See details [here](info-panels/toxicity-risks.md)

* 'Drug likeness' - a score that shows how likely this molecule is to be a drug. The score comes with an interpretation
  of how different sub-structure fragments contribute to the score.

See details [here](info-panels/drug-likeness.md)

* 'Structural alerts' - drug specific structural alerts which in most cases could lead to severe toxicity.

See details [here](info-panels/structural-alerts.md)

### QSAR modeling

Pharmaceutical tasks demand the extensive use of cheminformatics methods aimed at exploration analysis of chemical
datasets. The datasets typically come with experimental values (e.g. measured biological activity of a compound). One of
the most common tasks is the evaluation of structure-activity relationships. These relationships play a crucial role in the
process of drug development, because they contribute to hit compound identification and lead compound optimization. (Q)
SAR<!--corr: what is it?--> studies are performed in order to find possible leads in the screening datasets. In contrast
to physical predictive models, machine learning predictive models do not have any intrinsic knowledge about the physical
and biological processes. Instead, they rely on techniques like random forest or deep learning to predict chemical,
biological and physical properties of novel compounds on the basis of empirical observations of small molecules.

Datagrok supports machine learning [predictive models](../../learn/data-science.md#predictive-modeling), which take
chemical
[properties, descriptors, and fingerprints](#descriptors-and-fingerprints)
as features, and the observable properties as the predicted outcomes. It lets researchers build models that can be
trained, assessed, executed, reused by other scientists, and included in pipelines.

Learn more about [predictive modeling for cheminformatics](chem-predictive-modeling.md) and a demo of building and
applying a model.

References:

* [Machine learning in chemoinformatics and drug discovery](https://www.sciencedirect.com/science/article/pii/S1359644617304695)

### What chemical space to screen?

The developed model<!--corr: which one??--> is able to get the possible hits from the screened dataset but one of the
most important tasks is to ensure that the screened set satisfies the screening needs. The described above tools can
highly enrich the screening dataset with the generation of structures and performing the virtual reactions.
Additionally, Datagrok provides access to freely available databases. DrugBank structures are available to search the
potent hit among existing drugs for drug repurposing aims. Data from ChEMBL and PubChem could also be accessed to
analyze structure from different biochemical and phenotypic assays as well as collections of synthesizable compounds.

## Sum of technologies

### Visualizations and convenience

#### Chemically-aware viewers

Many viewers, such as
[grid](chemically-aware-viewers.md#grid),
[scatter plot](chemically-aware-viewers.md#scatter-plot),
[network diagram](chemically-aware-viewers.md#network-diagram),
[tile viewer](chemically-aware-viewers.md#tile-viewer),
[bar chart](chemically-aware-viewers.md#bar-chart), form viewer, and
[trellis plot](chemically-aware-viewers.md#trellis-plot)
will recognize and render chemical structures.

#### Molecule sketcher

Sketch a molecule using the built-in editor, or retrieve one by entering a compound identifier. The following compound
identifiers are natively understood since they have a prefix that uniquely identifies source system:
SMILES, InChI, InChIKey, CHEMBL, MCULE, comptox, and zinc. The rest of the 30+ identifier systems can be referenced by
prefixing source name followed by colon to the identifier, i.e. 'pubchem:11122'.

![Sketcher](../../uploads/chem/sketcher.png "Sketcher")

#### Molecule identifier conversions

Grok lets users easily and efficiently convert molecule identifiers between different source systems, including
proprietary company identifiers.

Supported sources are:
chembl, pdb, drugbank, pubchem_dotf, gtopdb, ibm, kegg_ligand, zinc, nih_ncc, emolecules, atlas, chebi, fdasrs,
surechembl, pubchem_tpharma, pubchem, recon, molport, bindingdb, nikkaji, comptox, lipidmaps, carotenoiddb,
metabolights, brenda, pharmgkb, hmdb, nmrshiftdb2, lincs, chemicalbook, selleck, mcule, actor, drugcentral, rhea

To map the whole column containing identifiers, use #{x.ChemMapIdentifiers} function.

IUPAC name is located in the "Properties" panel.

In order to retrieve a single structure by an identifier, it might be handy to use
[Sketcher](sketcher.md)

### Technologies integrated

#### In-memory substructure search

To search for molecules within the table that contain specified substructure, click on the molecule column, and press
Ctrl+F. To add a substructure filter to [column filters](../../visualize/viewers/filters.md), click on the '☰' icon on
top of the filters, and select the molecular column under the 'Add column filter' submenu.

#### Most common substructure

The maximum common substructure (MCS) problem is of great importance in multiple aspects of cheminformatics. It has
diverse applications ranging from lead prediction to automated reaction mapping and visual alignment of similar
compounds.

To find MCS for the column with molecules, run `Chem | Find MCS` command from column's context menu. To execute it from
the console, use `chem:findMCS(tableName, columnName)` command.

#### Accessing cheminformatics tools for a single molecule

Chemical intelligence tools are natively integrated into the platform, so in most cases the appropriate functionality is
automatically presented based on the user actions and context. For instance, when user clicks on a molecule, it becomes
a current object, and its properties are shown in the
[property panel](../../datagrok/navigation.md#properties). Click on a molecule to select it as a current object. This
will bring up this molecule's properties to the property panel. The following panels are part of the 'chem' plugin:

* Identifiers - all known identifiers for the specified structure (UniChem)
* Molfile – get a specified molecule .mol file
* Structure 2D – gets a planar molecular representation
* Structure 3D – gets a 3 dimensional molecular representation
* Gasteiger Partial Charges – use it to get a representation with partial charges highlight
* Chem descriptors – get the specified descriptors for a structure
* Properties – get a list of calculated or predicted physical and chemical properties
* Toxicity – drug design related feature to predict the toxicity
* Structural alerts – drug design related feature to highlight fragments in structures that might greatly increase the
  toxicity and other problematic structural features
* Drug likeness – drug design related feature to get a score that shows how likely this molecule is to be a drug. The
  score comes with an interpretation of how different sub-structure fragments contribute to the score.

![Toxicity, Gasteiger Partial Charges, Solubility Prediction](../../uploads/gifs/chem-model-augment.gif
"Toxicity, Gasteiger Partial Charges, Solubility Prediction")

In addition to these predefined info panels, users can develop their own using any
[scripting language](../../compute/scripting.md)
supported by the Grok platform. For example,`#{x.demo:demoscripts:GasteigerPartialCharges}`.

#### Accessing cheminformatics tools for a molecule column

To see chemically-related actions applicable to the specified column, right-click on the column, and navigate to
`Current column | Chem` and `Current column | Extract`. Alternatively, click on the column of interest, and expand
the 'Actions' section in the property panel<!--todo: provide pictorial examples-->.

<!--Update the list of functions-->
* Descriptors – calculates specified descriptors for the whole dataset and adds them to the table
* Fingerprints – calculates specified fingerprints for the whole dataset and adds them to the table
* To InchI – extracts InchI identifiiers for the whole dataset and adds them to the table
* To inchI Key – extracts InchI keys for the whole dataset and adds them to the table
* Find MCS – adds the most common substructure to the dataset

It is a good idea to search for functionality using the smart search (Alt+Q)<!--example?-->, or by opening the registry of
available functions `Help | Functions`.

#### Accessing cheminformatics tools in the Top-Menu

To see chemically-related actions applicable to a table including molecules, right-click on `Chem` top-menu button.

* Sketcher – opens a sketcher intended for the filtering purposes, double-left-click on the structure to call the
sketcher for
  structure modification.
* Chemical space – computes and visualizes chemical space based on the distances between molecule fingerprints.
Options are provided for fingerprints and metrics.
* Similarity search – performs similarity search and adds a view with the most similar structures from the dataset with
  similarity values. Options are provided for fingerprints and metrics.
* Diversity search – performs diversity search and adds a view with 10 most unsimilar structures from the dataset.
  Options are provided for fingerprints and metrics.
* R-groups analysis – performs R-group analysis, adds the found groups to the table and shows the Trellis plot.
* Activity cliffs – performs the search of activity cliffs in the dataset versus data column with property or activity.
* Curate – performs dataset curation chemical structures.
* Mutate – performs structural generation.

### Cheminformatics engine

In addition to being a general-purpose extensible platform for scientific computing, Datagrok provides multiple options
for developing cheminformatics solutions on top of that. Depending on your needs, use one or more of the
following ones
or come up with your own solution.

#### Openchemlib.js

OpenChemLib.JS is a JavaScript port of the OpenChemLib Java library. Datagrok currently uses it for some of the
cheminformatics-related routines that we run in the browser, such as rendering of the molecules, and performing
in-memory substructure search. Here is an example of manipulating atoms in a molecule using openchemlib.js.

#### Rdkit in python

RDKit in Python are Python wrappers for RDKit, one of the best open-source toolkits for cheminformatics. While Python
scripts get executed on a server, they can be seamlessly embedded into Datagrok via scripting. Here are some RDKit in
Python-based cheminformatics-related scripts in the public repository<!--links-->.

#### Rdkit in WebAssembly

Recently, Greg Landrum, the author of RDKit, has introduced a way to compile its C++ code into WebAssembly, thus allowing
to combine the performance and efficiency of the carefully crafted C++ codebase with the ability to run it in the
browser. This approach fits perfectly with Datagrok's philosophy of performing as much computations on the client as
possible, so naturally we've jumped on that opportunity!

#### Database substructure and similarity search

Efficient substructure and similarity searching in a database containing information about molecules is a key
requirement for any chemical information management system. This is typically done by installing a so-called chemical
cartridge on top of a database server. The cartridge extends server's functionality with the molecule-specific
operations, which are made efficient by using chemically-aware indexes, which are often based on molecular fingerprints.
Typically, these operations are functions that can be used as part of the SQL query.

Datagrok provides mechanisms for the automated translation of queries into SQL statements for several commonly used
chemical cartridges. We support the following ones:

1) [RDKit Postgres cartridge](https://www.rdkit.org/docs/Cartridge.html)
2) [JChem cartridge](https://docs.chemaxon.com/display/docs/JChem+Cartridge)  (todo)

![DB Substructure and Similarity Search](../../uploads/gifs/db-substructure-similarity-search.gif "DB Substructure and Similarity Search")

See [DB Substructure and similarity search](db-substructure-similarity-search.md) for details.

#### Public datasets deployed on our servers

* [ChEMBL](https://ftp.ebi.ac.uk/pub/databases/chembl/ChEMBLdb/latest/) (Postgres)
* [UniChem](https://ftp.ebi.ac.uk/pub/databases/chembl/UniChem/) (Postgres)

## Functions

The following cheminformatics-related [functions](../../datagrok/functions/function.md) are exposed:

* \#{x.ChemSubstructureSearch}
* \#{x.ChemFindMCS}
* \#{x.ChemDescriptors}
* \#{x.ChemGetRGroups}
* \#{x.ChemFingerprints}
* \#{x.ChemSimilaritySPE}
* \#{x.ChemSmilesToInchi}
* \#{x.ChemSmilesToCanonical}
* \#{x.ChemMapIdentifiers}

Lot of chemical analysis is implemented using [scripting](../../compute/scripting.md) functionality:

* \#{x.ChemScripts:ButinaMoleculesClustering}
* \#{x.ChemScripts:FilterByCatalogs}
* \#{x.ChemScripts:GasteigerPartialCharges}
* \#{x.ChemScripts:MurckoScaffolds}
* \#{x.ChemScripts:SimilarityMapsUsingFingerprints}
* \#{x.ChemScripts:ChemicalSpaceUsingtSNE}
* \#{x.ChemScripts:TwoComponentReaction}
* \#{x.ChemScripts:ChemicalSpaceUsingUMAP}
* \#{x.ChemScripts:USRCAT}

# Performance

| Function                              | Molecules | Execution time, s |
|---------------------------------------|-----------|-------------------|
| ChemSubstructureSearch                | 1M        | 70                |
| ChemFindMcs                           | 100k      | 43                |
| ChemDescriptors (201 descriptor)      | 1k        | 81                |
| ChemDescriptors (Lipinski)            | 1M        | 164               |
| ChemGetRGroups                        | 1M        | 233               |
| ChemFingerprints (TopologicalTorsion) | 1M        | 782               |
| ChemFingerprints (MACCSKeys)          | 1M        | 770               |
| ChemFingerprints (Morgan/Circular)    | 1M        | 737               |
| ChemFingerprints (RDKFingerprint)     | 1M        | 2421              |
| ChemFingerprints (AtomPair)           | 1M        | 1574              |
| ChemSmilesToInChI                     | 1M        | 946               |
| ChemSmilesToInChIKey                  | 1M        | 389               |
| ChemSmilesToCanonical                 | 1M        | 331               |

# Videos

[![Cheminformatics](../../uploads/youtube/cheminformatics.png "Open on Youtube")](https://www.youtube.com/watch?v=k1NVdTRpYOM)

See also:

* [Descriptors](descriptors.md)
* [Diversity search](diversity-search.md)
* [Similarity search](similarity-search.md)
* [Fingerprints](fingerprints.md)
* [Similarity SPE](similarity-spe.md)
* [GrokCompute](../../develop/admin/infrastructure.md#grok-compute)
