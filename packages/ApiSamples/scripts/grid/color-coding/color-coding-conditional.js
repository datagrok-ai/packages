let t = grok.data.demo.demog();

t.col('height').meta.colors.setConditional({"20-170": "#00FF00", "170-190": "#220505"});

t.col('age').meta.colors.setLinear([DG.Color.orange, DG.Color.green]);

grok.shell.info(`Column 'subj' color coding: ${t.col('subj').meta.colors.getType()}`);     // Off
grok.shell.info(`Column 'height' color coding: ${t.col('height').meta.colors.getType()}`); // Conditional
grok.shell.info(`Column 'age' color coding: ${t.col('age').meta.colors.getType()}`);       // Linear

t.col('site').meta.colors.setCategorical({'New York': DG.Color.orange});
t.col('started').meta.colors.setLinear([DG.Color.white, DG.Color.red]);
t.col('weight').meta.colors.setConditional({'<100': DG.Color.green, '100-200': '#ff0000'});

grok.shell.addTableView(t);