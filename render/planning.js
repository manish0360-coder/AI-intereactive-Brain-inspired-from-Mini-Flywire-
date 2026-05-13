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
            best = Math.max(

                best,

                future * 2

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
// FUTURE CHAIN SCORING
// ======================================

// calculates best future path score
export function futureScore(

    neuron,          // current neuron
    goalNeuronId,    // target goal
    rewards,         // reward memory
    penalties,       // bad memories
    curiosityMap,    // exploration memory
    depth = 3        // future thinking depth

) {

    // invalid neuron
    if (!neuron) return 0;



    // remember visited neurons
    const visited = new Set();




    // ======================================
    // FUTURE SEARCH
    // ======================================

    function dfs(

        currentId,
        d

    ) {

        // no future steps left
        if (d <= 0) return 0;



        // find neuron
        const current =
        findNeuronById(currentId);




        // invalid neuron
        if (!current) return 0;




        // best score found
        let best = 0;




        // check all neighbors
        current.userData.neighbors.forEach(nextId => {

            // avoid loops
            if (visited.has(nextId)) return;




            // mark visited
            visited.add(nextId);




            // ======================================
            // MEMORY VALUES
            // ======================================

            // state-action key
            const key =
            currentId + "->" + nextId;




            // learned reward
            const reward =
            rewards.get(key) || 0;




            // learned penalty
            const penalty =
            penalties.get(key) || 0;




            // curiosity bonus
            const curiosity =
            curiosityMap.get(key) || 0;




            // future similarity score
            const future =
            lookAheadScore(

                nextId,
                goalNeuronId,
                2

            );




            // ======================================
            // COMBINE EVERYTHING
            // ======================================

            const total =

                reward * 1.5 -

                penalty * 2 +

                curiosity * 0.4 +

                future * 0.8;




            // keep best path
            if (total > best) {

                best = total;

            }




            // go deeper into future
            const deeper =
            dfs(nextId, d - 1);




            // deeper future bonus
            if (deeper > best) {

                best = deeper * 0.9;

            }




            // remove visited after branch ends
            visited.delete(nextId);

        });




        // return best future chain
        return best;
    }




    // ======================================
    // START FUTURE SEARCH
    // ======================================

    return dfs(

        neuron.id,
        depth

    );

}