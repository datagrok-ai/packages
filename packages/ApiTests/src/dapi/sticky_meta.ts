import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

//@ts-ignore
import {assure, before, category, expect, test} from '@datagrok-libraries/utils/src/test';

category('Dapi: sticky meta', () => { 
  let schema: DG.Schema;
  let entityType: DG.EntityType;
  let property: DG.EntityProperty;
  let handle = 'api-test';
  let value = 'val';
  let col: DG.Column<String>;
  let valDf: DG.DataFrame;

  before(async () => {
    let schemas = await grok.dapi.stickyMeta.getSchemas();
    for (let i = 0; i < schemas.length; i++) {
      if (schemas[i].name == "default") {
        schema = schemas[i];
        break;
      }
    }
    if (schema == undefined) {
      schema = DG.Schema.create('default');
      await grok.dapi.stickyMeta.saveSchema(schema);
    }
    for (let i = 0; i < schema.entityTypes.length; i++) {
      if (schema.entityTypes[i].matching == 'semtype=test') {
        entityType = schema.entityTypes[i];
        break;
      }
    }
    if (entityType == undefined) {
      entityType = DG.EntityType.create('apiTest', 'semtype=test');
      var et = schema.entityTypes;
      et.push(entityType);
      schema.entityTypes = et;
      await grok.dapi.stickyMeta.saveSchema(schema);
    }
    for (let i = 0; i < schema.properties.length; i++) {
      if (schema.properties[i].name == 'apiTest') {
        property = schema.properties[i];
      }
    }
    if (property == undefined) {
      property = DG.EntityProperty.create('apiTest', 'string');
      var props = schema.properties;
      props.push(property);
      schema.properties = props;
      await grok.dapi.stickyMeta.saveSchema(schema);
    }
    assure.notNull(schema);
    assure.notNull(entityType);
    assure.notNull(property);
    col = DG.Column.string('key', 1);
    col.semType = 'test';
    col.set(0, handle);
    valDf = DG.DataFrame.create(1);
    valDf.columns.addNewString(property.name);
    valDf.set(property.name, 0, value);
  });

  test('save values', async () => {
    await grok.dapi.stickyMeta.setAllValues(schema, col, valDf);
  }, {stressTest: true});

  test('get values', async () => {
    var col = DG.Column.string('key', 1);
    col.set(0, handle);
    var df = await grok.dapi.stickyMeta.getAllValues(schema, col);
    expect(df.columns.length, schema.properties.length);  
    expect(df.col(property.name)?.name ?? "", property.name);
    expect(df.col(property.name)?.get(0), value);
  }, {stressTest: true});
});
