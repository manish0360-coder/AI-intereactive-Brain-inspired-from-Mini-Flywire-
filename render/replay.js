// ======================================
// EPISODIC REPLAY SYSTEM
// ======================================

// brain replays old successful memories
// like dreaming during sleep




// neuron search
import {

    findNeuronById

} from "./search.js";




// Q-learning system
import {

    getQ,
    setQ

} from "./qlearning.js";




// embedding training
import {

    trainEmbedding

} from "./embeddings.js";




// ======================================
// REPLAY MEMORY REFERENCES
// ======================================

// successful episodes
let episodesRef = [];



// neuron database
let neuronMapRef = null;



// transition memory
let transitionsRef = null;



// reward memory
let rewardsRef = null;




// ======================================
// CONNECT MEMORIES FROM MAIN.JS
// ======================================

export function setReplayMemory({

    episodes,
    neuronMap,
    transitions,
    rewards

}) {

    episodesRef = episodes;

    neuronMapRef = neuronMap;

    transitionsRef = transitions;

    rewardsRef = rewards;

}




// ======================================
// REPLAY OLD SUCCESSFUL MEMORIES
// ======================================

export function replayEpisodes() {

    // no memories yet
    if (episodesRef.length === 0) return;




    // ======================================
    // PICK RANDOM SUCCESSFUL MEMORY
    // ======================================

    const ep =

        episodesRef[

            Math.floor(

                Math.random() *
                episodesRef.length

            )

        ];




    // too short
    if (ep.length < 2) return;




    // ======================================
    // SKIP BORING LOOPS
    // ======================================

    const uniqueSteps =
    new Set(ep);




    // ignore boring replay
    if (uniqueSteps.size <= 2) {

        console.log(
            "🚫 boring replay skipped"
        );

        return;
    }




    console.log(

        "🧠 Replaying episode:",

        ep.join(" -> ")

    );




    // ======================================
    // REPLAY EVERY STEP
    // ======================================

    for (

        let i = 0;

        i < ep.length - 1;

        i++

    ) {

        // current word
        const fromLabel = ep[i];



        // next word
        const toLabel = ep[i + 1];



        let fromId = null;
        let toId = null;




        // ======================================
        // FIND NEURON IDS
        // ======================================

        neuronMapRef.forEach((n, id) => {

            if (

                n.userData.label ===
                fromLabel

            ) {

                fromId = id;

            }



            if (

                n.userData.label ===
                toLabel

            ) {

                toId = id;

            }

        });




        // invalid neurons
        if (

            fromId == null ||
            toId == null

        ) continue;




        // ======================================
        // STRENGTHEN TRANSITIONS
        // ======================================

        const map =

            transitionsRef.get(fromId)

            || new Map();




        map.set(

            toId,

            (map.get(toId) || 0) + 0.5

        );




        transitionsRef.set(

            fromId,
            map

        );




        // ======================================
        // STRENGTHEN REWARDS
        // ======================================

        const key =

            fromId + "->" + toId;




        rewardsRef.set(

            key,

            (rewardsRef.get(key) || 0)

            + 0.2

        );




        // ======================================
        // STRENGTHEN Q LEARNING
        // ======================================

        const oldQ =

            getQ(fromId, toId);




        setQ(

            fromId,
            toId,

            oldQ + 0.05

        );




        // ======================================
        // TRAIN EMBEDDINGS AGAIN
        // ======================================

        trainEmbedding(

            fromId,
            toId

        );

    }

}