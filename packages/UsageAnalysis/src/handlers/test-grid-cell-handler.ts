import { category } from "@datagrok-libraries/utils/src/test";
import { delay, DockManager, GridCell } from "datagrok-api/dg";
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import { testSchema } from "../test-analysis/sticky-meta-initialization";

export class TestGridCellHandler extends DG.ObjectHandler {
    get type(): string {
        return 'autotest';
    }

    isApplicable(x: any): boolean {
        return x instanceof DG.SemanticValue && x.semType === 'autotest';
    }

    renderProperties(semValue: DG.SemanticValue, context: any = null): HTMLElement {
        let panel = ui.accordion('testData');
        const testData = semValue.cell.value.split(':');

        const buttonsData = ui.button('Run', async () => {
            let df = semValue.cell.dataFrame;
            let progressBar = DG.TaskBarProgressIndicator.create(`Running test ${testData.join(':')}`);
            let category = testData[1];
            for (let pathPart of testData)
                if (testData[0] != pathPart && testData[1] != pathPart && testData[testData.length - 1] != pathPart)
                    category = [category, pathPart.trim()].join(':');
            let testResult: DG.DataFrame = await grok.functions.call(`${testData[0].trim()}:test`, { test: testData[testData.length - 1].trim(), category: category.trim() })
            progressBar.close();
            let wasError = false;
            let wasSkipped = false;
            for (let a of testResult.rows) {
                if (a.get('skipped'))
                    wasSkipped = true;
                else if (!a.get('success'))
                    wasError = true;
            }
            grok.shell.closeAll();
            let tv = grok.shell.addTableView(df);
            if (wasSkipped)
                grok.shell.warning(`${testData.join(':')} was skipped`);
            else if (!wasError)
                grok.shell.info(`${testData.join(':')} successfully run`);
            else
                grok.shell.error(`${testData.join(':')} failed`);

            await delay(500); 
            grok.shell.o = (semValue); 
        });
        buttonsData.classList.add('ui-btn-raised');
        buttonsData.classList.add('ui-btn-test-run');

        const resolveButton = ui.button('Mark as resolved', async () => {
          let keys = DG.Column.fromStrings('', [semValue.cell.value]);
          let values = DG.Column.fromType(DG.TYPE.DATE_TIME, 'lastResolved', 1);
          keys.semType = semValue.semType;
          values.set(0, Date.now());
          await grok.dapi.stickyMeta.setAllValues(testSchema, keys, DG.DataFrame.fromColumns([values]));
        }, 'Should be used after test is fixed so analyzers can ignore previous failures. Expects that tests passes.');

        const triageTextInput = ui.input.textArea('Description');
        ui.tooltip.bind(triageTextInput.root, 'Consider adding JIRA tickets to the description');
        const triageButton = ui.button('Mark as triaged', async () => {
          let keys = DG.Column.fromStrings('', [semValue.cell.value]);
          keys.semType = semValue.semType;
          let valueBool = DG.Column.fromType(DG.TYPE.BOOL, 'ignore?', 1);
          let valueString = DG.Column.fromType(DG.TYPE.STRING, 'ignoreReason', 1);
          valueString.set(0, triageTextInput.value);
          valueBool.set(0, true);
          await grok.dapi.stickyMeta.setAllValues(testSchema, keys, DG.DataFrame.fromColumns([valueBool, valueString]));
        });
        const triageForm = ui.form([
          triageTextInput
        ]);
        ui.forms.addButtons(triageForm, [triageButton]);
        resolveButton.classList.add('ui-btn-raised');
        triageButton.classList.add('ui-btn-raised');
        const packageDiv = ui.divH([ui.p('package:'), ui.h3(testData[0])]);
        packageDiv.classList.add('ui-test-data');
        panel.addTitle(ui.divV([ui.h1(`${testData[1]}: ${testData[2]}`), packageDiv]));
        panel.addPane('Run Test', () => ui.divV([buttonsData]), true);
        panel.addPane('Methods to resolve', () => ui.divV([resolveButton, ui.span(['Or do a long term planning']), triageForm]), true);
        return panel.root;
    }
}