# Snake Room - Escape Game

## Overview

Snake Room is a 2D escape game designed to challenge players with navigation through snake-filled levels, key collection, switch activation, and door escapes. Built with a full-stack architecture, it aims to provide an engaging experience combining classic escape game mechanics with dynamic 2D environments. The project envisions a captivating game with potential for future expansion into more complex puzzles and level designs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: Zustand for comprehensive game, audio, and UI state management
- **Build Tool**: Vite for fast development and build processes
- **Game Rendering**: HTML5 Canvas for high-performance 2D graphics
- **Query Management**: TanStack React Query for server state synchronization

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe data interactions
- **Session Storage**: In-memory with PostgreSQL fallback

### Game Engine
- **Rendering**: Custom Canvas-based 2D renderer
- **Physics**: AABB collision detection system
- **Entity System**: Supports various game entities including Player, Snake (with AI), Walls, Doors, Keys, and Switches
- **Level System**: JSON-based definitions for scalable and complex level designs
- **Audio**: HTML5 Audio API for immersive soundscapes and effects
- **Health System**: 2-hit player health with 1-second invincibility, health persists between levels

### UI/UX Decisions
- **Components**: Utilizes Radix UI for accessible and performant UI elements.
- **Styling**: Tailwind CSS for a utility-first approach to responsive and customizable designs, including dark mode support.
- **Visuals**: Focus on clear game rendering via Canvas and intuitive UI elements for player interaction and game status display.

## External Dependencies

### Game Development
- **Canvas API**: For core 2D graphics rendering.
- **HTML5 Audio API**: For in-game music and sound effects.

### UI Framework
- **Radix UI**: For headless, accessible UI components.
- **Tailwind CSS**: For streamlined styling.
- **Lucide React**: For icons.

### Database & Backend
- **Drizzle ORM**: For database interactions.
- **Neon Database**: For serverless PostgreSQL hosting.
- **Express.js**: For API development.

### Development Tools
- **Vite**: For frontend tooling.
- **TypeScript**: For type safety across the codebase.