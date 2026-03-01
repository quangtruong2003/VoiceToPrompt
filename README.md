# Voice to Text

A professional, high-performance voice dictation application for Windows that converts speech to text in real-time using Google's Gemini AI API. Built with Electron, React, and TypeScript.

## Overview

Voice to Text is a desktop application designed for seamless speech-to-text transcription. It runs as a system tray application with a floating overlay window, allowing users to dictate text directly into any application. The application features ultra-low latency audio processing, multi-provider API support (Google Gemini, Antigravity, and custom endpoints), and automatic text injection into the active application.

## Core Features

### Recording & Transcription
- **Real-time Voice Recording** - Capture audio from microphone with optimal settings for speech recognition (16kHz, mono, Opus encoding)
- **Automatic Transcription** - Send audio to AI API and receive transcribed text
- **Multiple API Providers** - Support for Google Gemini, Antigravity, and custom API endpoints
- **Language Support** - Configurable language setting for transcription accuracy

### User Interface
- **Floating Overlay Window** - Compact, always-on-top recording indicator that stays out of your way
- **System Tray Integration** - Runs silently in the system tray with context menu controls
- **Settings Panel** - Comprehensive configuration for API keys, language, custom prompts, and endpoint settings
- **Recording Indicator** - Visual feedback showing recording status and duration

### Automation
- **Global Shortcut** - Press `Super+Alt+H` to toggle recording from anywhere in the system
- **Enter Key Stop** - Press Enter to immediately stop recording and process audio
- **Automatic Text Injection** - Automatically pastes transcribed text into the active application using clipboard simulation
- **Multi-language Support** - Optimized for Vietnamese with support for other languages

### Performance
- **Low-Latency Audio Pipeline** - Target latency under 50ms from audio capture to API submission
- **Connection Pooling** - Pre-warmed WebSocket connections for instant API communication
- **Audio Compression** - Opus encoding at 24kbps for efficient bandwidth usage
- **Process Priority Elevation** - High-priority audio processing for consistent performance

## Technology Stack

### Frontend
- **React 18** - UI framework for component-based interface
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server

### Desktop
- **Electron 33** - Cross-platform desktop application framework
- **Electron Builder** - Application packaging and distribution

### Audio Processing
- **Web Audio API** - Real-time audio capture and processing
- **MediaRecorder API** - Audio chunking and encoding
- **Opus Codec** - High-efficiency audio compression

### AI Integration
- **Google Gemini API** - Primary speech-to-text provider
- **Antigravity API** - Alternative provider option
- **Custom Endpoint** - Support for self-hosted or third-party APIs

### Utilities
- **@nut-tree-fork/nut-js** - Keyboard automation for text injection

## Prerequisites

Before building and running the application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Windows 10/11** (64-bit)
- **Microphone** - Required for voice input
- **API Key** - Google Gemini API key (or compatible provider)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd voice-to-text
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Key

Create a `.env` file in the project root directory:

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

Alternatively, you can enter your API key through the application settings panel after running the app.

### 4. Run in Development Mode

```bash
npm run dev
```

### 5. Build for Production

To create a Windows executable:

```bash
npm run build
```

The built executable will be located in the `release` directory.

## Configuration

### API Settings

| Setting | Description | Default |
|---------|-------------|---------|
| API Type | Provider selection (Google/Antigravity/Custom) | Google |
| API Key | Authentication key for the selected provider | - |
| Custom Endpoint | URL for custom API endpoint | - |
| Language | Transcription language code | Vietnamese (vi) |

### Audio Settings

