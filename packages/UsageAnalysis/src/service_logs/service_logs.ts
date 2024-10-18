import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as rx from "rxjs";

export class ServiceLogsApp extends DG.ViewBase {
    static readonly DEFAULT_LIMIT: number = 1000;

    private readonly logsRoot: HTMLDivElement;
    private readonly limitInput: DG.InputBase<number | null>;
    private readonly serviceChoiceInput: DG.ChoiceInput<string | null>;
    private currentLogs: string = '';

    constructor(parentCall: DG.FuncCall, services: string[], service?: string, limit?: number) {
        super();
        this.parentCall = parentCall;
        this.name = 'Service Logs';
        this.logsRoot = document.createElement('div');
        this.logsRoot.classList.add('div-textarea', 'ui-report-textarea', 'ui-log-textarea');
        this.logsRoot.style.display = 'flex';
        this.logsRoot.style.flexDirection = 'column';
        this.logsRoot.style.minHeight = '90%';
        this.limitInput = ui.input.int('Limit', {min: 1, max: 100000, tooltipText: 'Limits number of returned records', showPlusMinus: false, value: limit});
        (this.limitInput.input as HTMLInputElement).placeholder = `${ServiceLogsApp.DEFAULT_LIMIT}`;
        this.serviceChoiceInput = ui.input.choice<string | null>('Service', {items: services, tooltipText: 'Choose service',
            nullable: false, value: service ? service : services.length > 0 ? services[0] : null});
        rx.merge(this.limitInput.onInput, this.serviceChoiceInput.onInput).subscribe(async (_) => {
            if (this.limitInput.input.classList.contains('d4-invalid'))
                return;
            this.updatePath();
            await this.getLogs();
        });
        const form = ui.forms.condensed([this.serviceChoiceInput, this.limitInput]);
        const content = ui.divV([form, this.logsRoot]);
        this.root.append(content);
        this.setRibbonPanels([[ui.iconFA('arrow-to-bottom', () => DG.Utils.download(`${this.serviceChoiceInput.value ?? ''}.logs`, new Blob([this.currentLogs], {
                type: 'text/plain'}),  'text/plain'),
            'Download logs')]]);
        setTimeout(() => this.updatePath(), 300);
    }

     async getLogs(): Promise<void> {
        if (!this.serviceChoiceInput.value) {
            new DG.Balloon().error('Service name should be chosen');
            return;
        }
        const progress = DG.TaskBarProgressIndicator.create(`Loading ${this.serviceChoiceInput.value} logs...`);
        this.serviceChoiceInput.enabled = false;
        this.limitInput.enabled = false;
        const loader = ui.loader();
        loader.style.top = 'auto';
        try {
            while(this.logsRoot.firstChild)
                this.logsRoot.removeChild(this.logsRoot.firstChild);
            this.logsRoot.append(loader);
            this.currentLogs = await grok.dapi
                .docker.getServiceLogs(this.serviceChoiceInput.value!,this.limitInput.value ?? ServiceLogsApp.DEFAULT_LIMIT) ?? '';
        } catch (e: any) {
            console.error(e);
            new DG.Balloon().error(e.toString());
        } finally {
            this.updateLogArea();
            this.logsRoot.removeChild(loader);
            progress.close();
            this.serviceChoiceInput.enabled = true;
            this.limitInput.enabled = true;
        }
    }

    private updateLogArea(): void {
        for (const log of this.currentLogs.split('\n')) {
            this.logsRoot.append(ui.span([log]));
        }
    }

     private updatePath(): void {
        let segments: string[] = window.location.href.split('/');
        if (segments[segments.length - 1] !== 'service-logs')
            segments = segments.slice(0, segments.length - 1);
        const currentService = this.serviceChoiceInput.value;
        if (currentService)
            segments.push(currentService!);
        let url: string = segments.join('/') + `?limit=${this.limitInput.value ?? ServiceLogsApp.DEFAULT_LIMIT}`;
        window.history.pushState(null, `${currentService}`, url);
    }
}
