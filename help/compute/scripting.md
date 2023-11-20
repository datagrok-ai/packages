---
title: "Scripting"
---

Scripting is an extremely powerful concept that allows you to 
improve your data analysis experience with Datagrok drastically.
Scripting integrates the full suite of Datagrok's functionalities
with thousands of statistical packages and
visualizations available in
[R](https://www.r-project.org/about.html), [Python](https://www.python.org),
[Octave](https://octave.org/), [Julia](https://julialang.org), or
[JavaScript](https://www.javascript.com).

## How does the Datagrok scripting work?

Briefly, you only need to do the following:

* Create a new script file in the
  [Datagrok script editor](scripting-for-non-developers.mdx#working-with-datagrok-script-editor)
* Write the code in any [supported language](scripting-for-non-developers.mdx#supported-languages).
* Add **header**: the set of annotation comments specifying the script language, tags,
  input and output variables.

That's all. These simple actions turn your script into a **Datagrok function**.
Without any additional effort, you have received a wide range of possibilities:

* When you execute the script "as is", Datagrok automatically creates UI for the input parameters and automatically captures output data.
  The [RichFunctionView](scripting-advanced.mdx#using-richfunctionview-input-control)
  editor allows you to create complex UI with parameter tabs and groups just by adding annotation comments.
* Seamlessly transfer data between Datagrok and your script.
  You can take a Datagrok dataframe, process it by your script,
  and visualize it with any of the Datagrok viewers.
* Use your script as input for other scripts. For example, you can retrieve data from an SQL database 
  and make calculations in Python. Datagrok will care about all data transfer for you.
* Access computational history. Datagrok saves all runs in history, so you can easily recall every script run.
* Share your scripts with your colleagues,
  specify access groups, and share the link to the specific script run.
  See the [sharing](../collaborate/sharing) section for details.
* Integrate your script in the Datagrok platform.
  For example, you can create a script plotting some graph for a molecule.
  Using [semantic types](../catalog/semantic-types),
  Datagrok recognizes the meaning of the data and automatically applies the script
  when you browse macromolecule details.

## Where to find how it works

* To learn the basics of Datagrok scripting, review the [Scripting for non-professional developers](scripting-for-non-developers.mdx).
* For advanced features (input/output data validation, environments), review the 
[Advanced scripting](scripting-advanced.mdx).
* Review the [developer documentation](../develop/develop.md) for a deep dive into Datagrok scripting, using JS API, and developing custom UI components.

### Videos

[Dev Meeting 1: Getting Started — Cross-Language Support](https://www.youtube.com/watch?v=p7_qOU_IzLM&t=954s)

### See also

* [Grok scripting](../develop/under-the-hood/grok-script.md)
* [Python](https://www.python.org)
* [R](https://www.r-project.org/about.html)
* [Octave](https://octave.org/)
* [Julia](https://julialang.org)
* [JavaScript](https://www.javascript.com)
* [Packages](../develop/develop.md#packages)
* [JavaScript API](../develop/packages/js-api.md)
* [Functions](../datagrok/concepts/functions/functions.md)
* [Function call](../datagrok/concepts/functions/function-call.md)