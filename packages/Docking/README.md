# Docking

The [Docking package](https://datagrok.ai/help/develop/develop#packages) 
is a plugin that integrates 
the [Autodock GPU](https://catalog.ngc.nvidia.com/orgs/hpc/containers/autodock) utility and [Boltz-1](https://github.com/jwohlwend/boltz/tree/main) model
with the [Datagrok](https://datagrok.ai) platform.

This package also provides a good example of Datagrok integration 
with external utilities.
You can find more in the 
[Datagrok Docker container howto](https://datagrok.ai/help/develop/how-to/docker_containers).

## AutoDock

[Autodock](https://autodock.scripps.edu/)
is widely used software for ligand-receptor docking 
that allows researchers to predict the binding interactions between small molecules (ligands) and macromolecule 
(receptor). 
The **Autodock-GPU** is a GPU-accelerated version of the Autodock software.

### How To

Setting up docking configurations can be challenging, but we've streamlined the process. Usually, someone familiar with the docking tool, like a cheminformatician, manages the complexity by identifying a pocket, preparing a configuration using the desktop Autodock application, naming it, and saving it on a server under the targets folder.

#### Prepare macromolecule (target)

Docking plugin contains several pre-created [targets](https://github.com/datagrok-ai/public/tree/master/packages/Docking/files/targets).
To add your own macromolecule to the list of targets,
prepare the macromolecule using 
[AutoDock tools](https://ccsb.scripps.edu/mgltools/downloads/).
You require the macromolecule in the `PDBQT` format 
and Autodock grid parameter file.
Review the Autodock tutorials
([first](https://www.chem.uwec.edu/chem491_w01/Chem491-Molecules%20and%20Medicine%202008/AutoDock%20Tutorial.pdf),
[second](https://omicstutorials.com/a-comprehensive-bioinformatics-tutorial-mastering-ligand-protein-docking-with-autodock/))
for the details.

Put these files in a folder under **System:AppData/Docking/targets**.
The folder make will be the name of your target in the Datagrok plugin UI.

**Atomic maps note:**

The autodock calculation fails if for a particular ligand 
corresponding atomic maps not available.
To run docking on a big ligand dataset, we suggest including all available atomic map types:
`A C HD N NA OA SA CL`.


#### Prepare data

Create or load a dataframe containing the ligands to be docked. 
For demonstration purposes, consider using the provided demo data located under 
**System:AppData/Docking/demo_files**.

#### Run docking

1. Navigate to Chem > Docking > Autodock. A dialog appears.
2. Configure the parameters:
   * `Ligands`: Specify the column within the provided dataframe that contains the small molecules to be docked.
   * `Target`: Choose the folder containing the docking configurations and the macromolecule for simulation.
   * `Conformations`: Define the number of conformations to search.
3. Run the calculations

**Performance note:** During the first run for a target Autodock calculates the 
macromolecule grids.
Grid calculation works on a single CPU core, so it can take about a minute.
Datagrok caches calculated grids, so subsequent runs with the same 
target will be much faster.

![docking simulations](help/docking-simulations.gif)

#### Analyze results

When the results are ready, you can:

1. **View docking poses**: The added column containing docking poses allows users to visualize the spatial orientation of each ligand within the binding pocket of the receptor.
2. **Check free energy**: The column with free energy numbers provides users with quantitative information about the stability of each ligand-receptor complex.
3. **Zoom to pocket**: By clicking on a pose, a Molstar viewer appears in the context panel. It automatically zooms to the binding pocket of interest, providing a closer look at the ligand-receptor interaction.
4. **Explore additional properties**: Calculated properties for the selected pose allow users to explore binding affinities, interaction energies, or other relevant information for detailed analysis.

![additional properties](help/additional-properties.gif)

## Boltz-1

[Boltz-1](https://github.com/jwohlwend/boltz/tree/main) is the state-of-the-art open-source model to predict biomolecular structures containing combinations of proteins, RNA, DNA, and other molecules. It also supports modified residues, covalent ligands and glycans, as well as conditioning the prediction on specified interaction pockets or contacts.

### How To

#### Prepare the configuration

The Docking plugin comes with several pre-configured [configurations](https://github.com/datagrok-ai/public/tree/master/packages/Docking/files/boltz). To add your own custom configuration, follow the [Boltz-1 setup instructions](https://github.com/jwohlwend/boltz/blob/main/docs/prediction.md).

Once you've prepared your configuration, place the files in a folder under **System:AppData/Docking/boltz**. The folder name will appear as the configuration name in the Datagrok plugin UI.

#### Run Folding

1. Navigate to **Bio > Folding > Boltz-1**. A dialog appears.
2. Configure the parameters:
   - `Table`: Select the table.
   - `Sequences`: Specify the column within the provided dataframe that contains sequences to be folded.
3. Run the calculations.

![boltz folding](help/boltz-folding.gif)

#### Run Docking

1. Navigate to Chem > Docking > Boltz-1. A dialog appears.
2. Configure the parameters:
   * `Table`: Select the table.
   * `Ligands`: Specify the column within the provided dataframe that contains the small molecules to be docked.
   * `Configuration`: Choose the folder containing the configurations.
3. Run the calculations.

![boltz docking](help/boltz-docking.gif)