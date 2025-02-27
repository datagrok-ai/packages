# ml changelog

## 6.8.1 (2025-02-03)

MCL: Add History support

## 6.8.0 (2025-01-06)

Refork MCL Viewer

## 6.7.4 (2024-10-08)

MCL: Better layout for similar size clusters

## 6.7.3 (2024-10-01)

GROK-16730: Demo: Activity cliffs: Fixed 'Cannot read properties of null'

## 6.7.2 (2024-09-19)

Activity cliffs: Resolve issue where multiple empty panels appear when clicking on cliffs link in demo

## 6.7.1 (2024-09-18)

Fix ts compatibility

## 6.6.25-rc (2024-09-06)

Preparing 1.21.1 release

## 6.6.24 (2024-09-02)

Fix typos, publish

## 6.6.23 (2024-08-28)

Add History support and enable gpu by default if available

## 6.6.22 (2024-08-23)

Add tableView for reduce dimensionality ui options

## 6.6.21 (2024-08-14)

Fix Worker import

## 6.6.20 (2024-08-14)

MCL Optimization: Remove use of extra column major map sparse matrix.

## 6.6.19 (2024-08-09)

Activity cliffs: make docked grid available in browse view for demo purposes

## 6.6.18 (2024-08-09)

Activity cliffs: ability to run as demo in Browse view

## 6.6.17 (2024-08-08)

Add limit to intercluster connections in mcl

## 6.6.16 (2024-08-07)

Correct NW Calculation on webGPU on CPU

## 6.6.15 (2024-08-06)

MCL layout with force directed graph and atlas

## 6.6.14 (2024-07-09)

Use only numeric columns without datetime for Activities in activity cliffs editor

## 6.6.13 (2024-07-09)

Reverse order of MCL Clusters

## 6.6.12 (2024-06-24)

Fix activity cliffs styles

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
