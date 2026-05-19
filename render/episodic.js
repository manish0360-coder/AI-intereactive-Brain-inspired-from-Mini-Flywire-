// ======================================
// 🧠 EPISODIC FUTURE MEMORY SYSTEM
// ======================================
// brain remembers successful past chains
// and predicts future possibilities
// ======================================



// ======================================
// BUILD EPISODIC FUTURE MAP
// ======================================

export function buildEpisodeMap({

    episodes,

    neuronMap,

    currentKey

}) {

    // stores future prediction scores
    const episodeMap = new Map();




    // ======================================
    // CHECK ALL SUCCESSFUL EPISODES
    // ======================================

    episodes.forEach(ep => {

        // ======================================
        // FIND CURRENT NEURON POSITION
        // ======================================

        // actual episode sequence
        const path = ep.path;


        // find current neuron inside episode
        const index = path.indexOf(

            neuronMap
            .get(currentKey)
            ?.userData.label

        );




        // ======================================
        // IF CURRENT NEURON EXISTS
        // ======================================

        if (index !== -1) {




            // ======================================
            // LOOK INTO FUTURE STEPS
            // ======================================

            for (

                let i = index + 1;

                i < path.length;

                i++

            ) {

                // future word in memory chain
                const futureWord = path[i];




                // ======================================
                // FIND MATCHING NEURON ID
                // ======================================

                neuronMap.forEach((n, id) => {

                    // matching concept found
                    if (

                        n.userData.label ===
                        futureWord

                    ) {




                        // ======================================
                        // FUTURE IMPORTANCE SCORE
                        // ======================================

                        // later chain memory reward
                        const score =
                        path.length - i;




                        // accumulate future memory score
                        episodeMap.set(

                            id,

                            (

                                episodeMap.get(id)
                                || 0

                            )

                            + score

                        );

                    }

                });

            }

        }

    });




    // return future prediction map
    return episodeMap;

}