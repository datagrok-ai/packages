# HitTriage changelog

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
