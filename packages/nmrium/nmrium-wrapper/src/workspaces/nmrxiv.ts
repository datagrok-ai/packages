import { InnerWorkspace } from 'nmr-load-save';

export function getNmrXivWorkspace(hidePanelOnLoad = false): InnerWorkspace {
  return {
    label: 'nmrXiv',
    general: {
      dimmedSpectraOpacity: 0.1,
      verticalSplitterPosition: '160px',
      verticalSplitterCloseThreshold: 600,
      spectraRendering: 'auto',
      loggingLevel: 'info',
      invert: false,
      popupLoggingLevel: 'error',
    },
    display: {
      general: {
        experimentalFeatures: { display: true },
        hidePanelOnLoad,
        hideHelp: true,
        hideLogs: true,
        hideWorkspaces: true,
        hideGeneralSettings: true,
      },

      panels: {
        spectraPanel: { display: true, open: true },
        informationPanel: { display: true, open: false },
        rangesPanel: { display: true, open: false },
        structuresPanel: { display: true, open: false },
        processingsPanel: { display: true, open: false },
        zonesPanel: { display: true, open: false },
        summaryPanel: { display: true, open: false },
      },
      toolBarButtons: {
        baselineCorrection: true,
        exclusionZones: true,
        exportAs: true,
        fft: true,
        import: true,
        multipleSpectraAnalysis: true,
        phaseCorrection: true,
        rangePicking: true,
        realImaginary: true,
        slicing: true,
        spectraCenterAlignments: true,
        spectraStackAlignments: true,
        apodization: true,
        zeroFilling: true,
        zonePicking: true,
        zoomOut: true,
        zoom: true,
        autoRangeAndZonePicking: true,
        fftDimension1: true,
        fftDimension2: true,
      },
    },
  };
}
