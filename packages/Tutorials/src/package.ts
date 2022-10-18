import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { TutorialRunner, TutorialSubstitute } from './tutorial-runner';
import { chem } from './tracks/chem';
import { eda } from './tracks/eda';
import { da } from './tracks/data-access';
import { ml } from './tracks/ml';
import { TutorialWidget } from './widget';
import '../css/tutorial.css';
import { Track } from './track';


export const _package = new DG.Package();

const tracks = [eda, chem, ml, da];

//name: Tutorials
//tags: app
//top-menu: Help | Tutorials @Toolbox Help | Tutorials
export function trackOverview() {
  let root = ui.div([
    ...tracks.map((track) => new TutorialRunner(track).root),
    ui.panel([], { id: 'tutorial-child-node', style: { paddingTop: '10px' } }),
  ], 'tutorials-root');

  grok.shell.dockManager.dock(root, DG.DOCK_TYPE.RIGHT, null, 'Tutorials', 0.3);
}

//output: widget tutorial
export function tutorialWidget(): DG.Widget {
  return new TutorialWidget(...tracks.map((track) => new TutorialRunner(track)));
}

//tags: init
export async function tutorialsInit() {
  const tutorialFuncs = DG.Func.find({ tags: ['tutorial'] });
  const trackFuncs = DG.Func.find({ tags: ['track'] });
  const defaultIcon = `${_package.webRoot}package.png`;
  const tutorialIconPaths: { [packageName: string]: { [tutorialName: string]: {
    tutorial: TutorialSubstitute,
    imageUrl: string,
  } } } = {};

  for (const track of tracks) {
    for (const tutorial of track.tutorials)
      tutorial.imageUrl = `${_package.webRoot}images/${tutorial.name.toLowerCase().replace(/ /g, '-')}.png`;
  }

  for (const func of trackFuncs) {
    const name = tracks.find((t) => t.name === func.options['name']) ?
      `${func.options['name']} (1)` : func.options['name'];
    const helpUrl = func.helpUrl ?? '';
    tracks.push(new Track(name, [], helpUrl));
  }

  for (const func of tutorialFuncs) {
    const trackName = func.options['track'] ?? func.package.friendlyName;
    const tutorial = new TutorialSubstitute(func.options['name'], func.description, defaultIcon, func);

    if (func.options['icon'])
      tutorialIconPaths[func.package.name] = { [func.options['name']]: {
        tutorial,
        imageUrl: func.options['icon'],
      } };

    let track = tracks.find((t) => t.name === trackName);
    if (track)
      track.tutorials.push(tutorial);
    else
      tracks.push(new Track(trackName, [tutorial], ''));
  }

  grok.events.onPackageLoaded.subscribe((p) => {
    if (p.name in tutorialIconPaths) {
      for (const tutorial in tutorialIconPaths[p.name]) {
        const data = tutorialIconPaths[p.name][tutorial];
        data.tutorial.imageUrl = `${data.tutorial.func.package.webRoot}${data.imageUrl}`;
      }
    }
  });
}
