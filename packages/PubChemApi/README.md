# PubChemApi

PubChemApi is a [package](https://datagrok.ai/help/develop/#packages) for the [Datagrok](https://datagrok.ai)
platform that provides search capabilities in the [PubChem](https://pubchem.ncbi.nlm.nih.gov/) database.
Note that package queries external source, the structure you are searching with is sent to PubChem as a query parameter.

## Features

- [Identity Search](https://pubchem.ncbi.nlm.nih.gov/search/help_search.html#IdSimi) finds identical PubChem structures
for the specified structure
are identical to the provided chemical structure with different notions of chemical structure identity

- [Substructure Search](https://pubchem.ncbi.nlm.nih.gov/search/help_search.html#SbSp) finds PubChem structures for
the specified substructure

- [Similarity Search](https://pubchem.ncbi.nlm.nih.gov/search/help_search.html#IdSimi) finds similar PubChem
structures for the specified structure

![Package demo](./images/demo.gif)

See also:

- [Similarity Search](https://datagrok.ai/help/datagrok/solutions/domains/chem/#similarity-and-diversity-search)
- [Chem package](https://github.com/datagrok-ai/public/tree/master/packages/Chem)
