# Snake Room - Escape Game

## Overview

Snake Room is a 2D escape game built with React, TypeScript, and Express. Players navigate through levels filled with moving snakes, collect keys, activate switches, and escape through doors. The game features a full-stack architecture with a React frontend for the game interface and an Express backend for API support.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system using Radix UI components
- **State Management**: Zustand for game state, audio management, and UI state
- **Build Tool**: Vite with hot module replacement
- **Game Rendering**: HTML5 Canvas for 2D game graphics
- **Query Management**: TanStack React Query for server state management

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Module System**: ES Modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Development Server**: TSX for TypeScript execution
- **Session Storage**: In-memory storage with fallback to PostgreSQL sessions

### Game Engine
- **Rendering**: Custom Canvas-based 2D renderer
- **Physics**: AABB collision detection system
- **Entity System**: Player, Snake, Wall, Door, Key, and Switch entities
- **Level System**: JSON-based level definitions with multiple stages
- **Audio**: HTML5 Audio API for background music and sound effects

## Key Components

### Game Logic (`client/src/lib/game/`)
- **Types**: Core game entity interfaces and type definitions
- **Collision**: AABB collision detection and physics utilities
- **Entities**: Snake AI with patrol-based movement system
- **Levels**: Static level definitions with increasing complexity

### State Management (`client/src/lib/stores/`)
- **useSnakeGame**: Main game state including player position, entities, and level progression
- **useAudio**: Audio management with mute/unmute functionality
- **useGame**: Generic game phase management (ready/playing/ended)

### Game Components (`client/src/components/Game/`)
- **SnakeRoom**: Main game container with keyboard input handling
- **GameCanvas**: Canvas rendering component with entity drawing
- **GameUI**: Menu system, level progression, and game status display

### UI Components (`client/src/components/ui/`)
- Complete Radix UI component library integration
- Custom styled components with Tailwind CSS
- Responsive design system with dark mode support

## Data Flow

1. **Game Initialization**: 
   - Load audio assets and initialize game state
   - Set up keyboard event listeners
   - Initialize canvas rendering context

2. **Game Loop**:
   - Process keyboard input for player movement
   - Update snake positions using patrol AI
   - Check collisions between all entities
   - Update game state based on interactions
   - Render all entities to canvas

3. **Level Progression**:
   - Check victory conditions (key collected + door reached)
   - Transition to next level or victory screen
   - Reset player position and entity states

4. **Audio Management**:
   - Background music loops during gameplay
   - Sound effects trigger on collisions and victories
   - Mute/unmute functionality persists across sessions

## External Dependencies

### Game Development
- **Canvas Rendering**: Native HTML5 Canvas API
- **Audio**: HTML5 Audio API for music and sound effects
- **Input**: Keyboard event handling for player controls

### UI Framework
- **Radix UI**: Headless UI components for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for UI elements

### Database & Backend
- **Drizzle ORM**: Type-safe database operations
- **Neon Database**: Serverless PostgreSQL hosting
- **Express.js**: RESTful API framework

### Development Tools
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundling for production

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with HMR on client/
- **Backend**: TSX execution for Express server
- **Database**: Drizzle push for schema synchronization

### Production Build
- **Frontend**: Vite builds to `dist/public/`
- **Backend**: ESBuild bundles server to `dist/index.js`
- **Static Serving**: Express serves built frontend assets
- **Database**: PostgreSQL with connection pooling

### Build Commands
- `npm run dev`: Start development servers
- `npm run build`: Build both frontend and backend
- `npm run start`: Start production server
- `npm run db:push`: Apply database schema changes

## Changelog
- July 18, 2025. Fixed emptying animation to preserve green pipes initially - pipes now remain visible when emptying starts and are gradually removed as animation progresses through each tile
- July 18, 2025. Fixed "Cannot read properties of undefined (reading 'entities')" error - corrected code to use state.patternTiles instead of non-existent state.level.entities
- July 18, 2025. Implemented gradual emptying animation - flow gradually fades from tiles during emptying, similar to filling animation but in reverse
- July 18, 2025. Enhanced blocked flow indicator to persist during emptying - red X and pulsing circle remain visible until all tiles are unlocked and emptying completes
- July 18, 2025. Added flow emptying animation for both successful and failed connections - flow empties backward from start tile and unlocks tiles for both completed paths and blocked flows
- July 18, 2025. Separated pipe locking from visual flow completion - tiles lock when flow enters them but green visualization only shows when flow completes through them
- July 18, 2025. Added immediate visual flow animation with neon green liquid that starts when E is pressed and persists on completed paths
- July 18, 2025. Added blocked flow indicator - neon green X with pulsing filled circle shows on the tile that couldn't be reached
- July 18, 2025. Flow visualization starts on all connection attempts (successful or failed) to help debug pipe connections
- July 18, 2025. Changed Level 4 name from "Simple Escape" to "Venom Pipes"
- July 18, 2025. Fixed visual display mismatch - tile directional markers now use the same logic as the connection system
- July 18, 2025. Removed automatic connection checking - now only happens when user presses E on start tile
- July 17, 2025. Added manual connection checking for Level 4 - press E on start tile to check path status with visual feedback
- July 17, 2025. Implemented pipe puzzle path connection system for Level 4 - when path connects start to end, key chamber walls disappear
- July 17, 2025. Added visual feedback for tile rotation - tiles highlight in light blue and show "Q/E to rotate" message when player stands on them
- July 17, 2025. Added tile rotation capabilities to Level 4 - players can rotate tiles 90° left (Q) or right (E) while standing on them
- July 17, 2025. Modified Level 4 grid tiles to show exactly 2 cardinal directions each (except start/end tiles)
- July 16, 2025. Added white lines from center to each directional marker with same thickness as custom graphics
- July 16, 2025. Added random removal system for directional markers (0-2 markers removed per square except start/end)
- July 16, 2025. Added directional markers (N, S, E, W) to all grid squares in Level 4
- July 16, 2025. Moved Level 4 key to position (700, 80) with surrounding walls similar to Level 1 key chamber

- July 16, 2025. Added custom graphics system to pattern tiles with graphics at (3,0) neon green and (6,7) magenta with flipped line direction
- July 16, 2025. Updated Level 4 to use centered 8x8 tile grid (60x60 pixel tiles)
- July 16, 2025. Added Level 4 "Simple Escape" - basic level with only player, key, and exit door (no snakes, puzzles, or inner walls)
- July 14, 2025. Enhanced Level 3 mirror rotation with 1-degree precision controls (Q/E keys)
- July 14, 2025. Added level selection feature with difficulty indicators
- July 14, 2025. Implemented key room wall removal mechanic for Level 3 light puzzle
- June 28, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.