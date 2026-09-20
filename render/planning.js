// ======================================
// FUTURE PLANNING SYSTEM
// ======================================



// import neuron search system
import {

    findNeuronById

} from "./search.js";



// import embedding similarity
import {

    similarity

} from "./embeddings.js";



// ======================================
// 📒 LEARNED TRAVERSAL EVIDENCE (READ-ONLY)
// ──────────────────────────────────────
// The canonical post-outcome boundary record
// (FutureScore V2.2 / V2.3). FutureScore is a
// READ-ONLY consumer: recordFor returns a COPY
// of { a, s } and this module never writes,
// so traversalRecord remains the sole owner
// and main.js remains its sole writer.
// ======================================

import {

    recordFor

} from "./traversalRecord.js";




// ======================================
// LOOK-AHEAD FUTURE THINKING
// ======================================

// predicts how good future paths are
export function lookAheadScore(

    startId,   // current neuron
    goalId,    // target neuron
    depth = 2  // how many steps ahead

) {

    // no goal → no prediction
    if (!goalId) return 0;



    // remembers visited neurons
    // prevents infinite loops
    const visited = new Set();




    // ======================================
    // DEPTH-FIRST SEARCH
    // ======================================

    function dfs(

        currentId, // current neuron
        d          // remaining depth

    ) {

        // no steps left
        if (d === 0) return 0;



        // find current neuron
        const neuron =
        findNeuronById(currentId);



        // find goal neuron
        const goalNeuron =
        findNeuronById(goalId);



        // invalid neurons
        if (!neuron || !goalNeuron) {

            return 0;

        }




        // ======================================
        // CURRENT SIMILARITY SCORE
        // ======================================

        // compare embeddings
        let best = similarity(

            neuron.userData.embedding,

            goalNeuron.userData.embedding

        );




        // mark current neuron visited
        visited.add(currentId);




        // ======================================
        // CHECK ALL FUTURE PATHS
        // ======================================

        neuron.userData.neighbors.forEach(nextId => {

            // avoid revisiting
            if (visited.has(nextId)) return;



            // recursive future search
            const future =
            dfs(nextId, d - 1);




            // combine current + future score
            // FIX: was future * 2 (recursive doubling — exponential explosion).
            // At depth=2, goal-adjacent node scored 4× raw similarity.
            // lookAheadScore feeds into futureScore which main.js already caps
            // at 20. The *2 multiplier is the root of the explosion so remove
            // it here — score accumulates naturally through the max() chain.
            best = Math.max(

                best,

                future * 1.0

            );

        });




        // allow reuse for other paths
        visited.delete(currentId);




        // return best future score
        return best;
    }




    // ======================================
    // START FUTURE EXPLORATION
    // ======================================

    return dfs(startId, depth);

}


// ======================================
// FUTURESCORE — GOAL-DIRECTED FUTURE PLANNING (V2.3)
// ======================================
// The frozen V2.3 contract. FutureScore is the agent's learned analogue of
// goal-directed environmental cost structure:
//
//   FS_H(k|g) = max over simple paths from k of [ SUM -c_hat(e) + T(end) ]
//
// with learned edge cost from post-outcome traversal evidence only:
//
//   c_hat(e) = (a + 1) / (s + 1)       a = attempts, s = successes,  c_hat >= 1
//
// and a structural terminal T(v) = -d(v, g), the physical-graph hop distance.
//
// WHAT IT MAY NOT READ (V2.3 F34-F40): rewards, penalties, curiosity, Q-values,
// the environment's hidden probabilities, any oracle quantity, decision-state
// history, RNG, the clock, instrumentation. Those channels are gone from the
// signature, not merely unused. Evaluation performs no mutation.
// ======================================


// planning horizon — a module constant, never a caller argument (V2.3 F15)
const H = 3;


