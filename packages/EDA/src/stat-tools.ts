// Statistic tools

/* REFERENCES

     [1] One-way analysis of variance, https://en.wikipedia.org/wiki/One-way_analysis_of_variance

     [2] G.W. Heiman. Basic Statistics for the Behavioral Sciences, 6th ed. Wadsworth Publishing, 2010

     [3] F-test of equality of variances, https://en.wikipedia.org/wiki/F-test_of_equality_of_variances

     [4] S. McKillup. Statistics Explained, Cambridge University Press, 2005

*/

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

//@ts-ignore: no types
import * as jStat from 'jstat';

enum ERROR_MSG {
  NON_EQUAL_FACTORS_VALUES_SIZE = 'non-equal sizes of factor and values arrays. INPUT ERROR.',
  INCORRECT_SIGNIFICANCE_LEVEL = 'incorrect significance level. It must be from the interval (0, 1). INPUT ERROR.',
  INCORRECT_SAMPLE_SIZE = 'incorrect size of sample. DATA FACTORIZAING ERROR.',
  NON_EQUAL_VARIANCES = 'variances are not equal.',
  NON_NORMAL_DISTRIB = 'non-normal distribution.',
  UNSUPPORTED_COLUMN_TYPE = 'unsupported column type.',
  INCORRECT_CATEGORIES_COL_TYPE = 'incorrect categories column type.',
  ANOVA_FAILED_JUST_ONE_CAT = 'ANOVA filed: there should be at least 2 categories.'
};

type SampleData = {
  sum: number,
  sumOfSquares: number,
  size: number,
};

/** One-way ANOVA computation results. The classic notations are used (see [2], p. 290). */
type OneWayAnova = {
  /** sum of squares between groups, SSbn */
  ssBn: number,
  /** sum of squares within groups, SSnn */
  ssWn: number,
  /** total sum of squares, SStot */
  ssTot: number,
  /** degrees of freedom between groups, DFbn */
  dfBn: number,
  /** degrees of freedom within groups, DFwn */
  dfWn: number,
  /** total degrees of freedom, DFtot */
  dfTot: number,
  /** mean square between groups, MSbn */
  msBn: number,
  /** mean square within groups, MSwn */
  msWn: number,
  /** Fobt, value of F-statistics, Fstat */
  fStat: number,
  /** p-value corresponding to F-statistics, pValue */
  pValue: number,
};

/** Categorical column */
type CatCol = DG.Column<DG.COLUMN_TYPE.STRING>;

/** Numerical column */
type NumCol = DG.Column<DG.COLUMN_TYPE.FLOAT> | DG.Column<DG.COLUMN_TYPE.INT>;

/** Create dataframe with one-way ANOVA results. */
export function getOneWayAnovaDF(
  anova: OneWayAnova, alpha: number, fCritical: number, hypothesis: string, testResult: string,
): DG.DataFrame {
  return DG.DataFrame.fromColumns([
    DG.Column.fromStrings('Source of variance',
      ['Between groups', 'Within groups', 'Total', '', hypothesis, '', testResult]),
    DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'Sum of squares',
      [anova.ssBn, anova.ssWn, anova.ssTot, null, null, null, null]),
    DG.Column.fromList(DG.COLUMN_TYPE.INT, 'Degrees of freedom',
      [anova.dfBn, anova.dfWn, anova.dfTot, null, null, null, null]),
    DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'Mean square', [anova.msBn, anova.msWn, null, null, null, null, null]),
    DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'F-statistics', [anova.fStat, null, null, null, null, null, null]),
    DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'p-value', [anova.pValue, null, null, null, null, null, null]),
    DG.Column.fromList(DG.COLUMN_TYPE.FLOAT,
      `${alpha}-critical value`, [fCritical, null, null, null, null, null, null]),
  ]);
} // getOneWayAnovaDF

/** Check correctness of significance level. */
export function checkSignificanceLevel(alpha: number) {
  if ((alpha <= 0) || (alpha >= 1))
    throw new Error(ERROR_MSG.INCORRECT_SIGNIFICANCE_LEVEL);
}

/** Compute unbiased variance.*/
export function getVariance(data: SampleData): number {
  // The applied formulas can be found in [4] (see p. 63)
  const size = data.size;

  if (size <= 0)
    throw new Error(ERROR_MSG.INCORRECT_SAMPLE_SIZE);

  if (size === 1)
    return 0;

  return (data.sumOfSquares - (data.sum) ** 2 / size) / (size - 1);
} // getVariance

/** Check equality of variances of 2 samples. F-test is performed.*/
function areVarsEqual(xData: SampleData, yData: SampleData, alpha: number = 0.05): boolean {
  // The applied approach can be found in [3]
  checkSignificanceLevel(alpha);

  const xVar = getVariance(xData);
  const yVar = getVariance(yData);

  if (yVar === 0)
    return (xVar === yVar);

  const fStat = xVar / yVar;
  const fCrit = jStat.centralF.inv(1 - alpha, xData.size - 1, yData.size - 1);

  return (fStat < fCrit);
} // areVarsEqual

