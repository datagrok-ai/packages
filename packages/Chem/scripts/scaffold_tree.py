#name: GenerateScaffoldTree
#description: generation scaffold tree from dataset
#language: python
#environment: channels: [conda-forge], dependencies: [python=3.8, rdkit, {pip: [ScaffoldGraphDG, networkx]}]
#input: dataframe data [Input data table]
#input: string smiles
#output: string result

import scaffoldgraph as sg
import networkx as nx
import json
from rdkit.Chem import MolToMolBlock, MolFromSmiles

#function that recursively adds child_nodes to hierarchies depending on the prev_scaffold value
def recurs_append_nodes(key, value, node, obj):
    if key in obj:
        if obj[key] == value:
            obj['child_nodes'].insert(0, node)
            return obj
    for k, v in obj.items():
        if type(v) == list:
            result = recurs_append_nodes(key, value, node, v[0])

# function that returns nodes of each scaffold
def find_nodes(tree, nodes, scaffold):
    scaffold_nodes = []
    for i in range(len(nodes)):
        predecessors = list(nx.bfs_tree(tree, nodes[i], reverse=True))
        if predecessors[1] == scaffold:
            scaffold_nodes.append(nodes[i])
    return scaffold_nodes

#function that returns the scaffold parent
def get_parent(tree, scaffold):
    return ''.join(tree.get_parent_scaffolds(scaffold, max_levels=1))


#function that returns the right order of scaffolds
def get_sorted_scaffolds(tree, nodes):
    result = []
    last = 0
    prev_node = nodes[0]
    result.append(prev_node)
    while len(nodes) != 1:
        prev_node = nodes[0]
        for i in range(1, len(nodes)):
            if prev_node in list(tree._get_scaffold_hierarchy(nodes[i])):
                if nodes[i] not in result:
                    result.append(nodes[i])
                prev_node = nodes[i]
                last = i
        nodes.remove(nodes[last])
    return result

#function that returns scaffold hierarchies
def get_hierarchies_list(tree, sorted_scaffolds):
    result = []
    for scaffold in sorted_scaffolds:
        result.append(tree.nodes[scaffold]['hierarchy'])
    return result

#function that returns mols
def get_mols(sorted_scaffolds):
    scaffolds = list(tree.get_scaffold_nodes(True))
    result = []
    for scaffold in sorted_scaffolds:
        for i in range(len(scaffolds)):
            if scaffolds[i][0] == scaffold:
                result.append(scaffolds[i][1]['realmolecule'])
    return result

#function that returns dict for each hierarchy depending on the input data
def get_hierarchy_dict(scaffold_str, smiles_str, child_nodes_list):
    hierarchy_dict = {
        'scaffold': scaffold_str,
        'smiles': smiles_str,
        'child_nodes': child_nodes_list
    }
    return hierarchy_dict

#function that returns first hierarchy scaffolds
def get_first_hierarchy(tree, scaffolds):
    first_hierarchy_scaffolds = []
    for scaffold in scaffolds:
        if scaffold[1]['hierarchy'] == 1:
            first_hierarchy_scaffolds.append(scaffold)
    return first_hierarchy_scaffolds

#function that returns the parent
def parent_lookup(scaffold, sorted_scaffolds, hierarchies):
    indx = sorted_scaffolds.index(scaffold)
    hierarchy = hierarchies[indx]
    parent = ''
    for i, e in reversed(list(enumerate(hierarchies[:indx+1]))):
        if e == hierarchy - 1:
            parent = sorted_scaffolds[i]
            break
    return parent

#function that returns the tree for first_hierarchy_scaffolds (if there are multiple mcs)
def get_tree(tree, scaffold_1):
    json_list = []
    scaffolds = []
    scaffolds.append(scaffold_1)
    scaffolds.extend(list(tree.get_child_scaffolds(scaffold_1)))
    sorted_scaffolds = get_sorted_scaffolds(tree, scaffolds)
    sorted_scaffolds_mols = get_mols(sorted_scaffolds)
    nodes = list(tree.get_molecule_nodes())
    hierarchies = get_hierarchies_list(tree, sorted_scaffolds)
    for i in range(0, len(sorted_scaffolds)):
        hierarchy_dict = get_hierarchy_dict(str(MolToMolBlock(sorted_scaffolds_mols[i], kekulize=False)), sorted_scaffolds[i], [])
        molecule_nodes = find_nodes(tree, nodes, sorted_scaffolds[i])
        for j in range(0, len(molecule_nodes)):
            hierarchy_dict['child_nodes'].append(get_hierarchy_dict(MolToMolBlock(MolFromSmiles(molecule_nodes[j])), molecule_nodes[j], []))
        if tree.nodes[sorted_scaffolds[i]]['hierarchy'] == 1:
            json_list.append(hierarchy_dict)
        else:
            parent = parent_lookup(sorted_scaffolds[i], sorted_scaffolds, hierarchies)
            recurs_append_nodes('smiles', parent, hierarchy_dict, json_list[0])
    return json_list[0]

#function to get the json representation
def get_json_representation(tree):
    scaffolds = list(tree.get_scaffold_nodes(True))
    first_scaffolds = get_first_hierarchy(tree, scaffolds)
    json_list = []
    for scaffold in first_scaffolds:
        json_list.append(get_tree(tree, scaffold[0]))
    return json_list

tree = sg.ScaffoldTree.from_dataframe(
    data, smiles_column=smiles, name_column=smiles, progress=True,
)

res = get_json_representation(tree)
json_result = json.dumps(res)
result = json_result.replace("\\n", "\n")