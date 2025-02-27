import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { ANY_READOUT_CHOICE, ANY_RUN_CHOICE, CDD_SEARCH_TYPES, CDDVaultSearchType, IN_NOT_IN_COND_CHOICES, PROTOCOL_COND_CHOICES, PROTOCOL_RUN_COND_CHOICES, ProtocolCond, ProtocolRunCond } from './constants';
import { getProtocols, MoleculeFieldSearch, Protocol } from './cdd-vault-api';

type CDDSerachParams = {
    structure?: string;
    structure_search_type?: CDDVaultSearchType;
    structure_similarity_threshold?: number;
    protocol?: number;
    run?: number;
}

export class SeachEditor {

    vaultId;
    protocols: { [key: string]: Protocol } = {};
    currentProtocolRuns: { [key: string]: number } = {};
    protocolNames: string[] = [];

    protocolInNotIn: DG.InputBase = ui.input.choice('Search', { value: IN_NOT_IN_COND_CHOICES[0], items: IN_NOT_IN_COND_CHOICES });
    protocolCond: DG.InputBase = ui.input.choice('', { value: PROTOCOL_COND_CHOICES[0], items: PROTOCOL_COND_CHOICES, onValueChanged: () => {
        this.specificProtocolDiv.style.display = this.protocolCond.value === ProtocolCond.PROTOCOL ? 'flex' : 'none';
    } });

    specificProtocolDiv = ui.divV([]);
    protocolListChoice: DG.InputBase = ui.input.choice('', { value: '', items: [''] });
    protocolListChoiceDiv = ui.div('', 'cdd-protocol-list-input');

    runAndReadoutDiv = ui.divV([], { style: { display: 'none' } });

    runChoice: DG.InputBase = ui.input.choice('', {
        value: PROTOCOL_RUN_COND_CHOICES[0], items: PROTOCOL_RUN_COND_CHOICES, onValueChanged: () => {
            this.runListChoiceDiv.style.display = this.runChoice.value === ProtocolRunCond.SPECIFIC ? 'flex' : 'none';
        }
    });
    runListChoiceDiv = ui.div();
    runsListChoice: DG.InputBase = ui.input.choice('', { value: '', items: [''] });

    readoutChoice: DG.InputBase = ui.input.choice('', { value: ANY_READOUT_CHOICE, items: [ANY_READOUT_CHOICE] });
    readoutChoiceDiv = ui.div();
    readoutCondition: DG.InputBase = ui.input.string('');

    structureInput = ui.input.molecule('Structure');
    structureSearchTypeChoice = ui.input.choice('Search', {
        value: CDD_SEARCH_TYPES[0], items: CDD_SEARCH_TYPES, onValueChanged: () => {
            this.similarityThreshold.root.style.display = this.structureSearchTypeChoice.value === CDDVaultSearchType.SIMILARITY ? 'flex' : 'none';
        }
    });
    similarityThreshold = ui.input.float('', { value: 0.7, min: 0, max: 1, step: 0.05, showSlider: true });
    moleculeFieldsDiv = ui.divH([]);
    moleculesFields: MoleculeFieldSearch[] = [];
    plusIcon = ui.icons.add(() => { });

    accordion: DG.Accordion;


    constructor(vaultId: number) {
        this.vaultId = vaultId;
        this.accordion = ui.accordion(`cdd_vault_search_${this.vaultId}`);
        this.protocolInNotIn.classList.add('cdd-protocol-in-not-in-input');
        this.protocolCond.classList.add('cdd-protocol-cond-input');
        this.structureInput.classList.add('cdd-molecule-input');
        this.runListChoiceDiv.append(this.runsListChoice.root);
        this.runAndReadoutDiv.append(ui.divH([
            this.runChoice.root,
            this.runListChoiceDiv
        ], {style: {gap: '20px'}}));

        this.readoutChoiceDiv.append(this.readoutChoice.root);
        this.runAndReadoutDiv.append(ui.divH([
            this.readoutChoiceDiv,
            this.readoutCondition.root
        ], {style: {gap: '20px'}}));

        this.protocolListChoiceDiv.append(this.protocolListChoice.root);
        this.specificProtocolDiv.append(this.protocolListChoiceDiv);
        this.specificProtocolDiv.append(this.runAndReadoutDiv);

        this.accordion.addPane('Protocol', () => ui.divH([
            this.protocolInNotIn.root,
            this.protocolCond.root,
            this.specificProtocolDiv,
        ]));

        this.similarityThreshold.root.style.display = 'none';
        this.accordion.addPane('Structure', () => ui.divV([
            ui.divH([this.structureSearchTypeChoice.root, this.similarityThreshold.root], {style: {gap: '20px'}}),
            this.structureInput,
        ]));

        this.init();
    }

    async init() {
        const protocols = (await getProtocols(this.vaultId)).data?.objects;
        if (protocols && protocols.length) {
            protocols.forEach((it) => this.protocols[it.name] = it);
            this.protocolNames = Object.keys(this.protocols);
            //update the list of availabale protocols in choice input
            ui.empty(this.protocolListChoiceDiv);
            this.protocolListChoice = ui.input.choice('', {
                value: '', items: [''].concat(this.protocolNames), onValueChanged: () => {
                    this.runAndReadoutDiv.style.display = !this.protocolListChoice!.value ? 'none' : 'flex';
                    if (this.protocolListChoice!.value) {
                        this.updateReadoutDefinition(this.protocolListChoice!.value);
                        this.runChoice.value = ANY_RUN_CHOICE;
                        this.updateRuns(this.protocolListChoice!.value);
                    }
                }
            });
            this.protocolListChoiceDiv.append(this.protocolListChoice.root);
        }
    }

    updateReadoutDefinition(protocolName: string) {
        const readouts = this.protocols[protocolName].readout_definitions.map((it) => it.name);
        ui.empty(this.readoutChoiceDiv);
        this.readoutChoice = ui.input.choice('', {
            value: ANY_READOUT_CHOICE, items: [ANY_READOUT_CHOICE].concat(readouts), onValueChanged: () => {
                this.readoutCondition.root.style.display = this.readoutChoice.value === ANY_READOUT_CHOICE ? 'none' : 'flex';
            }
        });
        this.readoutCondition.root.style.display = 'none';
        this.readoutChoiceDiv.append(this.readoutChoice.root);
    }

    updateRuns(protocolName: string) {
        this.currentProtocolRuns = {};
        this.protocols[protocolName].runs.forEach((it) => this.currentProtocolRuns[`${it.run_date} (${it.person})`] = it.id );
        const runsNames = Object.keys(this.currentProtocolRuns);
        ui.empty(this.runListChoiceDiv);
        this.runsListChoice = ui.input.choice('', { value: runsNames.length ? runsNames[0] : '', items: runsNames});
        this.runListChoiceDiv.append(this.runsListChoice.root);
        this.runListChoiceDiv.style.display = 'none';
    }


    public getEditor(): HTMLElement {
        return this.accordion.root;
    }

    public getParams(): CDDSerachParams {
        return {
            structure: this.structureInput.value,
            structure_search_type: this.structureSearchTypeChoice.value ?? undefined,
            structure_similarity_threshold: this.similarityThreshold.value ?? undefined,
            protocol: this.protocolListChoice.value ? this.protocols[this.protocolListChoice.value].id : undefined,
            run: this.runChoice.value === ProtocolRunCond.SPECIFIC ? this.currentProtocolRuns[this.runsListChoice.value] : undefined,
        };
    }

}