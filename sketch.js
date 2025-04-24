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

// Shape class to track drawing paths
class Shape {
    constructor(x, y) {
        this.points = [{x, y}];
        this.pathLength = 0;
        this.createdAt = millis();
        this.lifespan = 10000; // 10 seconds lifespan
        this.isDot = true;
        this.color = color(255, 255, 255, 255);
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
        this.color.setAlpha(map(age, 0, this.lifespan, 255, 0));
        
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
        stroke(this.color);
        noFill();
        beginShape();
        for (let point of this.points) {
            vertex(point.x, point.y);
        }
        endShape();
        
        // If shape is complete and currently playing, highlight the active point
        if (this.isComplete && this.notes.length > 0 && this.playbackIndex < this.notes.length) {
            const activeNote = this.notes[this.playbackIndex];
            const activePoint = this.points[activeNote.position];
            
            // Draw a small indicator at the active point
            fill(255, 255, 0, this.color.levels[3]); // Yellow with same alpha as the shape
            noStroke();
            ellipse(activePoint.x, activePoint.y, 8, 8);
        }
    }

    isDead() {
        return millis() - this.createdAt > this.lifespan;
    }
    
    complete() {
        this.isComplete = true;
        this.lastPlayTime = millis(); // Set initial play time
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0);
    stroke(255);
    strokeWeight(2);
    noFill();

    // Initialize Tone.js synth
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.volume.value = -10; // Reduce volume
}

function draw() {
    // Fade background slightly to create motion trails
    background(0, 0, 0, 10);
    
    // Optionally draw quadrant dividers (very faint)
    stroke(255, 30);
    strokeWeight(1);
    line(width/2, 0, width/2, height); // Vertical divider
    line(0, height/2, width, height/2); // Horizontal divider
    
    // Update and display all shapes
    for (let i = shapes.length - 1; i >= 0; i--) {
        shapes[i].update();
        shapes[i].display();
        
        if (shapes[i].isDead()) {
            shapes.splice(i, 1);
        }
    }
}

function mousePressed() {
    if (!audioStarted) {
        Tone.start();
        audioStarted = true;
    }
    
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

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
} 