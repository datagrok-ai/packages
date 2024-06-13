import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import { delay, expect, testEvent, testEventAsync } from "./test";
import { Observable } from 'rxjs';

export async function createViewer(tv: DG.TableView, v: string, packageName?: string): Promise<DG.Viewer> {
    let res: DG.Viewer;
    if (packageName) {
        res = await tv.dataFrame.plot.fromType(v) as DG.Viewer;
        tv.dockManager.dock(res);
    } else
        res = tv.addViewer(v);
    return res;
};

export async function testViewerInternal(tv: DG.TableView, viewerName: string, packageName: string,
    event: Observable<any>, actions?: (args: any, withDelay: boolean) => Promise<any>,
    awaitViewer?: (viewer: DG.Viewer) => Promise<void>, layout?: DG.ViewLayout,
    actionArgs?: any, actionsWithDelay = true): Promise<any> {
    let actionsRes: any = null;
    await testEventAsync(event, async (e: any) => {
        let viewer: DG.Viewer | null = null;
        for (const v1 of tv!.viewers) {
            if (v1.type === viewerName)
                viewer = v1;
        }
        if (!viewer)
            throw Error('Viewer hasn\'t been added');
        await Promise.resolve(); //re schedules subsequent commands into microtask
        if (awaitViewer) await awaitViewer(viewer);
        if (actions) {
            const args = actionArgs ?? {};
            args.tv = tv;
            args.viewer = viewer;
            actionsRes = await actions(args, actionsWithDelay);
        }
         //check that there are no active subscriptions in the viewer after close
         await testEvent(grok.events.onViewerClosed, () => {
             expect(viewer!.subs.some((s) => !s.closed), false);
         }, () => viewer!.close(), 3000);
    }, async () => {
        layout ? tv.loadLayout(layout) : await createViewer(tv!, viewerName, packageName);
    }, 60000, 'TEST_EVENT_ASYNC');
    if (actionsRes)
        return actionsRes;
}


export async function selectFilterChangeCurrent(args: any, withDelay = true): Promise<void> {
    const currentDf = args.tv.dataFrame;
    const dfSaved = currentDf.clone();
    //remove values in the first row
    Array.from(currentDf.row(0).cells).forEach((c: any) => c.value = null);
    //selection
    const num = currentDf.rowCount < 20 ? Math.floor(currentDf.rowCount / 2) : 10;
    currentDf.rows.select((row: DG.Row) => row.idx >= 0 && row.idx < num);
    if (withDelay)
        await delay(50);
    //filter
    for (let i = num; i < num * 2; i++) currentDf.filter.set(i, false);
    if (withDelay)
        await delay(50);
    //change current row
    currentDf.currentRowIdx = 1;
    //remove columns
    currentDf.columns.names().slice(0, Math.ceil(currentDf.columns.length / 2))
        .forEach((c: any) => currentDf.columns.remove(c));
    if (withDelay)
        await delay(100);
    //set back initial df with whole set of columns and preserved data
    args.tv!.dataFrame = dfSaved;
    await delay(50);
}


export async function filterAsync(args: any, withDelay = true): Promise<void> {
    const currentDf: DG.DataFrame = args.tv.dataFrame;
    setTimeout(() => currentDf.filter.set(0, !currentDf.filter.get(0)), 0);
}


export async function changeOptionsSaveLayout(args: any, withDelay = true): Promise<{ layout: DG.ViewLayout, savedProps: any }> {
    //get current options and properties
    let optns: { [p: string]: any };
    try {
        optns = args.viewer!.getOptions(true).look;
    } catch (err: any) {
        throw new Error(`Viewer's .getOptions() error.`, { cause: err });
    }
    let props: DG.Property[];
    try {
        props = args.viewer!.getProperties();
    } catch (err: any) {
        throw new Error(`Viewer's .getProperties() error.`, { cause: err });
    }
    //change options and properties
    const newProps: Record<string, string | boolean> = {};
    Object.keys(optns).filter((k) => typeof optns[k] === 'boolean').forEach((k) => newProps[k] = !optns[k]);
    props.filter((p: DG.Property) => p.choices !== null)
        .forEach((p: DG.Property) => newProps[p.name] = p.choices.find((c: any) => c !== optns[p.name])!);
    //set new options
    args.viewer!.setOptions(newProps);
    await delay(300);
    const layout = args.tv!.saveLayout();
    const savedLook = args.viewer!.getOptions().look;
    return { layout: layout, savedProps: savedLook };
}

export async function loadLayout(args: any, withDelay = true): Promise<void> {
    expect(JSON.stringify(args.viewer!.getOptions().look), JSON.stringify(args.savedProps));
}