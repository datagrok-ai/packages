<!-- TITLE: GrokCompute -->
<!-- SUBTITLE: -->

# GrokCompute

GrokCompute is a server for scientific computations that is distributed as part of the 
[Compute VM](compute-vm.md).

## REST API

GrokCompute exposes API for the following features:

* Cheminformatics (RDKit-based)
    - Substructure search
    - Descriptors
    - Parse SDF
    - Find MCS
    - Get R-Groups
    - Smiles to 3d coordinates
    - Smiles to fingerprints
    - Smiles to InChI
    - Smiles to InChI key
    - InChI to InChI key
    - InChI to smiles
    - Smiles to Canonical
    - Draw molecule
    - Draw reaction
* Modeling (concept only)
    - Train
    - Apply


See also:

  * [Compute virtual machine architecture](architecture-details.md#compute-virtual-machine)
  * [Compute VM](compute-vm.md)
  * [Cheminformatics](../../domains/chem/cheminformatics.md)
