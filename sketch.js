// C Major scale notes (MIDI values)
const C_MAJOR = [60, 62, 64, 65, 67, 69, 71, 72]; // C4 to C5
const A_MAJOR = [69, 71, 72, 74, 76, 77, 79, 81]; // A4 to A5
const G_MAJOR = [67, 69, 71, 72, 74, 76, 77, 79]; // G4 to G5
const F_MAJOR = [65, 67, 69, 71, 73, 74, 76, 77]; // F4 to F5

// Global variables
let shapes = [];
let synth;
let isDrawing = false;
let currentShape = null;
let audioStarted = false;
let lastPlayedNote = null;
let completedShapes = []; // Array to track completed shapes with their notes
let audioContext = null;
let startButton;
let isMobileDevice = false;

// Shape class to track drawing paths
class Shape {
    constructor(x, y) {
        this.points = [{x, y}];
        this.pathLength = 0;
        this.createdAt = millis();
        this.lifespan = 5000; // Reduced to 5 seconds lifespan for quicker cleanup
        this.isDot = true;
        this.color = color(0, 0, 255, 255); // Blue color for lines
        this.notes = []; // Array to store notes along this path
        this.lastPlayTime = 0; // Track when we last played this shape
        this.isComplete = false; // Flag to indicate if drawing is complete
        this.playbackIndex = 0; // Current index during playback
    }

    addPoint(x, y, note) {
        const lastPoint = this.points[this.points.length - 1];
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        this.pathLength += sqrt(dx * dx + dy * dy);
        
        if (this.pathLength > 10) {
            this.isDot = false;
        }
        
        this.points.push({x, y});
        
        // Store the note with this point
        if (note !== undefined) {
            this.notes.push({
                midiNote: note,
                position: this.points.length - 1 // Index of the point this note corresponds to
            });
        }
    }

    update() {
        const age = millis() - this.createdAt;
        // Calculate alpha based on age
        const alpha = map(age, 0, this.lifespan, 255, 0);
        // Update color with new alpha
        this.color = color(0, 0, 255, alpha);
        
        // Only play back completed shapes
        if (this.isComplete && this.notes.length > 0) {
            const currentTime = millis();
            
            // Check if it's time to play the next note (every 200ms)
            if (currentTime - this.lastPlayTime > 200) {
                // Play the current note in the sequence
                if (this.playbackIndex < this.notes.length) {
                    const noteInfo = this.notes[this.playbackIndex];
                    const freq = Tone.Frequency(noteInfo.midiNote, "midi").toFrequency();
                    synth.triggerAttackRelease(freq, "8n");
                    
                    // Advance to next note
                    this.playbackIndex = (this.playbackIndex + 1) % this.notes.length;
                    this.lastPlayTime = currentTime;
                }
            }
        }
    }

    display() {
        // Set the stroke color with the current alpha
        stroke(this.color);
        strokeWeight(2);
        noFill();
        
        // Draw the shape
        beginShape();
        for (let point of this.points) {
            vertex(point.x, point.y);
        }
        endShape();
        
        // If shape is complete and currently playing, highlight the active point
        if (this.isComplete && this.notes.length > 0 && this.playbackIndex < this.notes.length) {
            const activeNote = this.notes[this.playbackIndex];
            const activePoint = this.points[activeNote.position];
            
            // Draw a small indicator at the active point (yellow with same alpha)
            fill(255, 255, 0, this.color.levels[3]); // Yellow with same alpha as the shape
            noStroke();
            ellipse(activePoint.x, activePoint.y, 8, 8);
        }
    }

    isDead() {
        // A shape is dead if it has existed longer than its lifespan
        // or if it's completed playing all its notes at least once
        const hasExpired = millis() - this.createdAt > this.lifespan;
        const hasPlayedAllNotes = this.isComplete && 
                                 this.notes.length > 0 && 
                                 this.playbackIndex >= this.notes.length;
                                 
        return hasExpired || (hasPlayedAllNotes && millis() - this.lastPlayTime > 1000);
    }
    
