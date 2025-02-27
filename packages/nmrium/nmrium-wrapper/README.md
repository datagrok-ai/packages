# NMRium React Wrapper 
[![License](https://img.shields.io/badge/License-MIT%202.0-blue.svg)](https://opensource.org/licenses/MIT)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-blue.svg)](https://github.com/NFDI4Chem/nmrium-react-wrapper/graphs/commit-activity)
[![GitHub issues](https://img.shields.io/github/issues/NFDI4Chem/nmrium-react-wrapper.svg)](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues)
[![GitHub contributors](https://img.shields.io/github/contributors/NFDI4Chem/nmrium-react-wrapper.svg)](https://GitHub.com/NFDI4Chem/nmrium-react-wrapper/graphs/contributors/)
![Workflow](https://github.com/NFDI4Chem/nmrium-react-wrapper/actions/workflows/dev-build.yml/badge.svg)

NMRium is a powerful tool for displaying and processing nuclear magnetic resonance (NMR) spectra. Based on the popular web framework React, NMRium is distributed as a react component which can be used as a standalone or embedded in an react web-application. 

To further enable integration in other applications developed with modern frameworks, the nmrium-react-wrapper project enables an iframe-based integration of NMRium into third-party applications built on any modern frameworks.

## Usage

### Links

#### Production:

[https://nmrium.nmrxiv.org](https://nmrium.nmrxiv.org) (currently - [v0.8.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.8.0))

#### Development:

[https://nmriumdev.nmrxiv.org](https://nmriumdev.nmrxiv.org) (latest)

#### For older/specific versions

[https://nmrium.nmrxiv.org/v0.8.0](https://nmrium.nmrxiv.org/v0.8.0) -> [v0.8.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.8.0)

[https://nmrium.nmrxiv.org/v0.7.0](https://nmrium.nmrxiv.org/v0.7.0) -> [v0.7.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.7.0)

[https://nmrium.nmrxiv.org/v0.6.0](https://nmrium.nmrxiv.org/v0.6.0) -> [v0.6.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.6.0)

[https://nmrium.nmrxiv.org/v0.5.0](https://nmrium.nmrxiv.org/v0.5.0) -> [v0.5.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.5.0)

[https://nmrium.nmrxiv.org/v0.4.0](https://nmrium.nmrxiv.org/v0.4.0) -> [v0.4.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.4.0)

[https://nmrium.nmrxiv.org/v0.3.0](https://nmrium.nmrxiv.org/v0.3.0) -> [v0.3.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.3.0)

[https://nmrium.nmrxiv.org/v0.2.0](https://nmrium.nmrxiv.org/v0.2.0) -> [v0.2.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.2.0)

[https://nmrium.nmrxiv.org/v0.1.0](https://nmrium.nmrxiv.org/v0.1.0) -> [v0.1.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.1.0)

### Docker Hub
Containerized using Docker and is distributed publicly via the [Docker Hub](https://hub.docker.com/r/nfdi4chem/nmrium-react-wrapper).


Please refer to Docker tags corresponding to the version of the NMRium React Wrapper releases.


Link to Docker Hub - https://hub.docker.com/r/nfdi4chem/nmrium-react-wrapper

### Kubernetes and Helm Charts
NMRium React Wrapper comes packaged with a [Helm chart](https://helm.sh/docs/), that makes it easy to deploy and manage (scale) containers on [Kubernetes](https://kubernetes.io/docs/home/) via a convenient package manager interface.

Link to Helm Chart repo - https://github.com/NFDI4Chem/repo-helm-charts/tree/main/charts/nmrium

### Embed

```
<iframe href='https://nmriumdev.nmrxiv.org' height="500" width="100%"></iframe>

# Workspaces

# Simple NMR analysis
<iframe href='https://nmriumdev.nmrxiv.org?workspace=default' height="500" width="100%"></iframe>

# NMR spectra assignment
<iframe href='https://nmriumdev.nmrxiv.org?workspace=assignment' height="500" width="100%"></iframe>

# 1D multiple spectra analysis
<iframe href='https://nmriumdev.nmrxiv.org?workspace=process1D' height="500" width="100%"></iframe>

```

## Public Instance

NFDI4Chem - Jena offers a public instance of the nmrium wrapper for third-party applications to integrate into their interface without deploying an instance. Applications can then communicate with the NMRium via our standardised communication events and offer seamless integration. NOTE: None of the data (loaded and processed with NMRium on the public instance) will not reach our servers. Data will never reach the backend server hosting the applications, so there are no privacy concerns. 

To use the public instance in your application, you need to whitelist your domain (local development doesnt need whitelisting).

To get whitelisted, provide the following details via email or raise a GitHub issue.

* Domain:
* Organisation:
* Contact person (Name/Email):
* Usage details (Optional):

Emailing: info.nmrxiv@uni-jena.de or helpdesk@nfdi4chem.de

Raise an issue on GitHub - https://github.com/NFDI4Chem/nmrium-react-wrapper/issues

## [Wiki](https://github.com/NFDI4Chem/nmrium-react-wrapper/wiki)
- [Development](https://github.com/NFDI4Chem/nmrium-react-wrapper/wiki/2.-Installation)
- [Wrapper Events](https://github.com/NFDI4Chem/nmrium-react-wrapper/wiki/3.-Wrapper-Events)
- [Contribution](https://github.com/NFDI4Chem/nmrium-react-wrapper/wiki/5.-Contribution)
- [Deployment](https://github.com/NFDI4Chem/nmrium-react-wrapper/wiki/4.-CI-CD)

## Versions

| NMRium React Wrapper Version | NMRium Version | NMRium Data Schema Version | Migration Script |
|:----           |:---                          | :----                        | :----            |
|        [Latest-stable](https://github.com/NFDI4Chem/nmrium-react-wrapper/releases/tag/v0.9.0)           |     [v0.56.0](https://github.com/cheminfo/nmrium/releases/tag/v0.56.0)    |      [v4](/public/data/Data%20Schema%20Versions/V4/)                  |   [Migration script](https://github.com/cheminfo/nmr-load-save/blob/master/src/migration/migrateToVersion3.ts) |


## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/NFDI4Chem/nmrium-react-wrapper/blob/main/LICENSE) file for details

## Maintained by
[NMRium React Wrapper](https://nmrium.nmrxiv.org) is developed and maintained by the [NFDI4Chem partners](https://www.nfdi4chem.de/) at the [Friedrich Schiller University](https://www.uni-jena.de/en/) Jena, Germany. 
The code for this web application is released under the [MIT license](https://opensource.org/licenses/MIT).


<p align="left"><a href="https://nfdi4chem.de/" target="_blank"><img src="https://www.nfdi4chem.de/wp-content/themes/wptheme/assets/img/logo.svg" width="50%" alt="NFDI4Chem Logo"></a></p>

## Acknowledgments

Funded by the [Deutsche Forschungsgemeinschaft (DFG, German Research Foundation)](https://www.dfg.de/) under the [National Research Data Infrastructure – NFDI4Chem](https://nfdi4chem.de/) – Projektnummer **441958208**.

<p align="left"><a href="https://www.dfg.de/" target="_blank"><img src="./public/img/dfg_logo_schriftzug_blau_foerderung_en.gif" width="50%" alt="DFG Logo"></a></p>
