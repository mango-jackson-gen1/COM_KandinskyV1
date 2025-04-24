# Interactive Drawing & Sound 🎨🎵

An interactive web application that transforms user drawings into musical notes using p5.js for visuals and Tone.js for sound synthesis. As users draw on the canvas, their cursor movements generate musical notes mapped to different musical scales across four distinct quadrants of the canvas.

## 🚀 Getting Started

### Requirements

- Web browser (Chrome recommended)
- No server needed, runs locally with any static file server (e.g. VSCode Live Server)
- Works on desktop and mobile devices (iPhone, iPad, Android)

### Project Structure

- `index.html` – links p5.js and Tone.js
- `sketch.js` – core drawing + sound logic
- `style.css` – optional styling

## 🎵 Key Features

### Multi-Scale Musical Mapping

- **Top-Left Quadrant**: C Major scale
- **Top-Right Quadrant**: A Major scale
- **Bottom-Left Quadrant**: G Major scale
- **Bottom-Right Quadrant**: F Major scale

### Responsive Design

- Fully responsive canvas that adapts to any screen size
- Mobile-optimized interface with touch support
- Works on desktop, tablet, and smartphone devices

### Interactive Audio

- Audio initialization button to comply with browser policies
- Visual feedback for audio status
- Shape-based sound playback system
- Test sound confirms audio is working

## 🖼️ Canvas Setup

The application initializes with:

- Full-screen canvas using `createCanvas(windowWidth, windowHeight)`
- Basic styling (stroke, fill, background color)
- Audio context from Tone.js (triggered by user interaction)
- Compliance with browser audio policies
- Dynamic resizing for all devices

## 🎨 Drawing Loop

The `draw()` function operates at ~60 FPS and handles:

- Background fade for motion trails
- Iteration through all visual shapes
- Audio status indication
- Quadrant visualization

## 🖱️ User Interaction

### Input Events

#### Mouse Events (Desktop)

- `mousePressed()`: Initiates new drawing stroke
- `mouseDragged()`: Extends current stroke path
- `mouseReleased()`: Finalizes current shape

#### Touch Events (Mobile)

- `touchStarted()`: Begins drawing on mobile devices
- `touchMoved()`: Continues stroke on mobile devices
- `touchEnded()`: Completes shape on mobile devices

## 🎵 Sound System

### Audio Initialization

- Click "Enable Sound" button to start audio
- Visual indicator shows audio status (red/green)
- Test sound plays to confirm audio is working
- Prevents drawing until sound is enabled

### Shape-Based Playback

Each completed shape becomes a musical sequence:
- Shape points determine note sequence
- Notes play back automatically along the path
- Visual indicator shows current playing position
- Multiple shapes create layered musical patterns

## 🔊 Sound Mapping

### Sound Engine

- Powered by Tone.js PolySynth
- Volume set to -10 dB for comfortable listening

### Scale Mapping

Each quadrant of the canvas uses a different musical scale:
- **Top-Left**: C Major [60, 62, 64, 65, 67, 69, 71, 72]
- **Top-Right**: A Major [69, 71, 72, 74, 76, 77, 79, 81]
- **Bottom-Left**: G Major [67, 69, 71, 72, 74, 76, 77, 79]
- **Bottom-Right**: F Major [65, 67, 69, 71, 73, 74, 76, 77]

## 📱 Mobile-Specific Features

- Touch event handling
- Prevents scrolling/zooming during drawing
- Larger button targets for easier interaction
- Responsive text sizing based on screen width
- Fixed positioning to prevent bounce effects
- Dedicated mobile CSS styles



## 💡 Usage Tips

1. Open the app in any modern browser (desktop or mobile)
2. Click/tap the "Enable Sound" button in the top-left corner
3. Draw in different quadrants to create melodies in different scales:
   - Top-left for C Major 
   - Top-right for A Major
   - Bottom-left for G Major
   - Bottom-right for F Major
4. Create multiple shapes to build layered musical patterns
5. Shapes will automatically fade out over time

## 🔧 Technical Implementation

### Shape Class Structure

```javascript
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
  // ... methods for updating and displaying
}
```

### Responsive Design Implementation

- Dynamic canvas resizing with `windowResized()`
- Touch event handling for mobile devices
- Viewport meta tags to prevent scaling
- Media queries for different screen sizes
- Touch action prevention for smoother drawing
