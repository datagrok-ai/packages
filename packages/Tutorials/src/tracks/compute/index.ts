import { Track } from '@datagrok-libraries/tutorials/src/track';
import { DiffStudioTutorial } from './tutorials/diff-studio';

export const tutorials = [
  DiffStudioTutorial,
];

export const compute = new Track('Compute', tutorials.map((t) => new t()), 'https://datagrok.ai/help/compute/');
