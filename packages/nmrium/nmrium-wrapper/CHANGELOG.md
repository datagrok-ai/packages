# Changelog

## [1.0.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.9.0...v1.0.0) (2024-06-21)


### ⚠ BREAKING CHANGES

* update NMRium to pre release version 0.44.1-pre.1696502379
* update to nmrium version 0.31.0

### Features

* about 'NMRium wrapper' modal ([57e9934](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/57e9934f37fec697f2a1f973f653587466798e64))
* actions manager ([891cb18](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/891cb18fe6589b9f5ce8762ed299f41e5fc49de8))
* add 'chemotion.science.ru.nl' to whitelist ([a53a31a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a53a31a4a1e71c3f54424fe12d82e3b0248b887b))
* add release-please ([ea91dc6](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ea91dc62d153310f8434027711d0e5a8c6b4662d))
* allow any origin to pick up the message event ([439fe71](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/439fe7179943b28691f2c01f9960a74e1b3f9039))
* allow origins with IP addresses form ([8407f0d](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8407f0d510115ae169ced14c2b0b6341425838a1))
* auto processing 1d proton and carbon ([1764046](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1764046c8a12ddfc3ca3b78adb2f0449c0381175))
* create custom workspace for nmrXiv ([8fa127a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8fa127ab6cc9a0c5d2c61aedb83895905e831cd8))
* custom evens ([929cdeb](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/929cdebafd9a7fb0a928e1cb698252eb4b2fc2ec))
* customize NMRium Preferences and workspace using URL query string ([c51676f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/c51676f38e99ab9fe31c43def54abbdb06907467)), closes [#22](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/22)
* customize the NMRium default empty message ([acd1c87](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/acd1c878c912348bf4eeec216847d1aff8486a71)), closes [#125](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/125)
* deal with URL by default as .zip if the URL does not include the extension at the end ([a61fd5d](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a61fd5d0d5af05a7804964194b74e62791a7158c))
* enable offline mode ([f3c560c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f3c560c0a7aaadd39b1a623153a9d6d1031b6862)), closes [#118](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/118)
* enhance loadFromURLs ([f6d6ecf](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f6d6ecf04354eaef6838a8e956e486d74a8eed5f))
* enhance useLoadSpectraFromURL to look for files inside the zip files and upload the accepted files extensions ([0340db6](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/0340db652df0bde5125018a95f91b9a50bab6c95))
* ignored .dotfiles ([a689b26](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a689b26931d04504bbf2dbf3e640b099e97db684))
* implement action-request and action-repose events ([a77ea57](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a77ea57126d30473768b059ee2168e3e6042ac27))
* improve loading spectra ([cd55cbd](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/cd55cbdffa3ee852f6db9a07cad26eb016addb5e))
* load from bruker,jcamp,jeol from external url ([340692e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/340692e6f51c0dc807df8134d0a9662d80b908cd))
* load spectra from external URL ([12d6631](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/12d663187c637feb0db90a56ab6d922cda95e829))
* observable pattern ([2a37b61](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2a37b61f144dfec87ec847c32027181ae5326eff))
* prefer loading ft spectra and auto processing FID ([48a32e8](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/48a32e8474bce87c6a25bddde93faca114a23ef6))
* propagate error from the logger ([ed1e8d2](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ed1e8d22fce08e7518b90dc4c2e3234aea97a444))
* set spectra active tab ([ce73266](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ce732661b40d3245371d851ab23fc1ef0b67b5d2))
* setup playwright and react-router-dom ([4e0848f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/4e0848f93e26955507ff1c57da6dd0aa1a5cc947))
* setup project ([279f205](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/279f20508f876d8d41028ccd58fd5cc3f461a344))
* throw error message if pass wrong value to 'type' property ([b38529e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/b38529e7a1978a68600a97e8f98cb1c8034889b5))
* throw errors from nmrium using the error action ([6ca6c56](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6ca6c565ec2a84d394f1a0867e704883cae8dce6))
* triggering dataChange event when NMRium data Changed ([9639440](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9639440c92d5b7129124e432d68593815ddb3a98))
* update allow origin list ([#90](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/90)) ([635a2a3](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/635a2a35d0304d98ac7af22edb205e0aea18eef9))
* update nmrium pre-release version 0.33.0-pre.1677156813 ([63e8fe9](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/63e8fe97cf02d1f097489bb6ce87a4638c3b35e3))
* update nmrium to pre-release version 0.33.0-pre.1677504537 ([197b563](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/197b56358f301d2ff8db612ee5aea275a5ab04e0))
* update nmrium to pre-release version 0.34.0-pre.1683183916 ([2b6b79e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2b6b79e9a2dfcd643732cd02a5a528176c67076b))
* update nmrium to pre-release version 0.44.1-pre.1699958485 ([62b4c1e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/62b4c1e2c10d96f956a334bb6c321a22ceed8067))
* update nmrium to pre-release version 0.44.1-pre.1700591828 ([9dd6895](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9dd6895252089898609d5a78a85998eebc224446))
* update nmrium to pre-release version 0.45.1-pre.1701344673 ([914614e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/914614e12484e0d8247a9260ffc6bf1c4654793a))
* update NMRium to release 0.33.0-pre.1667755480 ([07a614c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/07a614cad8c457b6b08ed2b63f713fc5f8e10a65))
* update NMRium to version 0.40.1 ([bf527c3](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/bf527c3f6f5d467cf62bf124192fac691cccfb6a))
* update NMRium to version 0.42.0 ([5ef1354](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/5ef1354054d6567e714c51d483b1fd942c4fec07))
* update nmrium to version 0.46.0 ([d1647f2](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/d1647f27217346a7c9d9c765ec07cc4f5b4c97b8))
* update NMRium to version 0.46.1 ([2e609df](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2e609dff99ea36a2ce87997bfbc3aa51037246b9))
* update NMRium to version 0.49.0 ([90016da](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/90016dae428ea22fc032a89248e687f3bd2891f8))
* update NMRium to version 0.51.0 ([#197](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/197)) ([a9890ca](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a9890ca40854ed3237096aed6a3d9c55819e55f1))
* update NMRium to version 0.52.0 ([#201](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/201)) ([a630861](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a63086184e65d923075e1ee52e408f77bd6275f4))
* update NMRium to version 0.53.0 ([a8cb57f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a8cb57fae98cb9f30b3c247f484b99793034839e))
* update nmrium to version 0.54.0 ([5176c6a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/5176c6ae380e6f896c9f684619bdaa36572bd316))
* update nmrium to version 0.56.0 ([3c98670](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/3c9867004f6936bb88cef5299dce331d3e219ee1))
* update nmrXiv workspace ([ca9ff18](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ca9ff188a15728337aee3afff2d9304e9be10677)), closes [#170](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/170)
* update to nmrium pre-relase 0.33.0-pre.1674466111 ([30609da](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/30609da12934af55c36250bb7132678a86ad2a22))
* update to nmrium version 0.29 ([23dd7d0](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/23dd7d06b482eb4530655a24991a86a469456890))
* update to nmrium version 0.31.0 ([666086e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/666086ecc94d4838d531e2b315ca10d73ede1b3f))
* upgrade nmrium to pre-release version 0.44.1-pre.1694759092 ([ef1df7c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ef1df7cc1eecfbc7acc8d7e0ac2c315e3a0c2f01))
* upgrade NMRium to version 0.34.0 ([#71](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/71)) ([24f1caa](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/24f1caa731a01246a0338357d46d62fabfcf0860))
* upgrade NMRium to version 0.35.0 ([bec4d6b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/bec4d6b98fb9c69a34b77369340f8048372af111))
* upgrade NMRium to version 0.35.0 ([f9ef551](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f9ef551a775c3dc3d4ad8751489622b70463e9bc))
* upgrade NMrium to version 0.36.0 ([ccc62a0](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ccc62a005c408f7fd04de2a26f4348c5af2556aa))
* upgrade NMrium to version 0.39.0 ([1b08283](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1b08283e56d119a806e3f81407226ac8e19cfcdc))
* upgrade NMrium to version 0.39.0 ([3082777](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/3082777f70adbb714d87c0d4848b357c06c13ea9))
* upgrade NMrium to version 0.40.1 ([9116fdf](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9116fdffb17c5deadff971a53c3627a3fa3f911b))
* upgrade NMRium to version 0.43.0 ([e1e0172](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/e1e0172f7bfb30069f453d0f2662d3c7764fc866))


### Bug Fixes

* add description to dev build workflow ([f65cb7e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f65cb7e44018683e9b73b46d3c14481c8013714b))
* add dockerfile for dev ([a566798](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a56679875435fbbc77467d98b0bde8cad952540d))
* add needs cond for release ([b487847](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/b4878474431b3a19e6a8238571e66e353a30fc25))
* append subdomain prefix to 'nmrxiv.org' ([#86](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/86)) ([4dd8aec](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/4dd8aec9d4f7b332b85523c788166bf0ff586334))
* append subdomain prefix to 'nmrxiv.org' ([#86](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/86)) ([#87](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/87)) ([06ef1fa](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/06ef1fac042fd4877f7340e24a9a75bdc978661f))
* build esm and not cjs ([b20cf70](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/b20cf700cd423858e4d73a36200f56069e2fee45))
* group spectra and wait for promises ([9b41f7b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9b41f7b68a344c15da4cd6ed3089bb7df4eec8f0))
* load 2d spectra files ([d186ce7](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/d186ce71e76b9ad49ac78be2b99ee18db468bd49))
* load URL without  suffix extension in the file name ([d39871f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/d39871fd04695f995c30fc07305577444c2adc3b))
* load URLs that do not include an extension ([#92](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/92)) ([8ffe988](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8ffe988ec1aa6a8cc5bdb9e277fd492949ce169a))
* nmrium crash when 1d ft traces not found in 2d ([6e1097b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6e1097b875a4f9e1305fedaa017685f7b1e700c3))
* read gyromagnetic ratio correctly in nmrium ([37cb463](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/37cb463798e6c62591ff1c1c6ee580d3315c5546))
* rectify the release url ([8910c5d](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8910c5dbce79973a7c7ca6f7079f550c5d11fe96))
* refactor the data object to state ([dd1d69a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/dd1d69a2758d643c35c184debc90d391ca09f61f))
* remove duplicate e2e test run ([ceb7474](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ceb7474dc7253f7ada4363939185b8fbbf455b2e))
* removing prod deployment from github workflow ([40e083a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/40e083ae36a8a9163d0d94b63a24b8d5e31501ff))
* rename build workflow ([1977a3f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1977a3fc37dea75f79f692b5ff6a6af75e940851))
* run e2e test and linting before creating ([9c812ea](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9c812ea14f3e5f71dd20e4f7c6f9f6a93eb5473f))
* serialize spectra object ([6099d62](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6099d62f30f8d976b7516c1efb73bf3e36418bc5))
* Update allowed-origins.json ([038f346](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/038f34618e2eb6a63c62bd178b3386d80ed9d0cc))
* update build.yml file ([17a1d80](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/17a1d808248c0f3b92e25f9ce531a054dbcaf569))
* update build.yml file ([fd618fb](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/fd618fb4be64e60873e4286eb14e88c080ab522c))
* update img path ([3c20f68](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/3c20f68a510fc846e54359fad5048126ff81339e))
* update links in README.md ([5d7ee9c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/5d7ee9c08979d0fe52d3de343b178d260a8d6dca))
* update protocol in allowed origins ([c4ea663](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/c4ea6630b9400104815fd089cc76949a5fec2961))
* update readme ([9ba95bd](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9ba95bda53a848a83c247f6ce67058ff5c125789))
* update readme ([92fa33f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/92fa33f0bc638ebb51753d59b63e370ff5c643e6))
* update readme ([6cff3d9](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6cff3d927b53ab730c14baf4485f3f19a2040a80))
* update README.md with latest release ([0ebf262](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/0ebf262b9c6f9c85625480015a36f17387f708ce))
* update workflow comments and add e2e test ([05d5e62](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/05d5e627c7e69e555a6e8c35ab02289ede46e51f))
* versioning issue ([#207](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/207)) ([fdd7699](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/fdd7699a11579769014a0874f4073e747cc4fb9c))
* when load from external URL failed the loading screen does not disappear ([b84a96f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/b84a96f62c694d4c1b27d2cd5aee89d169e7beeb))


### Miscellaneous Chores

* update NMRium to pre release version 0.44.1-pre.1696502379 ([2c18bb2](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2c18bb226682041041db4328c95c530e088ac2db))

## [0.9.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.8.0...v0.9.0) (2024-03-26)


### Features

* update NMRium to version 0.53.0 ([a8cb57f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a8cb57fae98cb9f30b3c247f484b99793034839e))

## [0.8.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.7.0...v0.8.0) (2024-03-20)


### Features

* update NMRium to version 0.51.0 ([#197](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/197)) ([a9890ca](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a9890ca40854ed3237096aed6a3d9c55819e55f1))
* update NMRium to version 0.52.0 ([#201](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/201)) ([a630861](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a63086184e65d923075e1ee52e408f77bd6275f4))

## [0.7.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.6.0...v0.7.0) (2024-02-19)


### Features

* create custom workspace for nmrXiv ([8fa127a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8fa127ab6cc9a0c5d2c61aedb83895905e831cd8))
* propagate error from the logger ([ed1e8d2](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ed1e8d22fce08e7518b90dc4c2e3234aea97a444))
* set spectra active tab ([ce73266](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ce732661b40d3245371d851ab23fc1ef0b67b5d2))
* update NMRium to version 0.49.0 ([90016da](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/90016dae428ea22fc032a89248e687f3bd2891f8))
* update nmrXiv workspace ([ca9ff18](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ca9ff188a15728337aee3afff2d9304e9be10677)), closes [#170](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/170)


### Bug Fixes

* update protocol in allowed origins ([c4ea663](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/c4ea6630b9400104815fd089cc76949a5fec2961))

## [2.0.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v1.0.0...v2.0.0) (2023-12-20)


### ⚠ BREAKING CHANGES

* update NMRium to pre release version 0.44.1-pre.1696502379
* update to nmrium version 0.31.0

### Features

* about 'NMRium wrapper' modal ([57e9934](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/57e9934f37fec697f2a1f973f653587466798e64))
* actions manager ([891cb18](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/891cb18fe6589b9f5ce8762ed299f41e5fc49de8))
* add release-please ([ea91dc6](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ea91dc62d153310f8434027711d0e5a8c6b4662d))
* allow any origin to pick up the message event ([439fe71](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/439fe7179943b28691f2c01f9960a74e1b3f9039))
* allow origins with IP addresses form ([8407f0d](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8407f0d510115ae169ced14c2b0b6341425838a1))
* auto processing 1d proton and carbon ([1764046](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1764046c8a12ddfc3ca3b78adb2f0449c0381175))
* custom evens ([929cdeb](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/929cdebafd9a7fb0a928e1cb698252eb4b2fc2ec))
* customize NMRium Preferences and workspace using URL query string ([c51676f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/c51676f38e99ab9fe31c43def54abbdb06907467)), closes [#22](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/22)
* customize the NMRium default empty message ([acd1c87](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/acd1c878c912348bf4eeec216847d1aff8486a71)), closes [#125](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/125)
* deal with URL by default as .zip if the URL does not include the extension at the end ([a61fd5d](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a61fd5d0d5af05a7804964194b74e62791a7158c))
* enable offline mode ([f3c560c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f3c560c0a7aaadd39b1a623153a9d6d1031b6862)), closes [#118](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/118)
* enhance loadFromURLs ([f6d6ecf](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f6d6ecf04354eaef6838a8e956e486d74a8eed5f))
* enhance useLoadSpectraFromURL to look for files inside the zip files and upload the accepted files extensions ([0340db6](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/0340db652df0bde5125018a95f91b9a50bab6c95))
* ignored .dotfiles ([a689b26](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a689b26931d04504bbf2dbf3e640b099e97db684))
* implement action-request and action-repose events ([a77ea57](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a77ea57126d30473768b059ee2168e3e6042ac27))
* improve loading spectra ([cd55cbd](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/cd55cbdffa3ee852f6db9a07cad26eb016addb5e))
* load from bruker,jcamp,jeol from external url ([340692e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/340692e6f51c0dc807df8134d0a9662d80b908cd))
* load spectra from external URL ([12d6631](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/12d663187c637feb0db90a56ab6d922cda95e829))
* observable pattern ([2a37b61](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2a37b61f144dfec87ec847c32027181ae5326eff))
* prefer loading ft spectra and auto processing FID ([48a32e8](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/48a32e8474bce87c6a25bddde93faca114a23ef6))
* setup playwright and react-router-dom ([4e0848f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/4e0848f93e26955507ff1c57da6dd0aa1a5cc947))
* setup project ([279f205](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/279f20508f876d8d41028ccd58fd5cc3f461a344))
* throw error message if pass wrong value to 'type' property ([b38529e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/b38529e7a1978a68600a97e8f98cb1c8034889b5))
* throw errors from nmrium using the error action ([6ca6c56](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6ca6c565ec2a84d394f1a0867e704883cae8dce6))
* triggering dataChange event when NMRium data Changed ([9639440](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9639440c92d5b7129124e432d68593815ddb3a98))
* update allow origin list ([#90](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/90)) ([635a2a3](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/635a2a35d0304d98ac7af22edb205e0aea18eef9))
* update nmrium pre-release version 0.33.0-pre.1677156813 ([63e8fe9](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/63e8fe97cf02d1f097489bb6ce87a4638c3b35e3))
* update nmrium to pre-release version 0.33.0-pre.1677504537 ([197b563](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/197b56358f301d2ff8db612ee5aea275a5ab04e0))
* update nmrium to pre-release version 0.34.0-pre.1683183916 ([2b6b79e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2b6b79e9a2dfcd643732cd02a5a528176c67076b))
* update nmrium to pre-release version 0.44.1-pre.1699958485 ([62b4c1e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/62b4c1e2c10d96f956a334bb6c321a22ceed8067))
* update nmrium to pre-release version 0.44.1-pre.1700591828 ([9dd6895](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9dd6895252089898609d5a78a85998eebc224446))
* update nmrium to pre-release version 0.45.1-pre.1701344673 ([914614e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/914614e12484e0d8247a9260ffc6bf1c4654793a))
* update NMRium to release 0.33.0-pre.1667755480 ([07a614c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/07a614cad8c457b6b08ed2b63f713fc5f8e10a65))
* update NMRium to version 0.40.1 ([bf527c3](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/bf527c3f6f5d467cf62bf124192fac691cccfb6a))
* update NMRium to version 0.42.0 ([5ef1354](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/5ef1354054d6567e714c51d483b1fd942c4fec07))
* update nmrium to version 0.46.0 ([d1647f2](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/d1647f27217346a7c9d9c765ec07cc4f5b4c97b8))
* update NMRium to version 0.46.1 ([2e609df](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2e609dff99ea36a2ce87997bfbc3aa51037246b9))
* update to nmrium pre-relase 0.33.0-pre.1674466111 ([30609da](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/30609da12934af55c36250bb7132678a86ad2a22))
* update to nmrium version 0.29 ([23dd7d0](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/23dd7d06b482eb4530655a24991a86a469456890))
* update to nmrium version 0.31.0 ([666086e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/666086ecc94d4838d531e2b315ca10d73ede1b3f))
* upgrade nmrium to pre-release version 0.44.1-pre.1694759092 ([ef1df7c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ef1df7cc1eecfbc7acc8d7e0ac2c315e3a0c2f01))
* upgrade NMRium to version 0.34.0 ([#71](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/71)) ([24f1caa](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/24f1caa731a01246a0338357d46d62fabfcf0860))
* upgrade NMRium to version 0.35.0 ([bec4d6b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/bec4d6b98fb9c69a34b77369340f8048372af111))
* upgrade NMRium to version 0.35.0 ([f9ef551](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f9ef551a775c3dc3d4ad8751489622b70463e9bc))
* upgrade NMrium to version 0.36.0 ([ccc62a0](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ccc62a005c408f7fd04de2a26f4348c5af2556aa))
* upgrade NMrium to version 0.39.0 ([1b08283](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1b08283e56d119a806e3f81407226ac8e19cfcdc))
* upgrade NMrium to version 0.39.0 ([3082777](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/3082777f70adbb714d87c0d4848b357c06c13ea9))
* upgrade NMrium to version 0.40.1 ([9116fdf](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9116fdffb17c5deadff971a53c3627a3fa3f911b))
* upgrade NMRium to version 0.43.0 ([e1e0172](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/e1e0172f7bfb30069f453d0f2662d3c7764fc866))


### Bug Fixes

* add description to dev build workflow ([f65cb7e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f65cb7e44018683e9b73b46d3c14481c8013714b))
* add dockerfile for dev ([a566798](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/a56679875435fbbc77467d98b0bde8cad952540d))
* add needs cond for release ([b487847](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/b4878474431b3a19e6a8238571e66e353a30fc25))
* append subdomain prefix to 'nmrxiv.org' ([#86](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/86)) ([4dd8aec](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/4dd8aec9d4f7b332b85523c788166bf0ff586334))
* append subdomain prefix to 'nmrxiv.org' ([#86](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/86)) ([#87](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/87)) ([06ef1fa](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/06ef1fac042fd4877f7340e24a9a75bdc978661f))
* build esm and not cjs ([b20cf70](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/b20cf700cd423858e4d73a36200f56069e2fee45))
* group spectra and wait for promises ([9b41f7b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9b41f7b68a344c15da4cd6ed3089bb7df4eec8f0))
* load 2d spectra files ([d186ce7](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/d186ce71e76b9ad49ac78be2b99ee18db468bd49))
* load URL without  suffix extension in the file name ([d39871f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/d39871fd04695f995c30fc07305577444c2adc3b))
* load URLs that do not include an extension ([#92](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/92)) ([8ffe988](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8ffe988ec1aa6a8cc5bdb9e277fd492949ce169a))
* nmrium crash when 1d ft traces not found in 2d ([6e1097b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6e1097b875a4f9e1305fedaa017685f7b1e700c3))
* read gyromagnetic ratio correctly in nmrium ([37cb463](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/37cb463798e6c62591ff1c1c6ee580d3315c5546))
* rectify the release url ([8910c5d](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8910c5dbce79973a7c7ca6f7079f550c5d11fe96))
* refactor the data object to state ([dd1d69a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/dd1d69a2758d643c35c184debc90d391ca09f61f))
* remove duplicate e2e test run ([ceb7474](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ceb7474dc7253f7ada4363939185b8fbbf455b2e))
* removing prod deployment from github workflow ([40e083a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/40e083ae36a8a9163d0d94b63a24b8d5e31501ff))
* rename build workflow ([1977a3f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1977a3fc37dea75f79f692b5ff6a6af75e940851))
* run e2e test and linting before creating ([9c812ea](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9c812ea14f3e5f71dd20e4f7c6f9f6a93eb5473f))
* serialize spectra object ([6099d62](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6099d62f30f8d976b7516c1efb73bf3e36418bc5))
* Update allowed-origins.json ([038f346](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/038f34618e2eb6a63c62bd178b3386d80ed9d0cc))
* update build.yml file ([17a1d80](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/17a1d808248c0f3b92e25f9ce531a054dbcaf569))
* update build.yml file ([fd618fb](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/fd618fb4be64e60873e4286eb14e88c080ab522c))
* update img path ([3c20f68](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/3c20f68a510fc846e54359fad5048126ff81339e))
* update links in README.md ([5d7ee9c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/5d7ee9c08979d0fe52d3de343b178d260a8d6dca))
* update readme ([9ba95bd](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9ba95bda53a848a83c247f6ce67058ff5c125789))
* update readme ([92fa33f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/92fa33f0bc638ebb51753d59b63e370ff5c643e6))
* update readme ([6cff3d9](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6cff3d927b53ab730c14baf4485f3f19a2040a80))
* update README.md with latest release ([0ebf262](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/0ebf262b9c6f9c85625480015a36f17387f708ce))
* update workflow comments and add e2e test ([05d5e62](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/05d5e627c7e69e555a6e8c35ab02289ede46e51f))
* when load from external URL failed the loading screen does not disappear ([b84a96f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/b84a96f62c694d4c1b27d2cd5aee89d169e7beeb))


### Miscellaneous Chores

* update NMRium to pre release version 0.44.1-pre.1696502379 ([2c18bb2](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2c18bb226682041041db4328c95c530e088ac2db))

## [1.0.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.4.0...v1.0.0) (2023-10-19)


### ⚠ BREAKING CHANGES

* update NMRium to pre release version 0.44.1-pre.1696502379

### Features

* about 'NMRium wrapper' modal ([57e9934](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/57e9934f37fec697f2a1f973f653587466798e64))
* auto processing 1d proton and carbon ([1764046](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1764046c8a12ddfc3ca3b78adb2f0449c0381175))
* customize the NMRium default empty message ([acd1c87](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/acd1c878c912348bf4eeec216847d1aff8486a71)), closes [#125](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/125)
* enable offline mode ([f3c560c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f3c560c0a7aaadd39b1a623153a9d6d1031b6862)), closes [#118](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/118)
* update NMRium to version 0.42.0 ([5ef1354](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/5ef1354054d6567e714c51d483b1fd942c4fec07))
* upgrade nmrium to pre-release version 0.44.1-pre.1694759092 ([ef1df7c](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ef1df7cc1eecfbc7acc8d7e0ac2c315e3a0c2f01))
* upgrade NMRium to version 0.43.0 ([e1e0172](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/e1e0172f7bfb30069f453d0f2662d3c7764fc866))


### Bug Fixes

* nmrium crash when 1d ft traces not found in 2d ([6e1097b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6e1097b875a4f9e1305fedaa017685f7b1e700c3))
* update img path ([3c20f68](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/3c20f68a510fc846e54359fad5048126ff81339e))


### Miscellaneous Chores

* update NMRium to pre release version 0.44.1-pre.1696502379 ([2c18bb2](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2c18bb226682041041db4328c95c530e088ac2db))

## [0.4.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.3.0...v0.4.0) (2023-07-26)


### Features

* update allow origin list ([#90](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/90)) ([635a2a3](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/635a2a35d0304d98ac7af22edb205e0aea18eef9))
* update nmrium to pre-release version 0.34.0-pre.1683183916 ([2b6b79e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2b6b79e9a2dfcd643732cd02a5a528176c67076b))
* update NMRium to version 0.40.1 ([bf527c3](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/bf527c3f6f5d467cf62bf124192fac691cccfb6a))
* upgrade NMRium to version 0.35.0 ([bec4d6b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/bec4d6b98fb9c69a34b77369340f8048372af111))
* upgrade NMRium to version 0.35.0 ([f9ef551](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f9ef551a775c3dc3d4ad8751489622b70463e9bc))
* upgrade NMrium to version 0.36.0 ([ccc62a0](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ccc62a005c408f7fd04de2a26f4348c5af2556aa))
* upgrade NMrium to version 0.39.0 ([1b08283](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1b08283e56d119a806e3f81407226ac8e19cfcdc))
* upgrade NMrium to version 0.39.0 ([3082777](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/3082777f70adbb714d87c0d4848b357c06c13ea9))
* upgrade NMrium to version 0.40.1 ([9116fdf](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9116fdffb17c5deadff971a53c3627a3fa3f911b))


### Bug Fixes

* append subdomain prefix to 'nmrxiv.org' ([#86](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/86)) ([4dd8aec](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/4dd8aec9d4f7b332b85523c788166bf0ff586334))
* append subdomain prefix to 'nmrxiv.org' ([#86](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/86)) ([#87](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/87)) ([06ef1fa](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/06ef1fac042fd4877f7340e24a9a75bdc978661f))
* load 2d spectra files ([d186ce7](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/d186ce71e76b9ad49ac78be2b99ee18db468bd49))
* load URLs that do not include an extension ([#92](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/92)) ([8ffe988](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8ffe988ec1aa6a8cc5bdb9e277fd492949ce169a))
* refactor the data object to state ([dd1d69a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/dd1d69a2758d643c35c184debc90d391ca09f61f))
* Update allowed-origins.json ([038f346](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/038f34618e2eb6a63c62bd178b3386d80ed9d0cc))

## [0.3.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.2.1...v0.3.0) (2023-05-22)


### Features

* update allow origin list ([#90](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/90)) ([635a2a3](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/635a2a35d0304d98ac7af22edb205e0aea18eef9))
* update nmrium to pre-release version 0.34.0-pre.1683183916 ([2b6b79e](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/2b6b79e9a2dfcd643732cd02a5a528176c67076b))
* upgrade NMRium to version 0.35.0 ([bec4d6b](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/bec4d6b98fb9c69a34b77369340f8048372af111))
* upgrade NMRium to version 0.35.0 ([f9ef551](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/f9ef551a775c3dc3d4ad8751489622b70463e9bc))
* upgrade NMrium to version 0.36.0 ([ccc62a0](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ccc62a005c408f7fd04de2a26f4348c5af2556aa))


### Bug Fixes

* append subdomain prefix to 'nmrxiv.org' ([#86](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/86)) ([4dd8aec](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/4dd8aec9d4f7b332b85523c788166bf0ff586334))
* append subdomain prefix to 'nmrxiv.org' ([#86](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/86)) ([#87](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/87)) ([06ef1fa](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/06ef1fac042fd4877f7340e24a9a75bdc978661f))
* load URLs that do not include an extension ([#92](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/92)) ([8ffe988](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/8ffe988ec1aa6a8cc5bdb9e277fd492949ce169a))
* refactor the data object to state ([dd1d69a](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/dd1d69a2758d643c35c184debc90d391ca09f61f))

## [0.2.1](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.2.0...v0.2.1) (2023-04-04)


### Bug Fixes

* remove duplicate e2e test run ([ceb7474](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/ceb7474dc7253f7ada4363939185b8fbbf455b2e))
* update readme ([9ba95bd](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/9ba95bda53a848a83c247f6ce67058ff5c125789))
* update readme ([92fa33f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/92fa33f0bc638ebb51753d59b63e370ff5c643e6))
* update readme ([6cff3d9](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/6cff3d927b53ab730c14baf4485f3f19a2040a80))
* update README.md with latest release ([0ebf262](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/0ebf262b9c6f9c85625480015a36f17387f708ce))

## [0.2.0](https://github.com/NFDI4Chem/nmrium-react-wrapper/compare/v0.1.0...v0.2.0) (2023-03-30)


### Features

* upgrade NMRium to version 0.34.0 ([#71](https://github.com/NFDI4Chem/nmrium-react-wrapper/issues/71)) ([24f1caa](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/24f1caa731a01246a0338357d46d62fabfcf0860))


### Bug Fixes

* rename build workflow ([1977a3f](https://github.com/NFDI4Chem/nmrium-react-wrapper/commit/1977a3fc37dea75f79f692b5ff6a6af75e940851))