    complete() {
        this.isComplete = true;
        this.lastPlayTime = millis(); // Set initial play time
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(200, 0, 0); // Red background
    stroke(0, 0, 255); // Blue stroke for lines
    strokeWeight(2);
    noFill();
    
    // Check if device is mobile
    isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Adjust button and text size for mobile
    const buttonSize = isMobileDevice ? 18 : 16;
    const buttonPadding = isMobileDevice ? "15px 20px" : "10px 15px";
    
    // Create start button for audio with explicit dimensions
    startButton = createButton('Click to Enable Sound');
    startButton.position(20, 20);
    startButton.addClass('start-button');
    if (isMobileDevice) {
        startButton.addClass('mobile');
    }
    
    // Make sure we properly track button click events without triggering canvas events
    startButton.mousePressed(function() {
        // Prevent event propagation
        window.event.stopPropagation();
        startAudio();
    });
    
    // Store button dimensions for collision detection
    startButton.size = {
        width: startButton.elt.offsetWidth,
        height: startButton.elt.offsetHeight
    };
    
    // Initialize Tone.js synth but don't connect it yet
    synth = new Tone.PolySynth(Tone.Synth);
    synth.volume.value = -10; // Reduce volume
    
    // Display instructions
    textAlign(CENTER, CENTER);
    fill(255);
    noStroke();
    // Responsive text size
    const fontSize = min(24, windowWidth / 25);
    textSize(fontSize);
    text('Click the button in the top-left corner to enable sound', width/2, height/2);
}

// Function to start audio with user interaction
function startAudio() {
    // Prevent double initialization
    if (audioStarted) {
        console.log("Sound is already enabled");
        return;
    }
    
    // Start Tone.js
    Tone.start().then(() => {
        console.log("Tone.js started successfully");
        
        // Make sure we haven't already started in another callback
        if (audioStarted) return;
        
        // Connect synth to destination after audio context is running
        synth.toDestination();
        // Also start the Tone transport
        Tone.Transport.start();
        
        audioStarted = true;
        startButton.html('Sound Enabled');
        startButton.style('background-color', '#00FF00');
        
        // Test sound to confirm audio is working
        setTimeout(() => {
            synth.triggerAttackRelease("C4", "8n");
            console.log("Test note played");
        }, 100);
        
    }).catch(error => {
        console.error("Failed to start Tone.js:", error);
        startButton.html('Sound Failed - Try Again');
        startButton.style('background-color', '#FF0000');
    });
}

function draw() {
    // Completely clear the background each frame instead of semi-transparent overlay
    background(200, 0, 0); // Solid red background without transparency
    
    // Optionally draw quadrant dividers
    stroke(255, 255, 255, 30); // White dividers with low opacity
    strokeWeight(1);
    line(width/2, 0, width/2, height); // Vertical divider
    line(0, height/2, width, height/2); // Horizontal divider
    
    // Update and display all shapes with their own transparency
    for (let i = shapes.length - 1; i >= 0; i--) {
        shapes[i].update();
        shapes[i].display();
        
        if (shapes[i].isDead()) {
            shapes.splice(i, 1);
        }
    }
    
    // Check if all shapes have been removed and redraw a clean background
    if (shapes.length === 0 && audioStarted) {
        // All shapes have expired, ensure background is completely clean
        background(200, 0, 0);
        console.log("All shapes expired, canvas cleared");
    }
    
    // Show audio status indicator
    if (!audioStarted) {
        fill(255, 0, 0);
        noStroke();
        ellipse(width - 30, 30, 10, 10);
    } else {
        fill(0, 255, 0);
        noStroke();
        ellipse(width - 30, 30, 10, 10);
    }
}

function mousePressed() {
    // Check if the mouse is on the start button - if so, don't start drawing
    if (startButton && mouseX >= startButton.x && 
        mouseX <= startButton.x + startButton.size.width &&
        mouseY >= startButton.y && 
        mouseY <= startButton.y + startButton.size.height) {
        console.log("Click detected on sound button area - ignoring canvas event");
        return; // Exit the function without drawing
    }
    
    // Don't start drawing unless audio is enabled
    if (!audioStarted) {
        // If click is on canvas but not on button, remind user
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        text('Please enable sound first!', width/2, height/2 + 40);
        return;
    }
    
    // Clean up any expired shapes before starting a new one
    cleanupExpiredShapes();
    
    isDrawing = true;
    currentShape = new Shape(mouseX, mouseY);
    shapes.push(currentShape);
    
    // Get note information but don't play it during drawing
    const noteInfo = getNoteInfo(mouseX, mouseY);
    currentShape.addPoint(mouseX, mouseY, noteInfo.midiNote);
    
    // Log note information
    console.log("Note recorded on mousePressed:", noteInfo.noteName, "at position:", mouseX, mouseY);
}

function mouseDragged() {
    if (isDrawing && currentShape) {
        // Get note information but don't play it during drawing
        const noteInfo = getNoteInfo(mouseX, mouseY);
        
        // Only add points with new notes if we've moved significantly
        const lastPoint = currentShape.points[currentShape.points.length - 1];
        const distance = dist(lastPoint.x, lastPoint.y, mouseX, mouseY);
        
        if (distance > 10) { // Only add points that are spaced out
            currentShape.addPoint(mouseX, mouseY, noteInfo.midiNote);
            console.log("Note recorded on drag:", noteInfo.noteName);
        } else {
            // Just add the point without a new note
            currentShape.addPoint(mouseX, mouseY);
        }
    }
}

function mouseReleased() {
    if (currentShape) {
        // Mark shape as complete, which will start playback
        currentShape.complete();
        console.log("Shape completed with", currentShape.notes.length, "notes");
    }
    
    isDrawing = false;
    currentShape = null;
    lastPlayedNote = null;
}

// Function to get note information without playing it
function getNoteInfo(x, y) {
    // Determine which quadrant the mouse is in
    const quadrantX = x < width/2 ? 0 : 1; // 0 = left, 1 = right
    const quadrantY = y < height/2 ? 0 : 1; // 0 = top, 1 = bottom
    
    // Select the appropriate scale based on quadrant
    let scale;
    let quadrantName = "";
    if (quadrantX === 0 && quadrantY === 0) {
        // Quadrant 1 (top-left): C Major
        scale = C_MAJOR;
        quadrantName = "Top-Left (C Major)";
    } else if (quadrantX === 1 && quadrantY === 0) {
        // Quadrant 2 (top-right): A Major
        scale = A_MAJOR;
        quadrantName = "Top-Right (A Major)";
    } else if (quadrantX === 0 && quadrantY === 1) {
        // Quadrant 3 (bottom-left): G Major
        scale = G_MAJOR;
        quadrantName = "Bottom-Left (G Major)";
    } else {
        // Quadrant 4 (bottom-right): F Major
        scale = F_MAJOR;
        quadrantName = "Bottom-Right (F Major)";
    }
    
    // Calculate discrete steps for notes in each quadrant
    const quadrantWidth = width / 2;
    const stepsPerQuadrant = 6; // 6 discrete zones per quadrant
    const stepWidth = quadrantWidth / stepsPerQuadrant;
    
    // Calculate which zone the x position falls into
    const relativeX = quadrantX === 0 ? x : x - quadrantWidth;
    const stepIndex = floor(relativeX / stepWidth);
    
    // Map the step index to our 8-note scale (use modulo to avoid out-of-range indices)
    const noteIndex = stepIndex % 8;
    const midiNote = scale[noteIndex];
    
    // Get note name for logging
    const noteName = Tone.Frequency(midiNote, "midi").toNote();
    
    return {
        midiNote: midiNote,
        noteName: noteName,
        quadrantName: quadrantName,
        zoneIndex: stepIndex
    };
}

// Original play note function is replaced by the shape-based playback system
function playNote(x, isDot) {
    const noteInfo = getNoteInfo(x, mouseY);
    const freq = Tone.Frequency(noteInfo.midiNote, "midi").toFrequency();
    
    if (isDot) {
        // Short note for dots
        synth.triggerAttackRelease(freq, "8n");
    } else {
        // Longer note for lines
        synth.triggerAttackRelease(freq, "4n");
    }
}

// Helper function to remove expired shapes
function cleanupExpiredShapes() {
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (shapes[i].isDead()) {
            shapes.splice(i, 1);
        }
    }
    
