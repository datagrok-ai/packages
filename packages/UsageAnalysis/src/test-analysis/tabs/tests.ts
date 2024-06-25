import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import { TATab } from './tatab';
import { TestAnalysesManager } from '../testAnalysesManager';


import '../../../css/usage_analysis.css';
import { getDate, colors } from '../../utils';

import dayjs from "dayjs";
export const filters = ui.box();
filters.id = 'ua-tests-filters';
const counters = ['passed', 'failed', 'skipped', 'did not run'];


export class TestsView extends TATab {
    expanded: { [key: string]: boolean } = { f: true, l: true };

    constructor() {
        super();
        this.name = 'Tests Reports';
    }

    loader = ui.div([ui.loader()], 'grok-wait');
    cardFilter: string | null = null;
    platformFilter: boolean = false;
    filterGroup: DG.FilterGroup | undefined = undefined;
    grid?: DG.Grid;
    leftDate = ui.label(getDate(new Date()));
    rightDate = ui.label('');
    leftDf?: DG.DataFrame;
    rightDf?: DG.DataFrame;
    current = this.leftDate;
    cardsView: HTMLDivElement = ui.div([], { classes: 'ua-cards' });
    builds?: DG.DataFrame;
    tests?: DG.DataFrame;
    testsListMapped?: DG.DataFrame;

    async initViewers(path?: string): Promise<void> {

        const tests = await TestAnalysesManager.collectPackageTests();
        this.testsListMapped = DG.DataFrame.fromObjects(tests.map((elem) => {
            return { 'name': "test-package " + elem.packageName + ": " + elem.test.category + ": " + elem.test.name };
        }));

        this.builds = (await grok.functions.call('UsageAnalysis:Builds')); 
        let id: any =this.builds!.get('id', 0); 
        this.tests = await grok.functions.call('UsageAnalysis:getTestStatusesByBuildId', { 'buildId': id, 'testslist': this.testsListMapped });
                    
        // Table
        const grid = ui.wait(async () => {
            this.updateGrid(this.tests!);
            return this.grid!.root;
        });

        //selector
        const buildSelector = ui.wait(async () => {
            const popupMenu = ui.input.choice('build', {
                value: this.builds!.get('text', 0), items: this.builds!.getCol('text').categories,
                onValueChanged: async (input) => {
                    let id: any = undefined; 
                    for (let i = 0; i < this.builds!.rowCount; i++) {
                        if (this.builds!.get('text', i) === input) {
                            id = this.builds!.get('id', i); 
                            break;
                        }
                    }
                    this.tests = await grok.functions.call('UsageAnalysis:getTestStatusesByBuildId', { 'buildId': id, 'testslist': this.testsListMapped });
                    this.updateGrid(this.tests!);
                }
            });
            return popupMenu.root;
        });

        //Button

        const addToWorkspaceButton = ui.button('add to workspace', () => {
            if (this.grid !== undefined) {
                grok.shell.addTableView(this.grid.dataFrame);
            }
        });


        // Cards
        this.updateCards(getDate(new Date()));

        const leftSide = ui.divV([
            ui.box(this.cardsView, { style: { flexGrow: 0, flexBasis: '35%' } }),
        ]);

        this.root.append(ui.splitV([
            ui.splitH(
                [ui.divH([leftSide, ui.divV([buildSelector], { style: { height: '70px', marginLeft: '10px', marginTop: '10px' } })])],
                { style: { maxHeight: '150px' } }), ui.splitH([ui.div(addToWorkspaceButton, { style: { maxWidth: '200px' } })], { style: { maxHeight: '70px', maxWidth: '200px' } }), grid], null, false));
    }

    updateCards(date: any): void {
        this.cardsView.innerHTML = '';
        const cardsDfP: Promise<DG.DataFrame> = grok.functions.call('UsageAnalysis:TestsCount', { 'date': date });

        for (let i = 0; i < 3; i++) {
            const c = counters[i];
            const card = ui.div([ui.divText(c), ui.wait(async () => {
                const cardsDf = await cardsDfP;
                const valuePrev = cardsDf.get(c, 0);
                const valueNow = cardsDf.get(c, 1);
                const d = valueNow - valuePrev;
                return ui.div([ui.divText(`${valueNow}`),
                ui.divText(`${d}`, { classes: d > 0 ? 'ua-card-plus' : '', style: { color: getColor(c, d) } })]);
            })], 'ua-card ua-test-card');
            card.addEventListener('click', () => {
                this.cardFilter = this.cardFilter === c ? null : c;
                this.filterGroup?.updateOrAdd({
                    type: DG.FILTER_TYPE.CATEGORICAL,
                    column: 'status',
                    selected: this.cardFilter ? [c] : null,
                });
            });
            this.cardsView.append(card);
        }
    }

    updateGrid(df: DG.DataFrame): void {
        df.getCol('status').colors.setCategorical(colors);

        if (this.grid === undefined)
            this.grid = df.plot.grid();

        this.grid.dataFrame = df;
        this.grid.columns.setVisible(['test_time', 'type', 'package', 'category', 'test', 'ms', 'status', 'test_id']);
        this.grid.columns.setOrder(['test_time', 'type', 'package', 'category', 'test', 'ms', 'status', 'test_id']);
    }
}


function getColor(status: string, d: number): string {
    switch (status) {
        case 'passed':
            return d > 0 ? 'var(--green-2)' : d < 0 ? 'var(--red-3)' : '';
        case 'failed':
            return d < 0 ? 'var(--green-2)' : d > 0 ? 'var(--red-3)' : '';
        case 'skipped':
            return 'var(--orange-2)';
        default:
            return '';
    }
} 