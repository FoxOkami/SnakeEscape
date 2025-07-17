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