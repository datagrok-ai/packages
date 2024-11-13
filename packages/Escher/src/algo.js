export function findShortestPath(map, fromNodeBiggId, toNodeBiggId) {
    // todo: add skipped paths for kth shortest path
    const reactionOrder = (coef) => coef > 0 ? 1 : -1;

    // create node oriented graph
    const graph = {};
    // the path should only be built between primary metabolites
    const primaryMetabolitBiggIds = new Set(Object.values(map.nodes).filter((node) => node.node_type === 'metabolite' && node.node_is_primary).map((node) => node.bigg_id));

    const biggIdToNodeId = {};

    for (const reactionId in map.reactions) {
        const reaction = map.reactions[reactionId];
        for (const metabolite of reaction.metabolites) {
            if (metabolite.coefficient > 0 && !reaction.reversibility) // only add forward or reversible reactions
                continue;
            if (!graph[metabolite.bigg_id]) {
                graph[metabolite.bigg_id] = {};
            }
            const metaboliteReactionOrder = reactionOrder(metabolite.coefficient);
            reaction.metabolites.filter((met) => met.bigg_id !== metabolite.bigg_id && reactionOrder(met.coefficient) !== metaboliteReactionOrder && primaryMetabolitBiggIds.has(met.bigg_id)).forEach((met) => {
                graph[metabolite.bigg_id][met.bigg_id] = {coefficient: met.coefficient, reaction_id: reaction.reaction_id, reaction_name: reaction.bigg_id};
            });
        }
    }

    // find shortest path using djikstra
    const visited = {};
    const distance = {};
    const previous = {};
    // initialize distances
    Object.values(map.nodes).filter((node) => node.node_type == 'metabolite').forEach((node) => distance[node.bigg_id] = Infinity);
    const queue = [fromNodeBiggId];

    distance[fromNodeBiggId] = 0;
    while (queue.length > 0) {
        const node = queue.sort((a, b) => distance[a] - distance[b])[0];
        queue.splice(0, 1);
        if (visited[node]) {
            continue;
        }
        visited[node] = true;
        if (node === toNodeBiggId) {
            break;
        }
        for (const neighbor in graph[node]) {
            const alt = distance[node] + 1; // TODO: use reaction weight later
            if (alt < distance[neighbor]) {
                distance[neighbor] = alt;
                previous[neighbor] = {met: node, reaction_id: graph[node][neighbor].reaction_id};
                queue.push(neighbor);
            }
        }
    }

    // reconstruct path
    const path = [{met: toNodeBiggId, reaction_id: null}];
    let node = previous[toNodeBiggId];

    while (node) {
        path.unshift(node);
        node = previous[node.met];
    }
    return path;
}


export function getReactionPathSegments(map, fromNodeBiggId, toNodeBiggId, reactionId) {
    const reaction = map.reactions[reactionId];
    if (!reaction) 
        return;

    const fromNode = Object.values(map.nodes).find((node) => node.bigg_id === fromNodeBiggId && node.connected_segments.map((seg) => seg.reaction_id).includes(reactionId));
    const toNode = Object.values(map.nodes).find((node) => node.bigg_id === toNodeBiggId && node.connected_segments.map((seg) => seg.reaction_id).includes(reactionId));
    const fromNodeId = fromNode ? fromNode.node_id : null;
    const toNodeId = toNode ? toNode.node_id : null;
    if (!fromNodeId || !toNodeId) {
        return;
    }

    // create graph
    const graph= {};
    for (const segmentId of Object.keys(reaction.segments)) {
        const segment = reaction.segments[segmentId];
        if (!graph[segment.from_node_id]) {
            graph[segment.from_node_id] = {};
        }
        if (!graph[segment.to_node_id]) {
            graph[segment.to_node_id] = {};
        }
        graph[segment.from_node_id][segment.to_node_id] = segmentId;
        graph[segment.to_node_id][segment.from_node_id] = segmentId;
    }

    // find shortest path using djikstra
    const visited= {};
    const distance= {};
    const previous = {};
    // initialize distances
    Object.keys(graph).forEach((nodeId) => distance[nodeId] = Infinity);
    distance[fromNodeId] = 0;
    const queue = [fromNodeId];
    while (queue.length > 0) {
        const nodeId = queue.sort((a, b) => distance[a] - distance[b])[0];
        queue.splice(0, 1);
        if (visited[nodeId]) {
            continue;
        }
        visited[nodeId] = true;
        if (nodeId === toNodeId) {
            break;
        }

        for (const neighborId of Object.keys(graph[nodeId])) {
            const alt = distance[nodeId] + 1;
            if (alt < distance[neighborId]) {
                distance[neighborId] = alt;
                previous[neighborId] = {nodeId, segmentId: graph[nodeId][neighborId]};
                queue.push(neighborId);
            }
        }
    }

    // reconstruct path
    const path = [];
    let node = {nodeId: toNodeId, segmentId: null};
    while (node) {
        path.unshift(node.segmentId);
        node = previous[node.nodeId];
    }
    return path.filter(Boolean);
}