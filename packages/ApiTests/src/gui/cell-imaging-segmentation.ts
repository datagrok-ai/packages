import {category, delay, expect, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
import {checkHTMLElementbyInnerText, getHTMLElementbyInnerText} from './gui-utils';

category('File Panels: Cell Imaging Segmentation', () => {

  test('panel.cellImagingSegmentation', async () => {
    let pictures = await grok.dapi.files.list('Demo:Files/images', true, "jpeg");

    let picCell1;
    for(let i = 0; i < pictures.length; i++){
        if (pictures[i].name == "cells1.jpeg"){
          picCell1 = pictures[i];
            break;
        }
    }

    grok.shell.o = picCell1; await delay(500);

    checkHTMLElementbyInnerText('d4-accordion-pane-header', 'Cell Imaging Segmentation');

    let cellsPanel = getHTMLElementbyInnerText('d4-accordion-pane-header', 'Cell Imaging Segmentation')
    cellsPanel!.click(); await delay(3000);

    if (document.getElementsByClassName('d4-accordion-pane-content ui-div d4-pane-cell_imaging_segmentation expanded')[0].getElementsByClassName('d4-error').length != 0)
        throw 'Error in Cell Imaging Segmentation Panel'  

    if (document.getElementsByClassName('d4-accordion-pane-content ui-div d4-pane-cell_imaging_segmentation expanded')[0].getElementsByClassName('grok-scripting-image-container-info-panel').length != 1)
        throw 'Cell Imaging Segmentation content was not rendered in the panel'  

        cellsPanel!.click(); await delay(500);
  });
});
