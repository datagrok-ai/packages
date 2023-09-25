let f = DG.Func.find({name: 'Sin'})[0];

// inspect function parameters
let inputs = f.inputs.map(input => input.propertyType + ' ' + input.name);
let outputs = f.outputs.map(output => output.propertyType + ' ' + output.name);
grok.shell.info(f.name +  '(' + inputs + ')' + ': ' + outputs);

// simple way: f.apply
f.apply({x: 0.5}).then((result) => grok.shell.info(result));

// more complex: preparing a FuncCall that lets you track inputs and outputs, intercept execution, etc
let fc = f.prepare({"x": 0.5});

grok.shell.info('Input name and type: ' + fc.inputParams['x'].name + ' ' + fc.inputParams['x'].property.propertyType);
grok.shell.info('Input value:' + fc.inputs['x']);

grok.shell.info(fc.inputs['x']);
fc.call().then((call) => grok.shell.info(call.outputs['result']));