export function findShortestPath(map, fromNodeBiggId, toNodeBiggId) {
    // todo: add skipped paths for kth shortest path
    const reactionOrder = (coef) => coef > 0 ? 1 : -1;

    // create node oriented graph
    const graph = {};
    // the path should only be built between primary metabolites
    const primaryMetabolitBiggIds = new Set(Object.values(map.nodes).filter((node) => node.node_type === 'metabolite' && node.node_is_primary).map((node) => node.bigg_id));

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



export function findKthShortestPath(map, fromNodeBiggId, toNodeBiggId, k = 1) {
    const reactionOrder = (coef) => coef > 0 ? 1 : -1;
    //const primaryMetabolitBiggIds = new Set(Object.values(map.nodes).filter((node) => node.node_type === 'metabolite' && node.node_is_primary).map((node) => node.bigg_id));
    
    const graph = {};

    // Build the graph structure
    for (const reactionId in map.reactions) {
        const reaction = map.reactions[reactionId];
        for (const metabolite of reaction.metabolites) {
            if (metabolite.coefficient > 0 && !reaction.reversibility) continue;
            if (!graph[metabolite.bigg_id]) graph[metabolite.bigg_id] = {};
            const metaboliteReactionOrder = reactionOrder(metabolite.coefficient);
            reaction.metabolites.filter((met) => met.bigg_id !== metabolite.bigg_id && reactionOrder(met.coefficient) !== metaboliteReactionOrder
            // && primaryMetabolitBiggIds.has(met.bigg_id)
            ).forEach((met) => {
                graph[metabolite.bigg_id][met.bigg_id] = {coefficient: met.coefficient, reaction_id: reaction.reaction_id};
            });
        }
    }

    // Helper function for finding shortest path with Dijkstra's algorithm
    function dijkstra(fromNode, toNode) {
        const visited = {};
        const distance= {};
        const previous = {};

        Object.values(map.nodes).filter((node) => node.node_type == 'metabolite').forEach((node) => distance[node.bigg_id] = Infinity);
        distance[fromNode] = 0;
        const queue = [fromNode];

        while (queue.length > 0) {
            const node = queue.sort((a, b) => distance[a] - distance[b])[0];
            queue.splice(0, 1);
            if (visited[node]) continue;
            visited[node] = true;
            if (node === toNode) break;

            for (const neighbor in graph[node]) {
                const alt = distance[node] + 1;
                const curReaction = graph[node][neighbor].reaction_id;
                const curPath = getReactionPath(node);

                if (alt < distance[neighbor] && !curPath.includes(curReaction)) {
                    distance[neighbor] = alt;
                    previous[neighbor] = {met: node, reaction_id: graph[node][neighbor].reaction_id};
                    queue.push(neighbor);
                }
            }
        }

        // Reconstruct path

        function getReactionPath(node) {
            const path = [];
            let n = previous[node];
            while (n) {
                path.unshift(n.reaction_id);
                n = previous[n.met];
            }
            return path;
        }
        const path = [{met: toNodeBiggId, reaction_id: null}];
        let node = previous[toNode];
        while (node) {
            path.unshift(node);
            node = previous[node.met];
        }
        return { path, length: distance[toNode] };
    }

    // Initialize paths list with the first shortest path
    const paths = [];
    const { path: shortestPath, length: shortestLength } = dijkstra(fromNodeBiggId, toNodeBiggId);
    if (shortestPath.length === 0) return null; // No path found
    paths.push({ path: shortestPath, length: shortestLength });

    // Priority queue for candidate paths
    const candidates = [];

    for (let i = 1; i < k; i++) {
        const lastPath = paths[i - 1].path;
        
        for (let j = 0; j < lastPath.length - 1; j++) {
            const spurNode = lastPath[j].met;
            const rootPath = lastPath.slice(0, j);
            // Temporarily remove edges that overlap with the current path
            const removedEdges = [];
            for (const p of paths) {
                if (p.path.slice(0, j).every((step, idx) => step.met === rootPath[idx].met)){
                    const nextNode = p.path[j + 1].met;
                    if (graph[spurNode] && graph[spurNode][nextNode]) {
                        removedEdges.push([spurNode, nextNode, graph[spurNode][nextNode]]);
                        delete graph[spurNode][nextNode];
                    }
                }
            }
        
            const spurPath = dijkstra(spurNode, toNodeBiggId);
            if (spurPath.path.length > 0) {
                const totalPath = [...rootPath, ...spurPath.path];
                const totalLength = rootPath.length + spurPath.length;
                candidates.push({ path: totalPath, length: totalLength });
            }

            // Restore removed edges
            for (const [from, to, edgeData] of removedEdges) {
                graph[from][to] = edgeData;
            }
        }

        if (candidates.length === 0) break;

        // Sort candidates and add the shortest candidate path to paths
        candidates.sort((a, b) => a.length - b.length);

        const existingPathHashes = paths.map((p) => p.path.map((a) => `${a.met}-${a.reaction_id}`).join('-'));
        const bestCandidate = candidates.filter((can) => new Set(can.path.map(a => a.reaction_id)).size === can.path.length)
        .filter((can) => !existingPathHashes.includes(can.path.map((a) => `${a.met}-${a.reaction_id}`).join('-')))
        .shift();
        if (bestCandidate)
            paths.push(bestCandidate);
        else
            paths.push(paths[paths.length - 1]);


    }

    // Return the k-th shortest path if available
    return paths[k - 1] ? paths[k - 1].path : null;
}

export const pathSeparatorString = '-*-*-';

export function findOutGoing(map, nodeBiggId) {
    const reactionOrder = (coef) => coef > 0 ? 1 : -1;
    //const primaryMetabolitBiggIds = new Set(Object.values(map.nodes).filter((node) => node.node_type === 'metabolite' && node.node_is_primary).map((node) => node.bigg_id));
    
    const graph = {};

    // Build the graph structure
    for (const reactionId in map.reactions) {
        const reaction = map.reactions[reactionId];
        for (const metabolite of reaction.metabolites) {
            if (metabolite.coefficient > 0 && !reaction.reversibility) continue;
            if (!graph[metabolite.bigg_id]) graph[metabolite.bigg_id] = {};
            const metaboliteReactionOrder = reactionOrder(metabolite.coefficient);
            reaction.metabolites.filter((met) => met.bigg_id !== metabolite.bigg_id && reactionOrder(met.coefficient) !== metaboliteReactionOrder
            // && primaryMetabolitBiggIds.has(met.bigg_id)
            ).forEach((met) => {
                graph[metabolite.bigg_id][met.bigg_id] = {coefficient: met.coefficient, reaction_id: reaction.reaction_id};
            });
        }
    }
    const outGoings = new Set();
    for (const otherMet in graph[nodeBiggId] == null ? {} : graph[nodeBiggId]) {
        outGoings.add(`${graph[nodeBiggId][otherMet].reaction_id}${pathSeparatorString}${otherMet}`);
    }
    return Array.from(outGoings);
}

export function findInGoing(map, nodeBiggId) {

const reactionOrder = (coef) => coef > 0 ? 1 : -1;
    //const primaryMetabolitBiggIds = new Set(Object.values(map.nodes).filter((node) => node.node_type === 'metabolite' && node.node_is_primary).map((node) => node.bigg_id));
    
    const graph = {};

    // Build the graph structure
    for (const reactionId in map.reactions) {
        const reaction = map.reactions[reactionId];
        for (const metabolite of reaction.metabolites) {
            if (metabolite.coefficient > 0 && !reaction.reversibility) continue;
            if (!graph[metabolite.bigg_id]) graph[metabolite.bigg_id] = {};
            const metaboliteReactionOrder = reactionOrder(metabolite.coefficient);
            reaction.metabolites.filter((met) => met.bigg_id !== metabolite.bigg_id && reactionOrder(met.coefficient) !== metaboliteReactionOrder
            // && primaryMetabolitBiggIds.has(met.bigg_id)
            ).forEach((met) => {
                graph[metabolite.bigg_id][met.bigg_id] = {coefficient: met.coefficient, reaction_id: reaction.reaction_id};
            });
        }
    }
    const inGoing = new Set();
    
    
    for (const otherMet in graph) {
        if (!graph[otherMet][nodeBiggId]) continue;
        const reactionInfo = graph[otherMet][nodeBiggId];
        inGoing.add(`${reactionInfo.reaction_id}${pathSeparatorString}${otherMet}`);
    }
    return Array.from(inGoing);
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