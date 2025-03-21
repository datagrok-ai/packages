/**
 * The class contains semantic type detectors.
 * Detectors are functions tagged with `DG.FUNC_TYPES.SEM_TYPE_DETECTOR`.
 * See also: https://datagrok.ai/help/develop/how-to/define-semantic-type-detectors
 * The class name is comprised of <PackageName> and the `PackageDetectors` suffix.
 * Follow this naming convention to ensure that your detectors are properly loaded.
 */
class GenomeFileBrowsePackageDetectors extends DG.Package {
  //name: checkGenomeConfig
  //input: string content
  //output: bool result
  checkGenomeConfig(content) {
    if (content.length > 1000000) return false;
    let jsonObj = JSON.parse(content);
    const uriRegex = new RegExp('"uri"');
    const uriHttpRegex = new RegExp('"uri"\\s*:\\s*"http');
    if (!!(jsonObj.tracks && (jsonObj.assemblies || jsonObj.assembly))) {
      //megabyte and content checks
      if (
        content.match(uriRegex)?.length === content.match(uriHttpRegex)?.length
      )
        return true;
      grok.shell.warning(
        "Can not load the file as Genome File Browse viewer due there is uri existing without HTTP"
      );
    }
    return false;
  }
}
