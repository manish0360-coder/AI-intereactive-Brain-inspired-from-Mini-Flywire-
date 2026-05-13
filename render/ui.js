// ======================================
// CREATE REASONING UI
// ======================================

// export allows other files
// to use this variable
export const reasoningBox =

document.createElement("div");



// ======================================
// POSITION UI
// ======================================

// fixed screen position
reasoningBox.style.position =
"absolute";



// bottom-left
reasoningBox.style.bottom =
"10px";

reasoningBox.style.left =
"10px";



// ======================================
// STYLE UI
// ======================================

// text color
reasoningBox.style.color =
"white";



// font
reasoningBox.style.fontFamily =
"monospace";



// font size
reasoningBox.style.fontSize =
"14px";



// background
reasoningBox.style.background =
"rgba(0,0,0,0.5)";



// spacing
reasoningBox.style.padding =
"10px";



// rounded corners
reasoningBox.style.borderRadius =
"5px";



// ======================================
// ADD UI TO SCREEN
// ======================================

document.body.appendChild(
  reasoningBox
);