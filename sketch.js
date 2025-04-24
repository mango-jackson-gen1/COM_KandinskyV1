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
let isIOS = false; // Specifically track iOS devices
let audioContextUnlocked = false; // Track if the audio context has been unlocked
let baseAudioCtx; // Base audio context for system-level unlocking

// Debug logging for mobile
let debugLogs = ["Debug logs will appear here"];
let maxLogs = 15; // Maximum number of log entries to display

// Custom log function that also adds to visual debug
function debugLog(message) {
    console.log(message);
    // Add timestamp
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    const logEntry = `${timeStr}: ${message}`;
    
    // Add to beginning so newest logs are at the top
    debugLogs.unshift(logEntry);
    
    // Keep array at max size
    if (debugLogs.length > maxLogs) {
        debugLogs.pop();
    }
}

// Direct audio initialization function
function initAudio() {
    debugLog("initAudio called by direct user interaction");
    
    // Only initialize once
    if (baseAudioCtx) {
        debugLog("Audio already initialized, resuming...");
        baseAudioCtx.resume().then(() => debugLog("Base context resumed"));
        if (Tone.context) {
            Tone.context.resume().then(() => debugLog("Tone context resumed"));
        }
        return;
    }
    
    // Create base audio context
    baseAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    debugLog(`Base audio context created: ${baseAudioCtx.state}`);
    
    // Unlock the audio context with a short sound
    try {
        let oscillator = baseAudioCtx.createOscillator();
        oscillator.connect(baseAudioCtx.destination);
        oscillator.start();
        oscillator.stop(baseAudioCtx.currentTime + 0.01);
        debugLog("Short oscillator played to unlock audio");
        
        // Also initialize Tone.js after unlocking base context
        if (!audioStarted) {
            // Short delay to ensure base context has time to unlock
            setTimeout(() => {
                debugLog("Now initializing Tone.js");
                Tone.start().then(() => {
                    debugLog(`Tone started: ${Tone.context.state}`);
                    synth.toDestination();
                    Tone.Transport.start();
                    audioStarted = true;
                    
                    // Update UI
                    if (startButton) {
                        startButton.html('SOUND ENABLED');
                    }
                    
                    // Play test note
                    setTimeout(() => {
                        synth.triggerAttackRelease("C4", "8n");
                        debugLog("Test note played");
                    }, 300);
                });
            }, 100);
        }
    } catch (e) {
        debugLog(`Error in audio unlock: ${e.message}`);
    }
}

// Add global event listeners for audio initialization
document.addEventListener('touchstart', initAudio, { once: true });
document.addEventListener('click', initAudio, { once: true });

// Shape class to track drawing paths
class Shape {
    constructor(x, y) {
        this.points = [{x, y, index: 0}]; // Track the index of each point
        this.pathLength = 0;
        this.createdAt = millis();
        this.lifespan = 5000; // 5 seconds lifespan for cleanup
        this.isDot = true;
        this.baseColor = color(255, 105, 180); // Hot pink base color
        this.color = color(255, 105, 180, 255); // Pink color for lines with alpha
        this.notes = []; // Array to store notes along this path
        this.lastPlayTime = 0; // Track when we last played this shape
        this.isComplete = false; // Flag to indicate if drawing is complete
        this.playbackIndex = 0; // Current index during playback
        this.fadeIndex = 0; // Current fade index for pixel-by-pixel fading
        this.fadeStartTime = 0; // When the fade started
        this.fadeDelay = 50; // Milliseconds between fading each point
        this.lastFadeTime = 0; // Time of last fade progression
    }

    addPoint(x, y, note) {
        const lastPoint = this.points[this.points.length - 1];
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        this.pathLength += sqrt(dx * dx + dy * dy);
        
        if (this.pathLength > 10) {
            this.isDot = false;
        }
        
        // Store point with its index in the sequence
        this.points.push({x, y, index: this.points.length});
        
        // Store the note with this point
        if (note !== undefined) {
            this.notes.push({
                midiNote: note,
                position: this.points.length - 1 // Index of the point this note corresponds to
            });
        }
    }