| Parameter | Value | Description |
|-----------|-------|-------------|
| Sample Rate | 16000 Hz | Optimized for speech recognition |
| Channels | 1 (Mono) | Voice-optimized |
| Codec | Opus | Low-latency compression |
| Bitrate | 24 kbps | Voice-optimized quality |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Super + Alt + H` | Toggle recording (global) |
| `Enter` | Stop recording and transcribe |

## Usage

### Starting the Application

1. Launch the application - it will minimize to the system tray
2. Click the tray icon to open the settings panel
3. Configure your API key and preferences
4. Close settings - the app continues running in the background

### Recording Voice

1. Press `Super + Alt + H` or click the tray icon and select "Bắt đầu ghi âm"
2. A floating overlay window appears indicating recording is active
3. Speak clearly into your microphone
4. Press `Enter` to stop recording and process the audio
5. The transcribed text is automatically injected into your active application

### Settings Panel

Access the settings panel by:
- Right-clicking the system tray icon and selecting "Cài đặt"
- Clicking the system tray icon (single click)

Available settings:
- **API Key Configuration** - Enter and validate your API key
- **Language Selection** - Choose the transcription language
- **Custom Prompt** - Add context hints for better transcription
- **API Type** - Select between Google Gemini, Antigravity, or custom endpoints

## Architecture

### Audio Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOW-LATENCY AUDIO PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ AudioCapture │───▶│ AudioEncoder │───▶│ StreamBuffer │───▶│  WebSocket │ │
│  │   (Device)   │    │    (Opus)    │    │  (Priority)  │    │  (Pooled)  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```
voice-to-text/
├── electron/                 # Electron main process
│   ├── main.ts              # Main entry point, window management
│   └── preload.ts           # Preload script for IPC
├── src/
│   ├── components/          # React UI components
│   │   ├── OverlayView.tsx  # Recording overlay window
│   │   └── SettingsView.tsx # Settings panel
│   ├── hooks/              # Custom React hooks
│   │   └── useAudioRecorder.ts # Audio recording logic
│   ├── lib/                # Core libraries
│   │   ├── voice-stream-engine.ts # Audio processing engine
│   │   ├── http2-stream.ts       # HTTP/2 streaming
│   │   ├── performance-monitor.ts # Performance metrics
│   │   └── types.ts              # TypeScript definitions
│   ├── App.tsx             # Main application component
│   └── main.tsx           # React entry point
├── public/                 # Static assets
└── release/               # Built executables
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the Vite development server with Electron.

### Building for Production

```bash
npm run build
```

This compiles TypeScript, builds the React frontend, and packages the Electron application into an executable.

### Project Structure

- `electron/` - Electron main process code
- `src/` - React frontend source code
- `public/` - Static assets (icons, images)
- `dist/` - Compiled frontend output
- `dist-electron/` - Compiled Electron output
- `release/` - Final executable packages

## API Integration

### Google Gemini API

Default configuration uses Google's Gemini Flash model for transcription:

- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta`
- **Model**: `gemini-3-flash-preview`
- **Authentication**: `X-goog-api-key` header

### Antigravity API

Alternative provider with Bearer token authentication:

- **Endpoint**: Configurable (default: `https://api.antigravity.app`)
- **Authentication**: `Authorization: Bearer <api_key>`

### Custom Endpoint

For self-hosted or third-party APIs:

- **Endpoint**: User-configured URL
- **Authentication**: Bearer token (same format as Antigravity)

## Troubleshooting

### Common Issues

**No API Key**
- Solution: Enter your API key in the settings panel or create a `.env` file

**Microphone Not Detected**
- Solution: Ensure microphone permissions are granted in Windows Settings

**Text Not Being Injected**
- Solution: Check that no other application is blocking clipboard access

**Recording Not Starting**
- Solution: Verify global shortcut permissions in Windows

### Logs

Application logs are available in the developer console when running in development mode. Check for:
- `[VoiceStreamEngine]` - Audio processing logs
- `[ConnectionPool]` - API connection logs
- `[PerformanceMonitor]` - Performance metrics

## License

This project is provided as-is for personal and commercial use. See the LICENSE file for details.

## Contributing

Contributions are welcome. Please ensure:
- TypeScript strict mode compliance
- React best practices
- Proper error handling
- Performance-conscious code

## Acknowledgments

- Google Gemini API for speech-to-text capabilities
- Electron and React communities
- Opus codec developers
