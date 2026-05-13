// ======================================
// KNOWLEDGE SYSTEM
// ======================================


// semantic meaning relations
export const conceptRelations = {

    dog: ["food", "bone", "home", "human"],

    cat: ["milk", "food", "home"],

    lion: ["meat", "hunt", "forest"],

    tiger: ["meat", "hunt", "forest"],


    food: ["eat"],

    meat: ["eat"],

    milk: ["drink"],


    hunt: ["meat"],

    eat: [],

    drink: [],


    forest: ["hunt", "lion", "tiger"],

    home: ["dog", "cat", "human"],

    human: ["home", "dog"]

};