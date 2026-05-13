// ======================================
// STAR SYSTEM
// ======================================



// import scene
import {

    scene

} from "./scene.js";



// stars object
export let stars;



// ======================================
// CREATE STARS
// ======================================

export function createStars() {

    // geometry container
    const starGeometry =
        new THREE.BufferGeometry();



    // star positions
    const starPositions = [];



    // create many stars
    for (let i = 0; i < 1000; i++) {

        starPositions.push(

            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50

        );

    }



    // attach positions
    starGeometry.setAttribute(

        "position",

        new THREE.Float32BufferAttribute(
            starPositions,
            3
        )

    );



    // create stars
    stars = new THREE.Points(

        starGeometry,

        new THREE.PointsMaterial({

            color: 0xffffff,
            size: 0.05

        })

    );



    // add into scene
    scene.add(stars);
    // return stars object to main.js
    return stars;

}