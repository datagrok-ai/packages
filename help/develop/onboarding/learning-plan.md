---
title: "Learning plan"
sidebar_position: 1
---

Datagrok provides [programming exercises](exercises.md) to help developers get proficient with the platform. This page
offers a recommended learning plan for completing these exercises in one week.

## Day 1

After Day 1, you will learn how to:

* Import data into the platform
* Create, edit, and transform a grid
* Create and work with viewers
* Create, publish, and share dashboards

The goal for today is to gain hands-on experience with the platform and familiarize yourself with it from a user's
perspective.

1. Register on [public.datagrok.ai](https://public.datagrok.ai) and [dev.datagrok.ai](https://dev.datagrok.ai)
1. Now let's import data into the platform:
   1. [Local files](../../datagrok/navigation/views/browse.md#importing-text). Download a
      [dataset](https://raw.githubusercontent.com/datagrok-ai/public/master/packages/ApiTests/files/datasets/demog.csv)
      and import it into the platform using different approaches: drag-and-drop, double-click the "Data" icon on the
      sidebar, select "Data > Open local file", press `Ctrl+O`, and so on.
   1. [File shares](../../access/files/files.md). Add the dataset to your *Home* directory.
   1. [Databases](../../access/databases/databases.md#database-manager).
      1. Watch a [DB exploration video](https://www.youtube.com/watch?v=YJmSvh3_uCM).
      1. Follow the [Data connectors](https://dev.datagrok.ai/apps/tutorials/Tutorials/DataAccess/DataConnectors) tutorial to
         connect to a Postgres DB and run a query.
   1. [Webservices](../../access/open-api). Browse the [Webservices Manager](https://public.datagrok.ai/webservices)
      (Data > Webservices).
1. Grid:
   1. Read documentation:
      1. [Grid](../../visualize/viewers/grid)
      1. [Table view](../../datagrok/navigation/views/table-view.md)
   1. Watch a [Viewers and views video](https://www.youtube.com/watch?v=wAfEqAMOZzw&t=588s)
   1. Complete the [Grid](https://dev.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/GridCustomization)
      tutorial
1. Viewers:
   1. Learn how to work with visualizations on the platform by completing these tutorials:
      1. [Scatter plot](https://dev.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/ScatterPlot)
      1. [Viewers](https://dev.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/Viewers)
      1. [Filters](https://dev.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/Filters)
      1. [Embedded viewers](https://dev.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/EmbeddedViewers)
   1. Watch an [Interactive data visualization video](https://www.youtube.com/watch?v=67LzPsdNrEc)
   1. Read [documentation](../../visualize/viewers/viewers.md)
   1. Add different viewers using the previously imported dataset
1. Dashboards:
   1. Complete the [Dashboards](https://dev.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/Dashboards) tutorial
   1. Create a dashboard and share it with your mentor

## Day 2

After Day 2, you will:

* Learn about functions and scripting
* Write a script and test it

The goal for today is to gain experience with the platform by learning about its more advanced features.

1. Functions:
   1. Watch a [First-class functions video](https://www.youtube.com/watch?v=p7_qOU_IzLM&t=724s)
   1. Read documentation:
      1. [Functions](../../datagrok/concepts/functions/functions.md)
      1. [Parameter annotation](../../datagrok/concepts/functions/func-params-annotation.md)
      1. See the list of supported [constants](../../transform/functions/constants.md) and
         [operators](../../transform/functions/operators.md). Explore the groups of functions in the table of contents
         (statistical, math, text, conversion, etc.).
   1. Browse the [Functions](https://public.datagrok.ai/functions) view and filter functions by tags (`#stats`, `#math`,
      `#text`, `#conversion`, etc.). Run simple functions, e.g., `Abs`, `Add` or `And`, from the context panel and the
      console.
1. Scripting:
   1. Complete the [Scripting](https://dev.datagrok.ai/apps/tutorials/Tutorials/MachineLearning/Scripting) tutorial
   1. Read documentation:
      1. [Scripting](../../compute/scripting/scripting.mdx)
      1. [Advanced scripting](../../compute/scripting/advanced-scripting/advanced-scripting.mdx)
   1. Create a JavaScript script and share it with your mentor:
      1. Cylinder Volume Calculator takes parameters `radius` and `height` and returns `volume` rounded to 2 decimal
         places.
      1. Follow the [instructions](../how-to/add-package-tests.md#testing-functions) to add tests to the script (use
         function `RoundFloat` and constant `PI` in your tests)

## Day 3

After Day 3, you will:

* Set up development environment
* Create your first project

The goal for today is to set up the environment and learn how to create simple projects.

1. Check out these links:

   1. [Wiki](https://datagrok.ai/help)
   1. [JS API reference](https://datagrok.ai/js-api/)
   1. [API samples](https://public.datagrok.ai/js)

   Developers use these resources on a regular basis, so consider adding them to your bookmarks.
1. Read our [Contributor's guide](https://github.com/datagrok-ai/public/blob/master/CONTRIB.md) and [Git policy](../dev-process/git-policy.mdx)
1. Clone our [public repository](https://github.com/datagrok-ai/public):

   ```sh
   git clone https://github.com/datagrok-ai/public.git
   ```

1. Create a branch for exercises:

   ```sh
   git branch <first letter of your name><your surname>/exercises
   ```

   Example: `jdoe/exercises`
1. Follow instructions from [Setting up development environment](../dev-process/set-up-environment.md)
1. Create your first project following instructions given in [Exercises](exercises.md#setting-up-the-environment)
1. Add package unit tests:
   1. Read about [package tests](../how-to/test-packages.md)
   1. Follow the [instructions](../how-to/add-package-tests.md#adding-unit-tests) to add sample tests
   1. Publish your package to the platform and run tests using different approaches described in the above instructions

At the end of the day share the package you created with your mentor and push your branch to GitHub.

## Day 4

After Day 4, you will learn:

* How to transform dataframes (aggregate, join, link, add calculated columns)
* How to add functions to your package and test them
* How to detect semantic types and show widgets in info panels

1. Tabular transformations:
   1. Watch videos:
      1. [Aggregation](https://www.youtube.com/watch?v=1EI1w2HECrM)
      1. [Using formulas in calculated columns](https://www.youtube.com/watch?v=-yTTaS_WOU4)
      1. [Joining tables](https://www.youtube.com/watch?v=dlbK2Zo-eng)
   1. Read documentation:
      1. [Aggregate rows](../../transform/aggregate-rows.md)
      1. [Join tables](../../transform/join-tables.md)
      1. [Link tables](../../transform/link-tables.md)
   1. Complete the [Data Aggregation](https://dev.datagrok.ai/apps/tutorials/Tutorials/Datatransformation/DataAggregation)
      tutorial
1. Create a function that aggregates demographics data in your package:
   1. A function called `diseaseAvgAge` takes parameters `df` and `site`, aggregates data, and returns a dataframe with
      average age for each disease. Average age should be represented separately for female and male patients.
   1. Test your function on the [demographics dataset](https://datagrok.ai/js-api/classes/dg.DemoDatasets#demog)
   1. Refer to the [data aggregation](https://public.datagrok.ai/js/samples/data-frame/aggregation/aggregate) example
1. Calculated columns:
   1. Complete the [Calculated Columns](https://dev.datagrok.ai/apps/tutorials/Tutorials/Datatransformation/CalculatedColumns)
      tutorial
   1. Create a function that adds a calculated column to the demographics dataset:
      1. A function called `addBmiColumn` takes parameters `df`, column names `weight`, and `height`, adds a column with
         BMI to the original dataframe.
      1. Test your function on the [demographics dataset](https://datagrok.ai/js-api/classes/dg.DemoDatasets#demog)
      1. Refer to the
         [example](https://public.datagrok.ai/js/samples/data-frame/modification/calculated-columns/add-calculated-column)
         for calculated columns
1. Complete [Exercise #1](exercises.md#exercise-1-semantic-types). Add a detector test.

At the end of the day push your changes to GitHub and deploy your package to the platform.

## Day 5

After Day 5, you will learn how to:

* Create scripts and run them on client/server side
* Modify dataframes with scripts
* Access DB, create and run queries
* Create scripting viewers
* Manipulate dataframes (union, join, access columns etc.)

1. Scripting:
   1. Complete [Exercise #2](exercises.md#exercise-2-scripting-and-functions)
   1. Complete [Exercise #3](exercises.md#exercise-3-composing-functions)
1. Scripting viewers:
   1. Watch a [Scripting viewers video](https://www.youtube.com/watch?v=jHRpOnhBAz4)
   1. Read [documentation](../../develop/how-to/develop-custom-viewer.md#scripting-viewers)
   1. Complete [Exercise #6](exercises.md#exercise-6-creating-a-scripting-viewer)
1. Data access:
   1. Complete [Exercise #4](exercises.md#exercise-4-querying-databases)
   1. Read [documentation](../../develop/how-to/access-data)
1. Complete [Exercise #7](exercises.md#exercise-7-transforming-dataframes)

At the end of the day push your changes to GitHub and deploy your package to the platform.

## Day 6

After Day 6, you will learn how to:

* Create a custom cell renderer
* Connect to a webservice and display received data in an info panel
* Create a function that builds a dialog

1. Cell renderers:
   1. Read [documentation](../how-to/custom-cell-renderers.md)
   1. Complete [Exercise #8](exercises.md#exercise-8-custom-cell-renderers)
1. Connecting to a webservice:
   1. Read [documentation](../how-to/access-data)
   1. Complete [Exercise #9](exercises.md#exercise-9-creating-an-info-panel-with-a-rest-web-service)
1. Building a user interface:
   1. Complete [Exercise #10](exercises.md#exercise-10-enhancing-datagrok-with-dialog-based-functions)
   1. Refer to [UI components](../advanced/ui.md) article

At the end of the day push your changes to GitHub and deploy your package to the platform.

## Day 7

After Day 7, you will learn how to:

* Create simple applications
* Create and manage views

1. Create a simple application from the template:
   1. Read about [function roles](../function-roles.md)
   1. See [instructions](../how-to/build-an-app.md) for building applications
   1. Add a template application via `grok add`
   1. Publish your package and launch your app on the platform
1. Modify the application:
   1. It should open a summary view based on the demographics dataset (show age and sex distributions, add filters)
   1. It should allow browsing adverse events in a separate view (add timelines)
1. Check out a real-life example:
   1. Watch [Clinical Case: Interactive clinical data exploration](https://www.youtube.com/watch?v=lTg_E5xO-iw)
   1. Examine the [Clinical Case](https://github.com/datagrok-ai/public/tree/master/packages/ClinicalCase) plugin in the
      public repository

At the end of the day push your changes to GitHub and deploy your package to the platform.