    update() {
        const currentTime = millis();
        const age = currentTime - this.createdAt;
        
        // Start fading points after the shape is complete and half the lifespan has passed
        if (this.isComplete && age > this.lifespan * 0.5 && this.fadeStartTime === 0) {
            this.fadeStartTime = currentTime;
            this.lastFadeTime = currentTime;
            console.log("Starting pixel fade");
        }
        
        // If fade has started, progress the fade index at a steady rate
        if (this.fadeStartTime > 0 && currentTime - this.lastFadeTime > this.fadeDelay) {
            // Move the fade index forward if there are still points to fade
            if (this.fadeIndex < this.points.length) {
                this.fadeIndex++;
                this.lastFadeTime = currentTime;
            }
        }
        
        // Only play back completed shapes
        if (this.isComplete && this.notes.length > 0) {
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
        // If all points are faded, don't draw anything
        if (this.fadeIndex >= this.points.length) return;
        
        // Solid pink color without transparency
        stroke(this.baseColor);
        strokeWeight(3); // Reduced to 3 pixels thick
        
        // Draw line segments, omitting points that have faded
        if (this.points.length > 1) {
            for (let i = this.fadeIndex; i < this.points.length - 1; i++) {
                const point = this.points[i];
                const nextPoint = this.points[i+1];
                line(point.x, point.y, nextPoint.x, nextPoint.y);
            }
        }
        
        // If shape is complete and currently playing, highlight the active point
        if (this.isComplete && this.notes.length > 0 && this.playbackIndex < this.notes.length) {
            const activeNote = this.notes[this.playbackIndex];
            const activePoint = this.points[activeNote.position];
            
            // Only draw highlight if this point hasn't faded yet
            if (activeNote.position >= this.fadeIndex) {
                // Draw a smaller indicator at the active point (yellow)
                fill(255, 255, 0); // Yellow highlight
                noStroke();
                ellipse(activePoint.x, activePoint.y, 8, 8); // Reduced size to match thinner lines
            }
        }
    }

    isDead() {
        // A shape is dead if all its points have faded out
        const allPointsFaded = this.fadeIndex >= this.points.length;
        
        // Or if it has existed longer than its lifespan
        const hasExpired = millis() - this.createdAt > this.lifespan;
        
        // Or if it has played all notes and waited a bit
        const hasPlayedAllNotes = this.isComplete && 
                                 this.notes.length > 0 && 
                                 this.playbackIndex >= this.notes.length &&
                                 millis() - this.lastPlayTime > 1000;
                                 
        return allPointsFaded || hasExpired || hasPlayedAllNotes;
    }
    
    complete() {
        this.isComplete = true;
        this.lastPlayTime = millis(); // Set initial play time
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0); // Black background
    stroke(255, 105, 180); // Pink stroke for lines
    strokeWeight(3); // Reduced to 3 pixels thick
    noFill();
    
    // Check if device is mobile and specifically iOS
    isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    debugLog(`Detected device: ${isMobileDevice ? (isIOS ? "iOS Mobile" : "Android Mobile") : "Desktop"}`);
    
    // Create start button for audio with explicit dimensions
    startButton = createButton('TAP HERE FOR SOUND');
    startButton.position(20, 20);
    startButton.addClass('start-button');
    if (isMobileDevice) {
        startButton.addClass('mobile');
    }
    
    // Simple button handler that calls the global initAudio function
    startButton.mousePressed(() => {
        debugLog("Button pressed");
        initAudio();
        return false;
    });
    
    // For touch specifically
    startButton.touchStarted(() => {
        debugLog("Button touched");
        initAudio();
        return false;
    });
    
    // Store button dimensions for collision detection
    setTimeout(() => {
        startButton.size = {
            width: startButton.elt.offsetWidth,
            height: startButton.elt.offsetHeight
        };
        debugLog(`Button dimensions: ${startButton.size.width} x ${startButton.size.height}`);
    }, 100); // Short delay to ensure button is fully rendered
    
    // Initialize Tone.js synth but don't connect it yet
    synth = new Tone.PolySynth(Tone.Synth);
    synth.volume.value = -10; // Reduce volume
    
    // Display instructions with 30% smaller text
    textAlign(CENTER, CENTER);
    fill(255);
    noStroke();
    // Responsive text size, 30% smaller
    const fontSize = min(24, windowWidth / 25) * 0.7; // 30% smaller
    textSize(fontSize);
    text('TAP THE PINK BUTTON TO ACTIVATE SOUND', width/2, height/2);
    
    // Add additional mobile instruction if on a mobile device
    if (isMobileDevice) {
        textSize(fontSize * 0.8);
        text('Sound requires user interaction on mobile', width/2, height/2 + 30);
    }
}

// Old iOS handling code removed and replaced with the new initAudio approach

// Replace previous startAudio function with a call to the new initAudio function
function startAudio() {
    initAudio();
}

function draw() {
    // Completely clear the background each frame instead of semi-transparent overlay
    background(0); // Black background without transparency
    
    // Optionally draw quadrant dividers
    stroke(255, 255, 255, 30); // White dividers with low opacity
    strokeWeight(1); // Keep dividers thin
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
        background(0); // Clean black background
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
    
    // Draw debug logs panel
    drawDebugPanel();
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
        // Use smaller font
        const fontSize = min(24, windowWidth / 25) * 0.7; // 30% smaller
        textSize(fontSize);
        text('Please enable sound first!', width/2, height/2 + 30);
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
        background(0); // Clean black background
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
    background(0); // Black background to match
    
    // If audio hasn't started, redraw instructions
    if (!audioStarted) {
        textAlign(CENTER, CENTER);
        fill(255);
        noStroke();
        // Use a smaller font size on small screens, and reduce by 30%
        const fontSize = min(24, windowWidth / 25) * 0.7; // 30% smaller
        textSize(fontSize);
        text('Click the button in the top-left corner to enable sound', width/2, height/2);
        
        // Add additional mobile instruction if on a mobile device
        if (isMobileDevice) {
            textSize(fontSize * 0.8);
            text('(Tap the pink button)', width/2, height/2 + 30);
        }
    }
} 

// Add touch event handlers for mobile devices
// Function to draw debug information on screen
function drawDebugPanel() {
    // Only show debug panel on mobile devices
    if (!isMobileDevice) return;
    
    // Draw debug panel background
    fill(0, 0, 0, 180); // Semi-transparent black
    noStroke();
    rect(10, height - 220, width - 20, 210);
    
    // Draw debug text
    fill(255);
    textAlign(LEFT, TOP);
    textSize(12);
    
    // Audio context state
    let contextInfo = "Audio Context: ";
    if (Tone.context) {
        contextInfo += `${Tone.context.state} (${audioStarted ? "Started" : "Not Started"})`;
    } else {
        contextInfo += "Not initialized";
    }
    text(contextInfo, 15, height - 215);
    
    // Draw log entries
    let yPos = height - 195;
    for (let i = 0; i < debugLogs.length; i++) {
        text(debugLogs[i], 15, yPos);
        yPos += 15;
    }
}

// Replace previous handleStartButtonPress with a simpler version
function handleStartButtonPress() {
    debugLog("Start button handler called");
    if (window.event) {
        window.event.preventDefault();
        window.event.stopPropagation();
    }
    initAudio();
    return false;
}

function touchStarted() {
    // Early exit if no touches
    if (!touches || touches.length === 0) return false;
    
    debugLog(`Touch started at ${touches[0].x},${touches[0].y}. Audio: ${audioStarted}`);
    
    // Check if button pressed (keep this for direct button touches)
    if (startButton) {
        const buffer = 20; // Bigger buffer for mobile
        if (touches[0].x >= startButton.x - buffer && 
            touches[0].x <= startButton.x + startButton.size.width + buffer &&
            touches[0].y >= startButton.y - buffer && 
            touches[0].y <= startButton.y + startButton.size.height + buffer) {
            
            debugLog("Touch on start button");
            initAudio();
            return false; // Prevent default
        }
    }

    // If audio context exists but not running, try to resume
    if (baseAudioCtx && baseAudioCtx.state !== 'running') {
        debugLog("Resuming base context on touch");
        baseAudioCtx.resume();
    }
    
    if (Tone.context && Tone.context.state !== 'running') {
        debugLog("Resuming Tone context on touch");
        Tone.context.resume();
    }

    // Prevent default to stop scrolling/zooming
    if (touches.length === 1) {
        if (!audioStarted) {
            // If click is on canvas but not on button, remind user
            fill(255);
            noStroke();
            textAlign(CENTER, CENTER);
            const fontSize = min(24, windowWidth / 25) * 0.7; // 30% smaller
            textSize(fontSize);
            text('Please enable sound first!', width/2, height/2 + 30);
            if (isMobileDevice) {
                textSize(fontSize * 0.8);
                text('(Tap the pink button in the top-left)', width/2, height/2 + 60);
            }
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
        debugLog(`Note recorded: ${noteInfo.noteName}`);
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