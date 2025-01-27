/** Diff Studio model error */
export class ModelError extends Error {
  private helpUrl: string;
  private toHighlight: string | undefined = undefined;

  constructor(message: string, helpUrl: string, toHighlight?: string) {
    super(message);
    this.helpUrl = helpUrl;
    this.toHighlight = toHighlight;
  }

  public getHelpUrl() {
    return this.helpUrl;
  }

  public getToHighlight() {
    return this.toHighlight;
  }
}; // ModelError