export class FactorizedData {
  private isNormDistrib: boolean | undefined = undefined;
  private categories: string[] = [];
  private sums!: Float64Array;
  private sumsOfSquares!: Float64Array;
  private subSampleSizes!: Int32Array;
  private size!: number;
  private catCount!: number;

  constructor(categories: CatCol, values: NumCol, checkNormality: boolean = false, alpha: number = 0.05) {
    if (categories.type !== DG.COLUMN_TYPE.STRING)
      throw new Error();

    if (categories.length !== values.length)
      throw new Error(ERROR_MSG.NON_EQUAL_FACTORS_VALUES_SIZE);

    this.setStats(categories, values, checkNormality, alpha);
  }

  public isNormal(): boolean | undefined {
    return true;
  }

  /** Check equality of variances of factorized data. */
  public areVarsEqual(alpha: number = 0.05): boolean {
    const K = this.catCount;

    if (K === 1)
      return true;

    const first: SampleData = {sum: this.sums[0], sumOfSquares: this.sumsOfSquares[0], size: this.subSampleSizes[0]};

    for (let i = 1; i < K; ++i) {
      if (!areVarsEqual(first, {sum: this.sums[i], sumOfSquares: this.sumsOfSquares[i],
        size: this.subSampleSizes[i]}, alpha))
        return false;
    }

    return true;
  } // areVarsEqual

  /** Perform one-way ANOVA computations. */
  public getOneWayAnova(): OneWayAnova {
    // Further, notations and formulas from (see [2], p. 290) are used.

    const K = this.catCount;

    if (K === 1)
      throw new Error(ERROR_MSG.ANOVA_FAILED_JUST_ONE_CAT);

    let sum = 0;
    let sumOfSquares = 0;
    const N = this.size;
    let buf = 0;

    for (let i = 0; i < K; ++i) {
      sum += this.sums[i];
      sumOfSquares += this.sumsOfSquares[i];
      buf += this.sums[i] ** 2 / this.subSampleSizes[i];
    }

    const ssTot = sumOfSquares - sum ** 2 / N;
    const ssBn = buf - sum ** 2 / N;
    const ssWn = ssTot - ssBn;

    const dfBn = K - 1;
    const dfWn = N - K;
    const dfTot = N - 1;

    const msBn = ssBn / dfBn;
    const msWn = ssWn / dfWn;

    const fStat = msBn / msWn;

    return {
      ssBn: ssBn,
      ssWn: ssWn,
      ssTot: ssTot,
      dfBn: dfBn,
      dfWn: dfWn,
      dfTot: dfTot,
      msBn: msBn,
      msWn: msWn,
      fStat: fStat,
      pValue: 1 - jStat.centralF.cdf(fStat, dfBn, dfWn),
    };
  } // getOneWayAnova

  /** Compute sum & sums of squares with respect to factor levels. */
  private setStats(categories: CatCol, values: NumCol, _checkNormality: boolean = false, _alpha: number = 0.05): void {
    // TODO: provide check normality feature
    const type = values.type;
    const size = values.length;

    switch (type) {
    case DG.COLUMN_TYPE.INT:
    case DG.COLUMN_TYPE.FLOAT:
      this.categories = categories.categories;
      const catCount = this.categories.length;
      this.catCount = catCount;
      this.size = size;

      const vals = values.getRawData();
      const cats = categories.getRawData();

      const sums = new Float64Array(catCount).fill(0);
      const sumsOfSquares = new Float64Array(catCount).fill(0);
      const subSampleSizes = new Int32Array(catCount).fill(0);

      for (let i = 0; i < size; ++i) {
        const c = cats[i];
        sums[c] += vals[i];
        sumsOfSquares[c] += vals[i] ** 2;
        ++subSampleSizes[c];
      }

      this.sums = sums;
      this.sumsOfSquares = sumsOfSquares;
      this.subSampleSizes = subSampleSizes;

      break;

    default:
      throw new Error(ERROR_MSG.UNSUPPORTED_COLUMN_TYPE);
    }
  } // setStats
} // FactorizedData

/** Perform one-way analysis of variances. */
export function oneWayAnova(
  categores: CatCol, values: NumCol, alpha: number = 0.05, validate: boolean = false,
): DG.DataFrame {
  checkSignificanceLevel(alpha);

  const factorized = new FactorizedData(categores, values, validate, alpha);

  if (validate) {
    if (!factorized.areVarsEqual(alpha))
      throw new Error(ERROR_MSG.NON_EQUAL_VARIANCES);

    if (!factorized.isNormal())
      throw new Error(ERROR_MSG.NON_NORMAL_DISTRIB);
  }

  const anova = factorized.getOneWayAnova();
  const fCrit = jStat.centralF.inv(1 - alpha, anova.dfBn, anova.dfWn);

  const hypothesis = `THE NULL HYPOTHESIS: the "${categores.name}" 
    factor does not produce a significant difference in the "${values.name}" feature.`;
  const testResult = `Test result: ${(anova.fStat > fCrit) ? 'REJECTED.' : 'FAILED TO REJECT.'}`;

  return getOneWayAnovaDF(anova, alpha, fCrit, hypothesis, testResult);
} // oneWayAnova