// ======================================
// LEARNED EDGE COST
// ──────────────────────────────────────
// Additive smoothing of the attempts-per-success
// ratio (NOT a Bayesian posterior):
//
//   unseen   { a:0, s:0 } -> 1
//   success  { n, n }     -> 1
//   1 failure{ a:1, s:0 } -> 2
//   n fails  { a:n, s:0 } -> n + 1
//
// Success can never raise the cost; failure
// always raises it; the floor is 1.
// ======================================

function edgeCost(fromId, toId) {

    const evidence = recordFor(fromId, toId);

    return (evidence.a + 1) / (evidence.s + 1);

}


// ======================================
// PHYSICAL-GRAPH HOP DISTANCE
// ──────────────────────────────────────
// Module-private BFS over userData.neighbors
// ONLY. It deliberately does NOT reuse
// main.js goalDistance(), which augments the
// graph with learned `transitions` and is
// depth-limited: learned evidence may set edge
// COST, never graph TOPOLOGY.
//
// Not exported (the G9 successor pins this
// module's surface to futureScore +
// lookAheadScore).
// ======================================

function hopDistancesFrom(goalId) {

    const distance = new Map([[Number(goalId), 0]]);
    const queue = [Number(goalId)];

    while (queue.length > 0) {

        const current = queue.shift();
        const neuron = findNeuronById(current);
        const neighbors = (neuron && neuron.userData && neuron.userData.neighbors) || [];

        for (const raw of neighbors) {

            const next = Number(raw);

            if (!distance.has(next)) {
                distance.set(next, distance.get(current) + 1);
                queue.push(next);
            }

        }

    }

    return distance;   // absent key = unreachable = infinite distance

}


// calculates the best goal-directed future path value
export function futureScore(

    neuron,          // candidate neuron the path starts from
    goalNeuronId     // target goal

) {

    // no goal → FutureScore is undefined (V2.3 F19)
    if (goalNeuronId === null || goalNeuronId === undefined) return undefined;

    // no candidate → nothing to evaluate
    if (!neuron || !neuron.userData) return undefined;


    const start = Number(neuron.userData.id);
    const goal  = Number(goalNeuronId);


    // the candidate IS the goal (V2.3 F20)
    if (start === goal) return 0;


    // structural terminal: -d(v, g) over the physical graph
    const distance = hopDistancesFrom(goal);

    function terminal(nodeId) {

        return distance.has(nodeId)
            ? -distance.get(nodeId)
            : -Infinity;          // disconnected (V2.3 F19)

    }




    // ======================================
    // BOUNDED SIMPLE-PATH RECURSION
    // ──────────────────────────────────────
    //   F(v, h, P) = 0                      if v is the goal
    //              = -d(v)                  if h = 0, or every neighbour is
    //                                       already on the current path
    //              = max over w not in P of
    //                [ -c_hat(v,w) + F(w, h-1, P + {w}) ]
    //
    // P carries the nodes on the CURRENT path, seeded with the candidate, so a
    // path can never revisit a node. Neighbours are visited in the graph's own
    // deterministic order and the incumbent is replaced only on a STRICTLY
    // greater value, so ties keep the earliest neighbour and the result is
    // reproducible. No RNG, no clock, no mutation of anything outside this call.
    // ======================================

    function explore(currentId, remaining, path) {

        if (currentId === goal) return 0;


        const current = findNeuronById(currentId);

        const neighbors =
            (current && current.userData && current.userData.neighbors) || [];


        // neighbours not already on this path
        const open = [];

        for (const raw of neighbors) {

            const next = Number(raw);

            if (!path.has(next)) open.push(next);

        }


        // horizon reached, or nowhere to go without repeating a node
        if (remaining === 0 || open.length === 0) {

            return terminal(currentId);

        }


        let best = -Infinity;

        for (const next of open) {

            path.add(next);

            const value =
                -edgeCost(currentId, next) +
                explore(next, remaining - 1, path);

            path.delete(next);


            // strict comparison — the earliest neighbour wins a tie
            if (value > best) best = value;

        }

        return best;

    }




    // ======================================
    // START FUTURE SEARCH
    // ======================================

    return explore(start, H, new Set([start]));

}
