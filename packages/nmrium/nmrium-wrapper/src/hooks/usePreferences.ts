import { CustomWorkspaces, WorkspacePreferences } from 'nmr-load-save';
import { NMRiumWorkspace } from 'nmrium';
import { useLayoutEffect, useState } from 'react';

import { getNmrXivWorkspace } from '../workspaces/nmrxiv';

interface Preferences {
  preferences: WorkspacePreferences | undefined;
  workspace: NMRiumWorkspace | undefined;
  defaultEmptyMessage: string | undefined;
  customWorkspaces: CustomWorkspaces;
}

const DEFAULT_PREFERENCES = {
  preferences: undefined,
  workspace: undefined,
  defaultEmptyMessage: undefined,
  customWorkspaces: {},
};

export function usePreferences() {
  const [configuration, setConfiguration] =
    useState<Preferences>(DEFAULT_PREFERENCES);

  useLayoutEffect(() => {
    const { href } = window.location;
    const parameters = new URL(href).searchParams;

    let preferences: WorkspacePreferences | undefined;
    let workspace: NMRiumWorkspace | undefined;
    let defaultEmptyMessage: string | undefined;
    let hidePanelOnLoad = false;

    if (parameters.has('workspace')) {
      workspace = parameters.get('workspace') as NMRiumWorkspace;
    }

    if (parameters.has('preferences')) {
      preferences = JSON.parse(parameters.get('preferences') || '');
    }

    if (parameters.has('defaultEmptyMessage')) {
      defaultEmptyMessage = parameters.get('defaultEmptyMessage') as string;
    }
    if (parameters.has('hidePanelOnLoad')) {
      hidePanelOnLoad =
        parameters.get('hidePanelOnLoad')?.toLowerCase() === 'true';
    }

    const customWorkspaces = createCustomWorkspaces({ hidePanelOnLoad });
    setConfiguration({
      preferences,
      workspace,
      defaultEmptyMessage,
      customWorkspaces,
    });
  }, []);

  return configuration;
}

interface CreateCustomWorkspacesOptions {
  hidePanelOnLoad?: boolean;
}

function createCustomWorkspaces(
  options: CreateCustomWorkspacesOptions,
): CustomWorkspaces {
  const { hidePanelOnLoad = false } = options;

  return {
    nmrXiv: getNmrXivWorkspace(hidePanelOnLoad),
  };
}
