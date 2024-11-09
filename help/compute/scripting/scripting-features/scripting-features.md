---
title: "Scripting features"
sidebar_position: 1
format: 'mdx'
---

```mdx-code-block
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import BrowserWindow from '@site/src/components/browser-window';
```

You may customize the script view using additional GUI-related options.
Most of them are hints to improve the interface for your scripts.
You should list options in curly braces in corresponding header lines.
The order of the hints makes no difference. All options are optional.

## Enhance the input UI

- [Add captions and hints](add-captions.mdx)
- [Add units](specify-units.mdx)
- [Autocomplete values](autocomplete-values.mdx)
- [Group inputs](group-inputs.mdx)
- [Precalculate the inputs](precalculate-inputs.mdx)
- [Validate the inputs](validate-inputs.mdx)
- [Process a dataframe](process-dataframe.mdx)
- [Specify a dataframe column](use-column-inputs.mdx)
- [Provide semantic type](detect-semantic-type.mdx)
- [Process a file](use-input-file.mdx)

## Visualize output data

- [Add viewers for dataframe](add-viewers.mdx)
- [Customize viewers for dataframe](customize-viewers.mdx)
- [Return graphics as output](generate-graphics.mdx)
- [Download output file](generate-file.mdx)


## Advanced capabilities of the Datagrok script editor

- [Create a script](create-script.mdx)
- [Find & run a script](find-script.mdx)
- [Debug a script](debug-script.mdx)
- [Share a script](sharing-script.mdx)
- [Save script in Git](convert-script-to-package-function.mdx) 


## Manage conda environments
- [Provide an environment in-place](store-env-in-code.mdx)
- [Specify an environment](specify-env.mdx)
- [Save an environment in Git](share-envs.mdx)


## Integrate your scripts

- [Call via REST](call-via-rest.md)
- [Embed as iframe](embed-as-iframe.mdx)
