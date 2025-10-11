# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm start

# Build for production
npm run build

# Run tests
npm test

# Convert logo PNG to ICO format (for Windows icons)
npm run convert-icon
```

## Architecture Overview

This is a React-based **Dynamic Fault Tree Editor** with integrated multi-LLM chatbot assistance. The application enables visual creation and analysis of fault trees with support for static (AND, OR) and dynamic gates (PAND, SPARE, SEQ, FDEP).

### Core Architecture

**Main Application Flow:**
- `App.tsx` → `FaultTreeEditor.tsx` (main orchestrator)
- Three-panel layout: `LeftPanel` (components) | `CentralPanel` (editor) | `RightPanel` (chatbot)
- React Flow-based visual editor with custom node types
- Multi-provider LLM integration with fallback mechanisms

### Key Directories

```
src/
├── components/           # React components organized by feature
│   ├── FaultTreeEditor/  # Main editor orchestrator with state management
│   ├── CentralPanel/     # React Flow editor with custom nodes/edges
│   │   ├── nodes/        # EventNode, GateNode custom components
│   │   └── edges/        # Custom connection components
│   ├── LeftPanel/        # Component palette (gates, events)
│   ├── RightPanel/       # Multi-LLM chatbot integration
│   ├── ParameterModal/   # Element configuration dialogs
│   └── *Modal/           # Various specialized modals
├── services/             # Business logic and external integrations
│   ├── llm-service.ts    # Multi-provider LLM API handling
│   ├── file-service.ts   # JSON import/export functionality
│   ├── matlab-export-service.ts  # MATLAB code generation
│   └── fault-tree-generator.ts   # Tree structure analysis
├── config/
│   └── llm-config.ts     # LLM provider configurations
└── types/
    ├── FaultTree.ts      # Core domain models
    └── ChatIntegration.ts # LLM integration types
```

### State Management Architecture

**Central State in FaultTreeEditor:**
- `faultTreeModel`: Core fault tree data (events, gates, connections)
- `selectedElement`: Currently selected element for parameter editing
- Various modal visibility states
- File management state (opened file tracking)
- LLM configuration state

**React Flow Integration:**
- Custom node types: `EventNode`, `GateNode` 
- Custom connection handling with validation
- Position-based element management
- Real-time visual updates

### Key Domain Concepts

**Fault Tree Elements:**
- **BaseEvent**: Leaf nodes with probability distributions (exponential, weibull, normal, constant)
- **Gate**: Logic gates with `GateType` ('AND', 'OR', 'PAND', 'SPARE', 'SEQ', 'FDEP')
- **Connection**: Directed links between elements
- **Top Event**: Unique root gate of the fault tree

**LLM Integration:**
- Multiple providers: OpenAI, Anthropic, Gemini, Grok, Local
- Fallback mechanism: External API → Local model → Predefined responses
- Provider configuration with API keys, models, and parameters

## Branding and Icons

**Logo Files:**
- **Source**: `public/assets/LogoHarmony.png` (high-quality PNG)
- **Windows Icon**: `public/LogoHarmony.ico` (generated from PNG)

**Icon Usage:**
- Browser favicon (multi-format support)
- Homepage logo display
- Desktop shortcut icon (Windows)
- Mobile app icon (Apple Touch)

**Icon Management:**
- Run `npm run convert-icon` to regenerate ICO from PNG
- Desktop shortcut created automatically by `install-harmony.ps1`
- Manual shortcut creation available via `create-desktop-shortcut.bat`
- See `ICON-README.md` for detailed documentation

## File Operations

**Supported Formats:**
- **JSON**: Native save/load format for fault tree models
- **MATLAB**: Export fault tree as MATLAB analysis code
- **Text**: Code-like representation for documentation

**File Service Pattern:**
- Uses modern File System Access API when available
- Falls back to download/upload for broader browser support
- Maintains file handle for direct save operations

## Testing and Quality

The project uses Create React App's built-in testing setup:
- Jest test runner
- React Testing Library for component testing
- ESLint configuration with react-app rules

## Development Patterns

**Component Organization:**
- Each major component has its own directory with CSS
- Modal components follow `*Modal` naming convention
- Custom React Flow nodes isolated in `CentralPanel/nodes/`

**State Updates:**
- Immutable state updates using spread operators
- Callback functions for child component communication
- Effect hooks for model synchronization

**Error Handling:**
- LLM service implements provider fallback chains
- File operations handle browser API availability
- Modal confirmations for destructive operations

**TypeScript Integration:**
- Strict type checking enabled
- Domain models in dedicated `types/` directory
- Interface-driven LLM provider system