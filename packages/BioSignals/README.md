# Biosignals

BioSignals is a [package](https://datagrok.ai/help/develop/develop#packages) for the [Datagrok](https://datagrok.ai)
platfrom. The goal of the project is to offer an efficient and automated biosignal processing routine. The initial
version is based on [pyphysio](https://github.com/MPBA/pyphysio) - a python library developed
by [Andrea Bizzego](https://www.sciencedirect.com/science/article/pii/S2352711019301839).

The package reinforces the existing pyhton code with
datagroks' [visualization](https://datagrok.ai/help/visualize/viewers)
and [data processing](https://datagrok.ai/help/transform/add-new-column) tools. The pipeline itself is designed with
scientific community in mind, standartizing and thus facilitating the usual ECG, EEG, EDA, etc. signal processing
workflows. The fusion of manual and automated steps is largely enabled by
our [interactive viewers](https://datagrok.ai/help/visualize/viewers)
, [scripting](https://dev.datagrok.ai/help/compute/scripting) capabilities,
[detector](https://datagrok.ai/help/develop/how-to/add-info-panel) functions,
[data augmentation](https://datagrok.ai/help/discover/data-augmentation), and a curated collection of
the [scientific methods](https://datagrok.ai/help/learn/data-science).

In particular, project's initial goals are:

| Goal                                                                                                                                                                                   | Example                                                                                                           |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| Automatically read various biosensor file formats                                                                                                                                      | Integrate with the built-in file share browser                                                                    |
| Provide efficient interactive visualizations for raw biosensor data, including domain-specific visualizations                                                                          | "Head view" for EEG                                                                                               |
| Provide efficient ways for manipulating raw biosensor data                                                                                                                             | Marking regions, etc                                                                                              |
| Provide a collection of high-performance DSP algorithms                                                                                                                                | See [DSP package](https://github.com/datagrok-ai/public/tree/master/packages/DSP)                                 |
| Detect type of signals, along with the metadata                                                                                                                                        | Sampling rate, recorded events                                                                                    |
| Automatically suggest analyses and pipelines applicable to the current dataset, derive high-level features out of the raw biosensor signal                                             | "Extract step count" for the accelerometry data                                                                   |
| Visually define pipelines                                                                                                                                                              | Similar to [Simulink block diagrams](https://www.mathworks.com/help/simulink/slref/simulink-concepts-models.html) |
| Allow to build predictive models by integrating previously defined pipelines with theDatagrok's [predictive modeling](https://datagrok.ai/help/learn/predictive-modeling) capabilities | Training a model to find "bad" quality segments based on the manually annotated data                              |

Currently, the project is in its early stages, and we welcome you to contribute to this repository.

## Pyphysio

[Pyphysio](https://github.com/MPBA/pyphysio) is a library that contains the implementations of the most important
algorithms for the analysis of physiological data. The latter methods are divided into the following categories:

| Category     | Input  | Output                           | Examples                                                                                                                                                                                                                                    |
|--------------|--------|----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Filters      | Signal | Filtered signal of the same type | Apply [elliptic filter](https://en.wikipedia.org/wiki/Elliptic_filter) to raw ECG signal                                                                                                                                                    |
| Estimators   | Signal | Signal of a different type       | Get [inter beat intervals (IBI)](https://en.wikipedia.org/wiki/Heart_rate_variability#Variation) from ECG signal                                                                                                                            |
| Segmentators | Signal | Series of segments               | Cut 24-hour [Holter monitor](https://en.wikipedia.org/wiki/Holter_monitor) record into 10-minute segments to compute how many arrhythmias occurred over different time intervals                                                            |
| Indicators   | Signal | Value                            | Compute sequence of HRV indicators from segmented RR intervals                                                                                                                                                                              |
| Tools        | Signal | Arbitrary data                   | Detects outliers in the [IBI signal](https://en.wikipedia.org/wiki/Heart_rate_variability#Variation), compute rising slope of [R peaks](https://en.wikipedia.org/wiki/QRS_complex), estimate the power spectral density (PSD) of the signal |

## How to add your script

1. Go to Functions | Scripts | Actions | New <yourScriptLanguage> Script
2. Write your script, and test it on files
3. Set tag #filters, #estimators or #indicators

Now it is available in corresponding app section.

## A unique approach to every signal

| Signal type                                                                                                                       | Definition                                                                                          |
|-----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| [ECG (Electrocardiogram)](https://www.ahajournals.org/doi/full/10.1161/01.cir.93.5.1043)                                          | Electrical activity of the heart                                                                    |
| [EDA (Electro-dermal activity)](https://www.biopac.com/wp-content/uploads/EDA-SCR-Analysis.pdf)                                   | Variation of the electrical conductance of the skin in response to sweat secretion                  |
| [Accelerometer signal](https://en.wikipedia.org/wiki/Accelerometer)                                                               | Rate of change of body's velocity                                                                   |
| [EMG (Electromyography)](https://en.wikipedia.org/wiki/Electromyography)                                                          | Electric potential generated by muscle cells when they are electrically or neurologically activated |
| [EEG (Electroencephalogram)](https://www.kiv.zcu.cz/site/documents/verejne/vyzkum/publikace/technicke-zpravy/2013/tr-2013-02.pdf) | Electrical activity of the brain                                                                    |
| [ABP (Arterial Blood Pressure signal)](https://en.wikipedia.org/wiki/Blood_pressure)                                              | Pressure of circulating blood against the walls of blood vessels                                    |
| [BVP / PPG (Blood Volume Pulse / Photoplethysmography)](https://en.wikipedia.org/wiki/Photoplethysmogram)                         | Volumetric variations of blood circulation                                                          |
| [Respiration](https://en.wikipedia.org/wiki/Respiratory_rate)                                                                     |                                                                                                     |

Since various signals require a different combination of filters and information extraction steps, a separate pipeline
has to be designed for every input. We plan to first separately recreate the recommended workflows and then combine them
into a complete package.

## Automation

A substantial part of this project targets improvements to user-friendliness. Our goal is to create a smart environment,
which streamlines the pre-processing steps by autonomously selecting and suggesting the most appropriate tools.

### Detectors.js

A file containing functions for preliminary data analysis. Once any table is uploaded to [Datagrok](https://datagrok.ai)
, this script decides whether the BioSignals package should be added to the '*Algorithms*' list. Currently, the proposed
mechanism relies on column labels, however its functionality can be extended to draw insights from actual data.

### Types of auto-input

By design all the inputs could be split into three sub-types:

* **User input:** completely manual (for areas where no inferences from data can be made);
* **Auto suggest:** completely automated (input suggestions inferred from data);
* **Auto Limit:** automatically limit the options, given previous choices;

The pipeline can then be viewed as a branching decision tree, which offers and/or block certain paths depending on
retrieved metadata and the sequence of inputs.
