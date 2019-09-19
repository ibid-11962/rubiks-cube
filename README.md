# Rubik's Cube

A mouse-controlled Rubik's Cube implemented with WebGL/JS.

[See it live here.](https://ibid-11962.github.io/rubiks-cube/cube.html)

# Compatibility

This program is designed to be run on Google Chrome, though it may be compatible on other browsers.

# Installation

1. Make sure that the following five files are in the same directory

- cube.html
- cube.js
- MV.js
- initShaders.js
- webgl-utils.js

2. Open cube.html in Google Chrome.


# Controls

**Rotating a pane:**

Left click and drag along the pane you wish to rotate. Make sure that your mouse starts and ends on different cubes.

**Rotating the entire cube:**

**Right click and drag on the cube.**

Changing the animation speed: 

Move the slider. All the way to the right will result in no animations. Note that this only affects rotating panes.

**Scrambling the cube:**

Change the number in the text box to the number of random moves you wish to scramble (default is 5) and press "Scramble".

**Saving and loading a state:**

The current state is always displayed in the "Current state" textbox. 

To save, select the contents (triple click or ctrl-A) and copy it somewhere. 

To load, paste a saved state in the box and press "Load".