    // If all shapes are gone, ensure the canvas is clean
    if (shapes.length === 0) {
        background(200, 0, 0); // Clean red background
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Recalculate layout and UI elements when window size changes
    if (startButton) {
        // Adjust button position to remain visible
        startButton.position(20, 20);
    }
    
    // Redraw background and instructions if needed
    background(200, 0, 0); // Red background to match
    
    // If audio hasn't started, redraw instructions
    if (!audioStarted) {
        textAlign(CENTER, CENTER);
        fill(255);
        noStroke();
        // Use a smaller font size on small screens
        const fontSize = min(24, windowWidth / 25);
        textSize(fontSize);
        text('Click the button in the top-left corner to enable sound', width/2, height/2);
    }
} 

// Add touch event handlers for mobile devices
function touchStarted() {
    // Check if the touch is on the start button
    if (startButton && touches.length === 1 &&
        touches[0].x >= startButton.x && 
        touches[0].x <= startButton.x + startButton.size.width &&
        touches[0].y >= startButton.y && 
        touches[0].y <= startButton.y + startButton.size.height) {
        console.log("Touch detected on sound button area - letting button handle it");
        return false; // Let the button handle the event
    }

    // Prevent default to stop scrolling/zooming
    if (touches.length === 1) {
        if (!audioStarted) {
            // If click is on canvas but not on button, remind user
            fill(255);
            noStroke();
            textAlign(CENTER, CENTER);
            const fontSize = min(24, windowWidth / 25);
            textSize(fontSize);
            text('Please enable sound first!', width/2, height/2 + 40);
            return false;
        }
        
        // Clean up any expired shapes before starting a new one
        cleanupExpiredShapes();
        
        isDrawing = true;
        currentShape = new Shape(touches[0].x, touches[0].y);
        shapes.push(currentShape);
        
        // Get note information
        const noteInfo = getNoteInfo(touches[0].x, touches[0].y);
        currentShape.addPoint(touches[0].x, touches[0].y, noteInfo.midiNote);
        
        // Log note information
        console.log("Note recorded on touchStarted:", noteInfo.noteName);
    }
    return false; // Prevent default
}

function touchMoved() {
    if (isDrawing && currentShape && touches.length === 1) {
        // Get note information
        const noteInfo = getNoteInfo(touches[0].x, touches[0].y);
        
        // Only add points with new notes if we've moved significantly
        const lastPoint = currentShape.points[currentShape.points.length - 1];
        const distance = dist(lastPoint.x, lastPoint.y, touches[0].x, touches[0].y);
        
        if (distance > 10) { // Only add points that are spaced out
            currentShape.addPoint(touches[0].x, touches[0].y, noteInfo.midiNote);
            console.log("Note recorded on touchMoved:", noteInfo.noteName);
        } else {
            // Just add the point without a new note
            currentShape.addPoint(touches[0].x, touches[0].y);
        }
    }
    return false; // Prevent default
}

function touchEnded() {
    if (currentShape) {
        // Mark shape as complete, which will start playback
        currentShape.complete();
        console.log("Shape completed with", currentShape.notes.length, "notes");
    }
    
    isDrawing = false;
    currentShape = null;
    lastPlayedNote = null;
    return false; // Prevent default
} 