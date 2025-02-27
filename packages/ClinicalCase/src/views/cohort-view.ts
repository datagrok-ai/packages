import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {updateDivInnerHTML} from '../utils/utils';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {filetrValueFromDf} from '../data-preparation/utils';
import {InclusionCriterion} from '../model/InclusionCriteria';
import {DOMAIN, SUBJECT_ID} from '../constants/columns-constants';
import {studies} from '../clinical-study';


export class CohortView extends ClinicalCaseViewBase {
  columnsMeta = {
    'Active': {
      type: DG.TYPE.BOOL,
      cohort: true,
    },
    'Name': {
      type: DG.TYPE.STRING,
      cohort: true,
      inclCrit: true,
    },
    'Description': {
      type: DG.TYPE.STRING,
      cohort: true,
      inclCrit: true,
    },
    'Cohort': {
      type: DG.TYPE.STRING,
      disabled: true,
      inclCrit: true,
    },
    'Domain': {
      type: DG.TYPE.STRING,
      categories: [],
      inclCrit: true,
    },
    'Event': {
      type: DG.TYPE.STRING,
      inclCrit: true,
    },
    'Operator': {
      type: DG.TYPE.STRING,
      categories: ['in', 'not in', 'less than', 'less or equal',
        'more than', 'more or equal', 'between', 'not between'],
      inclCrit: true,
    },
    'Value': {
      type: DG.TYPE.STRING,
      inclCrit: true,
    },
    'Min': {
      type: DG.TYPE.INT,
      inclCrit: true,
    },
    'Max': {
      type: DG.TYPE.INT,
      inclCrit: true,
    },
    'Delete': {
      type: DG.TYPE.STRING,
      cohort: true,
      inclCrit: true,
      html: true,
    },
    'Changed': {
      type: DG.TYPE.BOOL,
      cohort: true,
      disabled: true,
      // hide: true
    },
    'At least': {
      type: DG.TYPE.INT,
      cohort: true,
      categories: ['1', '2'],
      // hide: true
    },
  };
  domains: string[];
  operators = ['in', 'not in', 'less than', 'less or equal', 'more than', 'more or equal', 'between', 'not between'];
  cohortsGrid: DG.Grid;
  inclusionCriteriaGrid: DG.Grid;
  addCohortButton: HTMLButtonElement;
  addInclCriteriaButton: HTMLButtonElement;
  savedCohorts: DG.DataFrame;
  savedInclCriteria: DG.DataFrame;
  currentCohortName: string;
  currentInclCriteria: InclusionCriterion;
  currentInclCriteriaIdx: number;
  applyChangesButton: HTMLButtonElement;
  applyChangesDiv = ui.div();
  cohortsChanged = false;

  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
  }

  loaded = false;

  createView(): void {
    this.domains = studies[this.studyId].domains.all().map((it) => it.name);
    this.columnsMeta['Domain'].categories = this.domains;
    this.savedCohorts = this.createSavedDataDf('cohort');
    this.cohortsGrid = this.createGrid(this.savedCohorts);
    this.savedInclCriteria = this.createSavedDataDf('inclCrit');
    this.inclusionCriteriaGrid = this.createGrid(this.savedInclCriteria, true);

    this.applyChangesButton = ui.bigButton('Apply', () => {
      const cohortsWithoutReqCritNumber = this.checkAtLeastCriteriaNumbers();
      if (cohortsWithoutReqCritNumber.length)
        grok.shell.error(`Please select 'At least' parameter for cohorts: ${cohortsWithoutReqCritNumber.join(',')} `);
      else {
        this.savedCohorts.selection.getSelectedIndexes().forEach((ind) => {
          this.applyCohort(this.savedCohorts.get('Name', ind), this.savedCohorts.get('At least', ind));
          this.savedCohorts.set('Changed', ind, false);
        });
        this.cohortsChanged = false;
        this.savedCohorts.selection.setAll(false);
        updateDivInnerHTML(this.applyChangesDiv, '');
      }
    }, 'Apply changes');

    this.savedCohorts.onCurrentRowChanged.subscribe(() => {
      this.currentCohortName = this.savedCohorts.get('Name', this.savedCohorts.currentRowIdx);
    });

    this.savedCohorts.onRowsRemoved.subscribe((v) => {
      filetrValueFromDf(this.savedInclCriteria, 'Cohort', this.currentCohortName);
      this.currentCohortName = undefined;
    });

    this.savedCohorts.onDataChanged.subscribe((v) => {
      if (this.savedCohorts.currentRowIdx !== -1 && this.savedCohorts.currentCol.name === 'Name') {
        const newCohortName = this.savedCohorts.get('Name', this.savedCohorts.currentRowIdx);
        for (let i = 0; i < this.savedInclCriteria.rowCount; i++) {
          if (this.savedInclCriteria.get('Cohort', i) === this.currentCohortName)
            this.savedInclCriteria.set('Cohort', i, newCohortName);
        }
        this.currentCohortName = newCohortName;
      }
    });

    this.savedInclCriteria.onCurrentRowChanged.subscribe(() => {
      this.createCurrentInclusionCriteria(this.savedInclCriteria.currentRowIdx);
    });

    this.savedInclCriteria.onDataChanged.subscribe((v) => {
      if (this.savedInclCriteria.currentRowIdx !== -1) {
        if (this.savedInclCriteria.currentCol.name === 'Domain') {
          const selectedDomain = this.savedInclCriteria.get('Domain', this.savedInclCriteria.currentRowIdx);
          this.savedInclCriteria.getCol('Event').meta.choices = selectedDomain ?
            studies[this.studyId].domains[selectedDomain].columns.names().filter((it) => it !== DOMAIN) : [];

          setTimeout(() => {
            this.savedInclCriteria.set('Event', this.savedInclCriteria.currentRowIdx, '');
            this.savedInclCriteria.set('Operator', this.savedInclCriteria.currentRowIdx, '');
            this.savedInclCriteria.set('Value', this.savedInclCriteria.currentRowIdx, ''); ;
          }, 100);
        }
      }
      this.cohortChanged();
    });

    this.savedInclCriteria.onRowsRemoved.subscribe((v) => {
      this.cohortChanged();
    });


    grok.data.linkTables(this.savedCohorts, this.savedInclCriteria,
      ['Name'], ['Cohort'],
      [DG.SYNC_TYPE.CURRENT_ROW_TO_FILTER]);


    const viewerTitle = {
      style: {
        'color': 'var(--grey-6)',
        'margin': '12px 0px 6px 12px',
        'font-size': '16px',
        'justify-content': 'center',
      },
    };

    this.root.className = 'grok-view ui-box';
    this.root.append(
      ui.splitV([
        this.cohortsGrid.root,
        ui.box(ui.divText('Inclusion criteria', viewerTitle), {style: {maxHeight: '45px'}}),
        this.inclusionCriteriaGrid.root,
      ]),
    );

    this.setRibbonPanels([
      [
        ui.icons.add(() => {
          DG.Menu.popup()
            .item('Add Cohort', () => {
              this.savedCohorts.rows.addNew();
              this.savedCohorts.set('Name', this.savedCohorts.rowCount - 1, `Cohort #${this.savedCohorts.rowCount}`);
            })
            .separator()
            .item('Add Criteria', () => {
              if (this.savedCohorts.currentRow.idx !== -1) {
                this.savedInclCriteria.rows.addNew();
                this.savedInclCriteria.set('Cohort', this.savedInclCriteria.rowCount - 1, this.currentCohortName);
              } else
                grok.shell.info('Please select cohort to edit criteria');
            })
            .show();
        }),
        this.applyChangesDiv,
      ],
    ]);
  }

  private cohortChanged() {
    this.savedCohorts.set('Changed', this.savedCohorts.currentRowIdx, true);
    this.savedCohorts.rows.match({changed: true}).select();
    if (!this.cohortsChanged) {
      this.cohortsChanged = true;
      updateDivInnerHTML(this.applyChangesDiv, this.applyChangesButton);
    }
  }

  private checkAtLeastCriteriaNumbers() {
    const cohortWithoutReqCritNumber = [];
    this.savedCohorts.selection.getSelectedIndexes().forEach((ind) => {
      if (this.savedCohorts.col('At least').isNone(ind))
        cohortWithoutReqCritNumber.push(this.savedCohorts.get('Name', ind));
      ;
    });
    return cohortWithoutReqCritNumber;
  }

  private createSavedDataDf(table: string) {
    const df = DG.DataFrame.create();
    Object.keys(this.columnsMeta).forEach((col) => {
      if (this.columnsMeta[col][table])
        df.columns.addNew(col, this.columnsMeta[col].type);
    });
    return df;
  }

  private createGrid(df: DG.DataFrame, edit?: boolean) {
    const grid = df.plot.grid({allowRowSelection: false});

    df.columns.names().forEach((name) => {
      if (this.columnsMeta[name].hide)
        grid.columns.byName(name).visible = false;

      if (this.columnsMeta[name].disabled)
        grid.columns.byName(name).editable = false;

      if (this.columnsMeta[name].categories)
        grid.dataFrame.getCol(name).meta.choices = this.columnsMeta[name].categories;

      if (this.columnsMeta[name].html)
        grid.columns.byName(name).cellType = 'html';
    });

    grid.onCellPrepare((gc) => {
      if (gc.isTableCell) {
        if (gc.tableColumn.name === 'Delete') {
          const eventElement = ui.icons.delete(() => { }, 'Delete');
          gc.style.element = ui.button(eventElement, () => {
            gc.grid.dataFrame.rows.removeAt(gc.gridRow);
          });
          gc.style.element.style.paddingBottom = '7px';
          gc.style.element.style.paddingLeft = '15px';
        };
      };
    });
    return grid;
  }

  private getArrayAsString(array: string[]) {
    let stringArr = '[';
    array.forEach((it) => {
      stringArr += `\"${it}\",`;
    });
    return `${stringArr.slice(0, -1)}]`;
  }

  private createCurrentInclusionCriteria(criterionIdx: number) {
    this.currentInclCriteria = new InclusionCriterion();

    Object.keys(this.columnsMeta).forEach((col) => {
      if (!['Edit', 'Delete'].includes(col) && this.columnsMeta[col].inclCrit) {
        if (!(this.columnsMeta[col].type === DG.TYPE.INT && this.savedInclCriteria.col(col).isNone(criterionIdx)))
          this.currentInclCriteria[col.toLowerCase()] = this.savedInclCriteria.get(col, criterionIdx);
      }
    });
  }


  private applyCohort(cohortName: string, minReqCrit: number) {
    const inclCrit = this.savedInclCriteria
      .groupBy(this.savedInclCriteria.columns.names())
      .where({'Cohort': `${cohortName}`})
      .aggregate();
    let subjByCrit = DG.DataFrame.fromColumns([studies[this.studyId].domains.dm.col(SUBJECT_ID)]);
    for (let i = 0; i < inclCrit.rowCount; i++) {
      const condition = this.getConditionQuery(inclCrit.get('event', i),
        inclCrit.get('operator', i), inclCrit.get('value', i));
      const min = inclCrit.col('Min').isNone(i) ? null : inclCrit.get('min', i);
      const max = inclCrit.col('Max').isNone(i) ? null : inclCrit.get('max', i);
      const subjectsWithCrit = this.getSubjectIds(i, inclCrit.get('domain', i),
        inclCrit.get('event', i), condition, min, max);
      subjByCrit = grok.data.joinTables(subjByCrit,
        subjectsWithCrit,
        [SUBJECT_ID],
        [SUBJECT_ID],
        subjByCrit.columns.names(),
        [`${i}`],
        DG.JOIN_TYPE.OUTER,
        false);
    }
    this.createTotalCritNumberCol(subjByCrit);
    grok.shell.addTableView(subjByCrit);
    this.createCohortCol(studies[this.studyId].domains.dm, cohortName, subjByCrit, minReqCrit);
  }

  private getSubjectIds(critNumber: number, domain: string, event: string,
    condition: string, min?: number, max?: number) {
    let subjects = studies[this.studyId].domains[domain]
      .groupBy([SUBJECT_ID, event])
      .where(condition)
      .count()
      .aggregate();
    if (min || max) {
      if (min && max)
        subjects = subjects.groupBy(subjects.columns.names()).where(`count >= ${min} and count <= ${max}`).aggregate();

      else {
        if (min)
          subjects = subjects.groupBy(subjects.columns.names()).where(`count >= ${min}`).aggregate();
        else
          subjects = subjects.groupBy(subjects.columns.names()).where(`count <= ${max}`).aggregate();
      }
      subjects.columns.remove(`count`);
    }
    subjects.columns.remove(`${event}`);
    subjects.columns.addNew(`${critNumber}`, DG.TYPE.BOOL).init((i) => true);
    return subjects;
  }

  private createTotalCritNumberCol(subjects: DG.DataFrame) {
    const critNames = subjects.columns.names().filter((name) => name !== SUBJECT_ID);
    subjects.columns.addNewInt('total').init((i) => {
      let totalCrit = 0;
      critNames.forEach((crit) => {
        totalCrit += subjects.get(crit, i);
      });
      return totalCrit;
    });
  }

  private createCohortCol(df: DG.DataFrame, cohortName: string, subjects: DG.DataFrame, minReqCrit: number) {
    if (df.col(cohortName))
      df.columns.remove(cohortName)
      ;
    df.columns.addNew(cohortName, DG.TYPE.BOOL).init((i) => subjects.get('total', i) >= minReqCrit);
  }

  private getConditionQuery(col: string, operator: string, value: string) {
    switch (operator) {
    case 'in': {
      return `${col} IN (${value})`;
    }
    case 'less than': {
      return `${col} < ${value}`;
    }
    case 'less or equal': {
      return `${col} <= ${value}`;
    }
    case 'more than': {
      return `${col} > ${value}`;
    }
    case 'more or equal': {
      return `${col} >= ${value}`;
    }
    case 'between': {
      return this.createBetweenQuery(col, value);
    }
    case 'not between': {
      return this.createNotBetweenQuery(col, value);
    }
    default: {
      break;
    }
    }
  }

  private createBetweenQuery(col: string, value: string) {
    const values = value.split(',');
    return `${col} > ${values[0]} and ${col} < ${values[1]}`;
  }

  private createNotBetweenQuery(col: string, value: string) {
    const values = value.split(',');
    return `${col} < ${values[0]} and ${col} > ${values[1]}`;
  }
}
