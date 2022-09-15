<!-- TITLE: Use Cases: Predictive modeling -->
<!-- SUBTITLE: -->

# Use cases: Predictive modeling

Owner: Vasiliy

Goal: show how to train, apply, browse compare models

Features: model browser, building new models, performance assessment, model comparison, model suggestions, history,
servers, sharing

1. Train model:

* Open table (for example: demog.csv)
* Open “Predictive Modelling” dialog (Tools | Predictive modeling | Train)
* Select “Table”: “demog”
* Select “Method”: “Distributed Random Forest”
* Select “Features”: [AGE, WEIGHT, HEIGHT]
* Select “Outcome”: SEX
* Click “Train” button

2. Model performance:

* Open “Predictive Modelling Browser” (Tools | Predictive modeling | Browse Models)
* Search for trained model (applicable model will be at the top of list, or use search by defined previously name)
* Select model in “Models” browser
* Open “Performance” on “Property Panel”

3. Share:

* Open “Predictive Modelling Browser” (Tools | Predictive modeling | Browse Models)
* Search for trained model (applicable model will be at the top of list, or use search by defined previously name)
* Select model in “Models” browser
* Use “Context Menu | Share” to share model

4. Apply model on “research” table:

* Open “Predictive Modelling Browser” (Tools | Predictive modeling | Browse Models)
* Search for trained model (applicable model will be at the top of list, or use search by defined previously name)
* Open context menu on trained model
* Apply model (Apply to | “research” table (...))

5. Compare models

* Train the same model, but using “Deep Learning” method
* Open “Predictive Modelling Browser” (Tools | Predictive modeling | Browse Models)
* Search for trained models (applicable model will be at the top of list, or use search by defined previously name)
* Select two trained models using “Shift” button
* Open “Compare models” view (Property Panel: Commands | Compare)

6. Change modeling engine

* Tools | Settings…
* Servers
* Set “Use Open Cpu For Predictive Modelling” flag to use OpenCPU as modelling engine, H2O will be used instead

See also:

* [Predictive modeling](../../learn/predictive-modeling.md)
* [Predictive modeling Info](../../learn/predictive-modeling-info.md)
* [Data connection](../../access/data-connection.md)
* [Data query](../../access/data-query.md)
* [Function call](../../datagrok/functions/function-call.md)
