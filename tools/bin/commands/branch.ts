import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as color from '../utils/color-utils';

function getCurrentGitBranch(): string | null {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim() || null;
  } catch (error) {
    color.error('Failed to determine the current git branch.');
    return null;
  }
}

export function publishBranch(): boolean {
  const currentBranch = getCurrentGitBranch();
  if (!currentBranch) return false;

  const packagesFilePath = path.join(__dirname, '..', '..', '..', '.github', 'workflows', 'packages.yaml');
  
  if (!fs.existsSync(packagesFilePath)) {
    color.error(`File not found: ${packagesFilePath}`);
    return false;
  }

  const fileContent = fs.readFileSync(packagesFilePath, { encoding: 'utf-8' });
  const updatedContent = fileContent.replace(
    /if \[\[ '\${{ github.ref }}' == 'refs\/heads\/master' \]\]; then/g,
    `if [[ '\${{ github.ref }}' == 'refs/heads/${currentBranch}' ]]; then`
  );

  if (fileContent === updatedContent) {
    color.warn('No changes were made. The file may already be updated.');
    return true;
  }

  fs.writeFileSync(packagesFilePath, updatedContent, { encoding: 'utf-8' });
  color.success(`Successfully updated '${packagesFilePath}' to use the branch '${currentBranch}'.`);
  return true;
}