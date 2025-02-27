/* Do not change these import lines to match external modules in webpack configuration */
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { getNMRiumComponent } from "../nmrium-wrapper/src/NMRiumWrapper";
import { NMRiumEvents } from "../nmrium-wrapper/src/NMRiumWrapper";
import { delay } from '@datagrok-libraries/utils/src/test';

export function getNMRiumView() {
    const root = ui.div([], {classes:'d4-nmrium-wrapper'});
    root.style.width = '100%';
    root.style.height = '100%';
    const v = DG.View.fromRoot(root);
    v.name = 'NMRium';
    const nmriumId = 'nmrium-' + Math.floor(Math.random() * 10000000);

    getNMRiumComponent(root, nmriumId);
    return {v, nmriumId};
}

export async function loadNMRiumData(fileName: string, fileString: string, nmriumId: string) {
    const blob = new Blob([fileString], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: "text/plain" });
    await delay(100);
    NMRiumEvents.trigger('load', {
        data: [file],
        type: 'file',
        wrapper: nmriumId
    });
}