import * as DG from 'datagrok-api/dg';

export type ClinStudyConfig = {
    name: string;
    friendlyName?: string;
    path: string;
}

export type ClinCaseTableView = {
    view: DG.TableView | DG.View,
    helper: any,
}
