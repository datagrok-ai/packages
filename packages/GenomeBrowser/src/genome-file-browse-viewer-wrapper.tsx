import {
  createViewState,
  JBrowseLinearGenomeView,
} from "@jbrowse/react-linear-genome-view";

import React, { useEffect, useState } from "react";
import * as ReactDOM from "react-dom/client";
 

export function getGenomeFileBrowserComponent(host: HTMLElement, config: string) { 

  const data : any = JSON.parse(config);
  if(data.assemblies?.length > 0)
    data.assembly = data.assemblies[0];

  const state = createViewState(data);
  
  const root = ReactDOM.createRoot(host);

  root.render(<JBrowseLinearGenomeView viewState={state}/>);
}
