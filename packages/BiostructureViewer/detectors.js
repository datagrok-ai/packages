/**
 * The class contains semantic type detectors.
 * Detectors are functions tagged with `DG.FUNC_TYPES.SEM_TYPE_DETECTOR`.
 * See also: https://datagrok.ai/help/develop/how-to/define-semantic-type-detectors
 * The class name is comprised of <PackageName> and the `PackageDetectors` suffix.
 * Follow this naming convention to ensure that your detectors are properly loaded.
 */
class BiostructureViewerPackageDetectors extends DG.Package {
  //tags: semTypeDetector
  //input: column col
  //output: string semType
  detectPdb(col) {
    if (DG.Detector.sampleCategories(col,
      // (s) => s.includes('COMPND') && s.includes('ATOM') && s.includes('END'), 1)
      (s) => s.match(/^COMPND/m) && s.match(/^END/m) &&
        (s.match(/^ATOM/m) || s.match(/^HETATM/m)),
    )) {
      col.setTag(DG.TAGS.UNITS, 'pdb');
      return 'Molecule3D';
    } else if (DG.Detector.sampleCategories(col,
      (s) => s.match(/^MODEL/m) && s.match(/^ENDMDL/m) &&
        (s.match(/^ATOM/m) || s.match(/^HETATM/m)),
      1)
    ) {
      col.setTag(DG.TAGS.UNITS, 'pdbqt');
      return 'Molecule3D';
    }

    return null;
  }

  //tags: semTypeDetector
  //input: column col
  //output: string semType
  detectPdbId(col) {
    let res = null;
    if (col.type === DG.TYPE.STRING &&
      col.name.toLowerCase().includes('pdb') &&
      DG.Detector.sampleCategories(col, (s) => s.length === 4)
    ) {
      res = 'PDB_ID';
    }
    return res;
  }

  //name: autostart
  //tags: autostart
  //description: BiostructureViewer bootstrap
  autostart() {
    this.logger.debug('BsV: detectors.js: autostart()');

    this.autostartContextMenu();
  }

  autostartContextMenu() {
    grok.events.onContextMenu.subscribe((event) => {
      if (event.args.item) {
        const item = event.args.item;
        // TODO: TreeViewNode.value is not real DG.FileInfo (no extension property)
        // if (item instanceof DG.TreeViewNode)
        //   item = item.value;

        if (item && (
          (item instanceof DG.GridCell || item.constructor.name === 'GridCell') ||
          (item instanceof DG.FileInfo || item.constructor.name === 'FileInfo'))
        ) {
          grok.functions.call('BiostructureViewer:addContextMenu', {event: event})
            .catch((err) => {
              grok.shell.error(err.message);
            });
        }
      }
    });
  }
}
