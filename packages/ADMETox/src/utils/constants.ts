export const STORAGE_NAME = 'admet_models';
export const KEY = 'selected';
export const TEMPLATES_FOLDER = 'System:AppData/Admetox/templates';
export let DEFAULT_LOWER_VALUE = 0.8;
export let DEFAULT_UPPER_VALUE = 1.0;

export interface ModelProperty {
  name: string;
  description: string;
  units: string;
  direction?: 'Lower is better' | 'Higher is better';
  ranges?: { [key: string]: string };
  weight: number;
  object: { [key: string]: {
    [key: string]: string
  }};
}

export interface ModelColoring {
  type: 'Linear' | 'Conditional';
  min?: number;
  max?: number;
  colors?: string;
}

export interface Model {
  name: string;
  checked: boolean;
  units: string;
  min: number | string;
  max: number | string;
  properties: ModelProperty[];
  coloring: ModelColoring;
}

export interface Template {
  name: string;
  subgroup: Subgroup[];
}

export interface Subgroup {
  name: string;
  expanded: boolean;
  checked: boolean,
  description: string;
  models: Model[];
}

export const TAGS = {
  SECTOR_COLOR: ".sectorColor",
  LOW: ".low",
  HIGH: ".high",
  WEIGHT: ".weight",
  GROUP_NAME: ".group-name"
};