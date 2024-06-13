import {PATTERN_APP_DATA_FILENAME} from '../../../common/model/data-loader/const';
import {NUCLEOTIDES} from '../../../common/model/const';
import {LUMINANCE_COEFFICIENTS, TEXT_COLOR, SVG_CIRCLE_SIZES} from './const';
import {isOverhangNucleotide} from '../../model/utils';

import {_package} from '../../../../package';

export function computeLegendCircleYPosition(isAntisenseStrandActive: boolean): number {
  return (isAntisenseStrandActive ? 9.5 : 6) * SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS;
}

export function getNucleobaseLabelForCircle(nucleobase: string): string {
  const criterion = !isOverhangNucleotide(nucleobase) && NUCLEOTIDES.includes(nucleobase);

  return criterion ? nucleobase : '';
}

export function computeTextColorForNucleobaseLabel(nucleobase: string): string {
  const nucleobaseColor = getNucleobaseColorFromStyleMap(nucleobase);

  const rgbValues = nucleobaseColor.match(/\d+/g)?.map(Number);
  if (!rgbValues || rgbValues.length < 3)
    return TEXT_COLOR.LIGHT;


  const [r, g, b] = rgbValues;
  const luminance = r * LUMINANCE_COEFFICIENTS.RED + g * LUMINANCE_COEFFICIENTS.GREEN + b * LUMINANCE_COEFFICIENTS.BLUE;
  return luminance > LUMINANCE_COEFFICIENTS.THRESHOLD ? TEXT_COLOR.DARK : TEXT_COLOR.LIGHT;
}

export function getNucleobaseColorFromStyleMap(nucleobase: string): string {
  // todo: optimize
  const format = Object.keys(_package.jsonData.patternAppData)[0];
  if (!format)
    throw new Error(`No format found in '${PATTERN_APP_DATA_FILENAME}'`);

  const styleMap = _package.jsonData.patternAppData[format];
  return styleMap[nucleobase].color || '';
}
