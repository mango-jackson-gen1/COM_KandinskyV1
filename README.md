# Interactive Drawing & Sound 🎨🎵

An interactive web application that transforms user drawings into musical notes using p5.js for visuals and Tone.js for sound synthesis. As users draw on the canvas, their cursor movements generate musical notes mapped to the C Major scale, with different drawing motions triggering distinct sound behaviors.

## 🚀 Getting Started

### Requirements

- Web browser (Chrome recommended)
- No server needed, runs locally with any static file server (e.g. VSCode Live Server)

### Project Structure

- `index.html` – links p5.js and Tone.js
- `sketch.js` – core drawing + sound logic
- `style.css` – optional styling

## 🖼️ Canvas Setup

The application initializes with:

- Full-screen canvas using `createCanvas(windowWidth, windowHeight)`
- Basic styling (stroke, fill, background color)
- Audio context from Tone.js (triggered on first user interaction)
- Compliance with browser audio policies

## 🎨 Drawing Loop

The `draw()` function operates at ~60 FPS and handles:

- Background fade for motion trails
- Iteration through all visual elements
- Mouse position tracking for:
  - Shape drawing
  - Path length computation
  - Sound triggering based on movement thresholds

## 🖱️ User Interaction

### Mouse Events

#### mousePressed()

- Initiates new drawing stroke
- Creates new Shape object
- Triggers short note for "dot" gestures
- Starts audio context if not already active

#### mouseDragged()

- Extends current stroke path
- Tracks path distance
- Triggers notes based on movement
- Updates shape properties

#### mouseReleased()

- Finalizes current shape
- Handles shape completion
- Manages sound release

## 🔁 Object Management

### Shape Class

Each drawn item is managed through a Shape class that tracks:

- Path points array
- Total path length
- Creation timestamp
- Lifecycle status
- Fade-out properties

### Shape Lifecycle

- **Creation**: Starts on `mousePressed` event
- **Growth**: Continues during `mouseDragged` events
- **Completion**: Ends on `mouseReleased` event
- **Fade-out**: Shapes automatically fade out over 5 seconds
- **Cleanup**: Shapes are removed from memory after fade-out

## 🔊 Sound Mapping

### Sound Engine

- Powered by Tone.js PolySynth
- Supports overlapping notes
- Volume set to -10 dB for comfortable listening

### Scale Mapping

- C Major scale (C4 to C5)
- MIDI values: [60, 62, 64, 65, 67, 69, 71, 72]
- Horizontal position mapping:
  - Left edge → C4 (60)
  - Right edge → C5 (72)
  - Linear interpolation between notes

### Gesture Sound Logic

- **Dots** (path length ≤ 10px):

  - Duration: 1/8 note
  - Short, staccato sound
  - Single note trigger

- **Lines** (path length > 10px):
  - Duration: 1/4 note
  - Longer, sustained sound
  - Continuous note triggering

### Future Expansion

- Drawing speed → note velocity mapping
- Vertical movement → volume modulation
- Path complexity → sound texture

## ⚠️ Edge Cases

### Audio Context

- Starts only on first user interaction
- Prevents browser autoplay restrictions
- Handled in `mousePressed` event

### Drawing Edge Cases

1. **Rapid Movement**

   - Path points captured at frame rate
   - No interpolation between points
   - May result in jagged lines

2. **Canvas Boundaries**

   - Drawing continues beyond edges
   - Points still recorded
   - Sound continues to play

3. **Multiple Shapes**

   - Supports concurrent shapes
   - Independent lifecycles
   - No shape limit

4. **Window Resizing**
   - Automatic canvas resizing
   - Shape position maintenance
   - Sound mapping adjustment

### Performance Considerations

- Automatic shape cleanup
- No concurrent shape limit
- Background fade impact
- Frame rate maintenance

## 💡 Usage Tips

1. Open `index.html` in a web browser
2. Experiment with different drawing styles:
   - Quick taps for staccato notes
   - Slow movements for sustained notes
   - Horizontal movement to change pitch
3. Combine techniques for complex sound patterns
4. Drawings automatically fade out after 5 seconds

## 🔧 Technical Implementation

### Shape Class Structure

```javascript
class Shape {
  constructor(x, y) {
    this.points = [{ x, y }];
    this.pathLength = 0;
    this.createdAt = millis();
    this.lifespan = 5000;
    this.isDot = true;
    this.color = color(255, 255, 255, 255);
  }
  // ... methods for updating and displaying
}
```

### Drawing Loop Mechanics

- 60 FPS update rate
- Shape update and display
- Fade-out and cleanup
- Motion trail maintenance
