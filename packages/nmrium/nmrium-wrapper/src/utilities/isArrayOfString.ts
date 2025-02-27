//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isArrayOfString(data: any[]) {
  return data.every((url) => typeof url === 'string');
}
