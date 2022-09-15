<!-- TITLE: Dashboard -->
<!-- SUBTITLE: -->

# Dashboard

Use dashboard to visually present data in a pre-specified way. In contrast to
[table views](../datagrok/table-view.md) that excel at
[exploratory data analysis](../explore/exploratory-data-analysis.md),
[data wrangling](../transform/data-wrangling.md) and other table-specific tasks, dashboards trade the ability to quickly
interrogate data in unpredicted ways for delivering the visuals exactly as designed. In particular, here are some
features that are unique to dashboards:

* Visualize data from more than one table at once
* Use pixel-perfect layouts
* Use gadgets

## Viewers

Use 'Viewers' pane to add viewers to the dashboard. Choose the table using the combo box above the icons.

## Custom elements

Expand 'Elements' pane to add gadgets such as a picture, panel, button, etc.

## Custom code

Certain gadgets lets you define code that is executed as a reaction to an event, which is typically triggered by a user.
For instance, if you set Button's 'OnClick' property to `Info("foo")` script, a "foo" message will be shown when user
clicks on that button.

## Form designer

* Click on an object to select it; its properties appear in [property panel](../datagrok/navigation.md#properties)
* Click-and-drag to select multiple objects at once

See also:

* [Table view](../datagrok/table-view.md)
