export function getFileNameFromURL(url: string) {
  return url.slice(Math.max(0, url.lastIndexOf('/') + 1));
}
