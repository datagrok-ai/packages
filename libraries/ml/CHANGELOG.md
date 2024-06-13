# ml changelog

## 6.6.11 (2024-06-11)

* Fix dialog styles
* Initialization of MCL viewer

## 6.6.10 (2024-05-27)

Activity cliffs: ability to use with layouts and progects

## 6.6.9 (2024-05-27)

Add inflation factor to MCL

## 6.6.8 (2024-05-16)

Fix inconsistent KNN size in webGPU.

## 6.6.7 (2024-05-09)

* Fix GPU description getting if value is nullish.

## 6.6.6 (2024-05-09)

Disable webGPU input in case if none is available.

## 6.6.5 (2024-04-25)

Add webGPU MCL implementation.

## 6.6.4 (2024-04-23)

Improvements to dimensionality reduction.

## 6.6.3 (2024-04-16)

Dimensionality reduction: Better dialog.

## 6.6.2 (2024-04-15)

Dimentionality reduction: create table view only in case plotEmbeddings parameter is true

## 6.6.1 (2024-04-15)

Fix webGPU numeric distance with 0 range

## 6.6.0 (2024-04-14)

### Features

* Add webGPU Sparse matrix calculation.
* Add webGPU UMAP implementation.
* Add webGPU option for activity cliffs + MCL

## 6.5.1 (2024-04-05)

Fix function editor for seq/chem space

## 6.5.0 (2024-04-05)

Add webGPU KNN calculation option to UMAP.

## 6.4.13 (2024-03-07)

Add Connectivity to MCL, Harmonized macromolecule distance functions.

## 6.4.12 (2024-03-06)

### Bug fixes

* Fix `values` type to ArrayLike for DistanceMatrixService.calc

## 6.4.11 (2024-02-27)

Add support for post-processing function in dimensionality reduction. The method `Dimensionality Reduction`
(see Top Menu > ML > Dimensionality Reduction) now allows to apply post-processing functions to the resulting
embeddings.

## 6.3.39 (2023-07-21)

This release focuses on improving usability.

*Dependency: datagarok-api >= 1.15.0*

### Features

Moved the `DistanceMatrix` class from [bio](https://github.com/datagrok-ai/public/tree/master/libraries/bio) to ml lib.
