# HitTriage changelog

## 1.1.16 (2024-07-29)

Fix re-running calculations on the first index.

## 1.1.15 (2024-07-29)

Fixed duplicate detection on fingerprints. added rerunning calculations

## 1.1.14 (2024-07-26)

Added detection of duplicate molecules in campaign and vid coloring of duplicates.

## 1.1.13 (2024-07-23)

Fix chem descriptors breaking loop.

## 1.1.12 (2024-07-18)

Fix broken demo campaign file.

## 1.1.11 (2024-06-03)

* Add ability for collaboration on same campaign.
* Fixed bugs with tiles viewer forms crashing in case of removing columns.

## 1.1.10 (2024-04-09)

Fixed bugs with tiles viewer forms and functions loading.

## 1.1.9 (2024-03-27)

Bug and style fixes.

## 1.1.8 (2024-02-22)

Add python script support.

## 1.1.6 (2024-01-26)

* Fixes to adding new functions to the campaign.
* Conversion to canonical smiles format before calling compute functions.

## 1.1.5 (2024-01-25)

* Ability to use queries with `HitTriageFunction` tag directly as compute functions.
* Fixes and improvements to performance.

## 1.1.4 (2024-01-17)

* Add ability to use queries directly as source functions.
* Fixed bugs with hit triage, including incorrect saving and addition of calculated properties.

## 1.1.3 (2023-12-27)

Fix incompatibility with old api version

## 1.1.2 (2023-12-26)

Hit Triage application improvements

## 1.1.1 (2023-11-20)

Hit Design application improvements

### Bug Fixes

Hit Design:

* New campaign loading incorrectly after closing old one.
* Correct Validation of template name, key and campaign fields.
* Last Campaign field / Stage not being added to template correctly.
* Campaigns not being saved correctly after calculations.
* Progress tracker still being created if no stages defined in the template.
* Fixed date format in campaign summary form.

### Features

Hit Design:

* Progress tracker view now is available through the button on the ribbon panel and not added automatically.
* Ability to add/remove calculated functions to saved campaigns (Using the `🔧` icon in the ribbon panel before
  the `Progress tracker` button).
* Ability to add new rows from the ribbon panel using `+` icon.
* Campaigns fields can now support molecule inputs.
* Template cloning allows to create a new template based on an existing one.
* Ability to change the location of saved dataframe (could be users own connection) throught the `Submit` button.
* Ability to delete campaigns from `Campaigns table`.
* Ability to add/duplicate molecules and edit them from the context menu of any molecule cell.
