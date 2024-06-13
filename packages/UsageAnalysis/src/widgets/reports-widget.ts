import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

export class ReportsWidget extends DG.Widget {
  caption: string;
  order: string;

  constructor() {
    super(ui.box());
    this.caption = super.addProperty('caption', DG.TYPE.STRING, 'Top reports');
    this.order = super.addProperty('order', DG.TYPE.STRING, '2');
    const link = ui.link('Open Reports', async () => {
      const progress = DG.TaskBarProgressIndicator.create('Opening Reports...');
      try {
        grok.shell.addView(await grok.functions.eval('UsageAnalysis:reportsApp()'));
      } catch (e) {
        console.error(e);
      } finally {
        progress.close();
      }
    });
    this.root.appendChild(ui.box(ui.div(link, {style: {display: 'flex', justifyContent: 'end', alignItems: 'center', height: '40px', paddingRight: '8px'}}), {style: {maxHeight: '40px'}}));
    this.root.appendChild(ui.waitBox(async () => {
      const result: DG.UserReport[] = await grok.dapi.reports.include('reporter').list({pageNumber: 1, pageSize: 20});
      const items = [];
      for (let report of result) {
        // todo: add css instead of inline styles
        const userHandler = DG.ObjectHandler.forEntity(report.reporter)!;
        const reportHandler = DG.ObjectHandler.forEntity(report)!;
        const clock = ui.iconFA('clock', null, report.createdOn.toISOString());
        clock.style.marginRight = '10px';
        const portrait = ui.tooltip.bind(userHandler.renderIcon(report.reporter.dart)!, () => {
          return userHandler.renderTooltip(report.reporter.dart)!;
        });
        portrait.style.marginRight = '10px';
        const content = ui.divH([clock, portrait, ui.divText(report.description)]);
        const item = ui.card(content);
        item.style.overflow = 'visible';
        item.style.width = '100%';
        item.style.marginBottom = 'unset';
        item.style.border = 'none';
        item.style.marginLeft = 'auto';
        item.style.padding = '5px';
        item.addEventListener('click', async (e) => {
          e.preventDefault();
          grok.shell.setCurrentObject(reportHandler.renderProperties(report.dart), false);
        });
        items.push(item);
      }
      const d = ui.divV(items);
      d.style.padding = '10px';
      d.style.lineHeight = '1';
      return d;
    }));
  }
}
