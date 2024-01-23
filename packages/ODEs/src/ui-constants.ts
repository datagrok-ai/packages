/** Diff Studio application UI constants */

/** Hot keys */
export enum HOT_KEY {
  RUN = 'F5',
};

/** Tooltips messages */
export enum HINT {
  HELP = 'Open help in a new tab',
  OPEN = 'Open model',
  SAVE = 'Save model to local file',
  LOAD = 'Load model from local file',
  BASIC = 'Open basic template',
  ADV = 'Open advanced template',
  EXT = 'Open extended template',
  CHEM = 'Mass-action kinetics illustration',
  ROB = "Robertson's chemical reaction model",
  FERM = 'Fermentation process simulation',
  PKPD = 'Pharmacokinetic-pharmacodynamic model',
  ACID = 'Gluconic acid production model',
  NIM = 'Nimotuzumab disposition model',
  CLEAR = 'Clear model',
  TO_JS = 'Export model to JavaScript script',
  APP = 'Export model to platform application with user interface'
};

/** UI titles */
export enum TITLE {
  SAVE = 'Save...',
  LOAD = 'Load...',
  FROM_FILE = 'From file...',
  TEMPL = 'Templates',
  BASIC = 'Basic',  
  ADV = 'Advanced',
  EXT = 'Extended',
  CASES = 'Examples',
  CHEM = 'Chem reactions',
  ROB = "Robertson's model",  
  FERM = 'Fermentation',
  PKPD = 'PK-PD',
  ACID = 'Acid production',
  NIM = 'Nimotuzumab',
  CLEAR = 'Clear',
  TO_JS = 'js',
  MISC = 'Misc',
  VARY = 'Vary inputs',
  MODEL = 'Model',
  IPUTS = 'Run'
};

/** Help links */
export enum LINK {  
  DIF_STUDIO_REL = '/help/compute/diff-studio',
  DIF_STUDIO = 'https://datagrok.ai/help/compute/diff-studio',  
  CHEM_REACT = `${DIF_STUDIO_REL}#chem-reactions`,
  FERMENTATION = `${DIF_STUDIO_REL}#fermentation`,
  GA_PRODUCTION = `${DIF_STUDIO_REL}#acid-production`,
  NIMOTUZUMAB = `${DIF_STUDIO_REL}#nimotuzumab`,
  PKPD = `${DIF_STUDIO_REL}#pk-pd`,
  ROBERTSON = `${DIF_STUDIO_REL}#robertson-model.md`,  
};

/** Error messages */
export enum ERROR_MSG {
  SOLVING_FAILS = 'Solving fails',
  APP_CREATING_FAILS = 'Application creating fails',
  EXPORT_TO_SCRIPT_FAILS = 'Export to JavaScript script fails',
  CORE_ISSUE = 'Core issue',
  MISSING_CLOSING_BRACKET = 'ANNOTATION: "]" is missing',
  INCORRECT_BRACES_USE = 'ANNOTATION: incorrect use of "{}"',
  MISSING_COLON = 'ANNOTATION: ":" is missing',
  CHECK_ARGUMENTS = ' (check the "argument" section)',
  INCORRECT_ARG_SEGM = 'Incorrect limits for the argument',
};

/** Warning dialog lines */
export enum WARNING {
  TITLE = 'WARNING',
  CHECK = 'Show this warning',
  MES = 'Overwrite the current model?',
};

/** Other UI constants */
export enum MISC {
  VIEW_DEFAULT_NAME = 'Template',
  FILE_DEFAULT_NAME = 'equations.ivp',
};

/** Code completion infos */
export enum INFO {
  NAME = 'name of the model',
  TAGS = 'scripting tags',
  DESCR = 'descritpion of the model',
  DIF_EQ = 'block of differential equation(s) specification',
  EXPR = 'block of auxiliary expressions & computations',
  ARG = 'independent variable specification',
  INITS = 'initial values of the model',
  PARAMS = 'parameters of the model',
  CONSTS = 'constants definition',
  TOL = 'tolerance of numerical solution',
  LOOP = 'loop feature',
  UPDATE = 'update model feature',
  OUTPUT = 'output specification',
  COMMENT = 'block with comments',
};

/** Demo app help info */
export const demoInfo = `# Try
Modify formulas and go to the **${TITLE.IPUTS}** tab.

# No-code
Define equations in a declarative form.

# Interactivity
Play with model inputs on the **${TITLE.IPUTS}** tab.

# Examples
Press <i class="fas fa-folder-open"></i> **Open** icon and explore **Examples**.

# Scripting
Press **JS** button and export model to JavaScript script.

# Learn more
* [Diff Studio](${LINK.DIF_STUDIO})
* [Compute](https://datagrok.ai/help/compute)`;

/** Inputs types */
export enum INPUT_TYPE {
  FLOAT = 'Float',
  INT = 'Int',
};

/** Path related consts */
export enum PATH {  
  MODEL = `?model=`,
  CUSTOM = `${MODEL}custom`,
  EMPTY = `${MODEL}empty`,  
  EQ = '=',
  AND = '&',
};
