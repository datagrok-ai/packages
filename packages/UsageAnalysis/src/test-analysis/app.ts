import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import { delay, Test, TestContext, initAutoTests, awaitCheck } from '@datagrok-libraries/utils/src/test';

import { TestsView } from './tabs/tests'; 
import { TATab } from './tabs/tatab'; 
 


interface IPackageTest {
    test: Test,
    packageName: string
}

export class TestAnalysisApp {
    public static TA_NAME = 'Test Analysis';
    private testsList: IPackageTest[] = [];
    public view: DG.MultiView;

    constructor() {
        this.view = new DG.MultiView({ viewFactories: {} });
    }

    async init(): Promise<void> {
        this.view.parentCall = grok.functions.getCurrentCall();
        const viewClasses: (typeof TATab)[] = [TestsView, ];
        for (let i = 0; i < viewClasses.length; i++) {
            const currentView = new viewClasses[i]();
            this.view.addView(currentView.name, () => {
                currentView.tryToinitViewers();
                return currentView;
            }, false);
        }

        this.view.tabs.onTabChanged.subscribe((_) => {
            const view = this.view.currentView; 

        });

        this.view.name = TestAnalysisApp.TA_NAME;
        this.view.box = true;
        let urlTab = 'Tests Reports';

        if (viewClasses.some((v) => v.name === `${urlTab}View`))
            this.changeTab(urlTab);
 
    }

    public changeTab(name: string) {
        this.view.tabs.currentPane = this.view.tabs.getPane(name);
    }
 
}