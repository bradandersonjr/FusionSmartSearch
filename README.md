# Fusion Smart Search - Autodesk Fusion Add-in

A professional Autodesk Fusion add-in that provides quick access to search multiple platforms directly from the Fusion 360 toolbar. Search YouTube tutorials, Facebook groups, Google, Autodesk Forums, Reddit communities, and AI assistants without leaving your CAD environment.

## Features

- **Multi-platform search access** - Search across 6 different platforms with dedicated buttons
- **YouTube** - Find video tutorials and how-to guides
- **Facebook** - Search Fusion 360 community groups
- **Google** - General web search with Fusion 360 context
- **Autodesk Forums** - Official Fusion 360 community forums
- **Reddit** - r/Fusion360 and related subreddits
- **AI Assistants** - Quick access to ChatGPT, Claude, or Perplexity
- **Configurable services** - Enable/disable individual search services
- **Modern HTML interface** with intuitive controls
- **Persistent configuration** - Settings save automatically across sessions
- **Cross-platform compatibility** (Windows & macOS)
- **Search All Mode** - Option to open all enabled services at once

## Installation

1. **Download or clone** this repository to your local machine
2. **Copy the entire folder** to your Autodesk Fusion add-ins directory:
   - **Windows**: `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\`
   - **macOS**: `~/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/`
3. **Start or restart** Autodesk Fusion
4. Open the **Scripts and Add-Ins** dialog:
   - Click the "Utilities" tab in the toolbar
   - Click "Scripts and Add-Ins" or press `Shift+S`
5. In the **Add-Ins** tab, find "Fusion Smart Search"
6. Click **"Run"** to activate the add-in
7. The **Fusion Smart Search** buttons will appear in your Quick Access Toolbar

## Usage

### Quick Start
1. The add-in creates multiple buttons in your Quick Access Toolbar, one for each search service
2. Click any button to search that platform for Fusion 360-related content
3. Configure which services are enabled in the settings palette

### Search Services

- **Search All** - Opens all enabled search services simultaneously
- **YouTube** - Searches for Fusion 360 video tutorials
- **Facebook** - Searches Fusion 360 Facebook groups
- **Google** - Web search with "Fusion 360" context
- **Forums** - Searches Autodesk's official Fusion 360 forums
- **Reddit** - Searches r/Fusion360 and related communities
- **AI Assistant** - Opens your preferred AI assistant (ChatGPT, Claude, or Perplexity)

### Configuring Settings

Access the settings palette to:
- **Enable/disable individual search services** - Toggle which buttons appear in your toolbar
- **Choose your AI assistant** - Select between ChatGPT, Claude, or Perplexity
- **Configure Search All mode** - Choose whether "Search All" opens all services or just opens the settings

Settings are saved automatically and persist across Fusion 360 sessions.

## Technical Details

### Architecture
- Built on Autodesk Fusion's **Command and Event Handler** architecture
- Modern **HTML5-based interface** with responsive design
- **JSON-based configuration management** for persistent settings
- Dynamic HTML generation with injected configuration
- Platform-specific browser integration via Python's `webbrowser` module
- Follows Autodesk Fusion add-in **best practices** for UI integration and cleanup

### Key Components

#### Python Backend
- **Command handlers** for each search service button
- **Settings palette handler** manages the configuration interface
- **Configuration system** with load/save functions
- **Dynamic HTML injection** to pass config to frontend
- **URL generation** for each search platform
- **Toolbar button management** based on enabled services

#### HTML Frontend
- **Responsive settings interface** with modern design
- **Service toggles** for each search platform
- **AI assistant selector** with three options
- **Real-time configuration updates** between UI and backend
- **Icon system** for visual clarity

### Code Structure
```
Fusion Smart Search/
├── Fusion Smart Search.py          # Main add-in code
├── Fusion Smart Search.manifest    # Add-in configuration (v1.0.0)
├── Palette.html                    # Settings UI template
├── Palette_temp.html              # Generated HTML (auto-created, ignored by git)
├── config.json                 # User configuration (auto-generated)
├── resources/                     # UI resources
│   ├── search_all/               # Search All button icons
│   ├── youtube/                  # YouTube button icons
│   ├── facebook/                 # Facebook button icons
│   ├── google/                   # Google button icons
│   ├── forums/                   # Forums button icons
│   ├── reddit/                   # Reddit button icons
│   ├── ai/                       # AI Assistant button icons
│   ├── 16x16-normal.png         # Default small icon
│   └── 32x32-normal.png         # Default large icon
├── .vscode/                      # VS Code debug configuration
│   ├── launch.json              # Fusion 360 Python debugger config
│   └── settings.json            # Editor settings
├── .gitignore                    # Git ignore rules
└── README.md                     # This documentation
```

### Configuration File Format

The `config.json` file stores user preferences:
```json
{
  "services": {
    "youtube": true,
    "facebook": true,
    "google": true,
    "forums": true,
    "reddit": true,
    "ai": true
  },
  "ai_assistant": "chatgpt",
  "search_all_mode": false
}
```

- `services`: Object with boolean values for each search service
- `ai_assistant`: String value - "chatgpt", "claude", or "perplexity"
- `search_all_mode`: Boolean - true to open all services, false to open settings

## Development

### Requirements
- **Autodesk Fusion** (any recent version with Python API support)
- **Python knowledge** for modifications (uses Python 3.7+)
- **Basic understanding** of Autodesk Fusion's API architecture
- **HTML/CSS/JavaScript** knowledge for UI modifications

### Customization

You can easily modify this add-in to:
- Add new search services (add button handler and resources)
- Change the palette UI design (edit `Palette.html`)
- Modify search URLs and queries
- Customize button icons (replace files in `resources/`)
- Add keyboard shortcuts
- Change default configuration values

### Debugging

- Use Autodesk Fusion's **Text Commands** window to see error messages
- Check the **Scripts and Add-Ins** dialog for add-in status
- Review Python error messages in error dialog boxes
- Inspect `config.json` for configuration issues
- Enable browser developer tools for HTML interface debugging
- Use VS Code with the provided `.vscode/launch.json` configuration

## Platform-Specific Features

### Windows
- Uses default web browser for all search operations
- Configuration stored in `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\`

### macOS
- Seamless integration with macOS default browser
- Configuration stored in `~/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/`

## Troubleshooting

### Common Issues

**Buttons don't appear in toolbar:**
- Ensure the add-in is activated in Scripts and Add-Ins dialog
- Restart Autodesk Fusion after installation
- Check that all files are in the correct add-ins directory
- Verify that services are enabled in `config.json`

**Settings palette doesn't open:**
- Check that `Palette.html` exists in the add-in folder
- Review error messages in Autodesk Fusion's Text Commands window
- Try restarting the add-in
- Delete `Palette_temp.html` if it exists and try again

**Configuration doesn't save:**
- Check file permissions in the add-in directory
- Ensure `config.json` is not read-only
- Try manually deleting `config.json` and reconfiguring

**Browser doesn't open:**
- Verify your default browser is set correctly in your OS
- Check internet connectivity
- Try running Autodesk Fusion as administrator (Windows)

**Some buttons are missing:**
- Open the settings palette (click Search All button)
- Enable the services you want to use
- Settings save automatically

## Contributing

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).

## Author

**brad anderson jr**
- Email: brad@bradandersonjr.com
- Website: [bradandersonjr.com](https://www.bradandersonjr.com)
- Ko-fi: [ko-fi.com/bradandersonjr](https://ko-fi.com/bradandersonjr)

## Version History

- **1.0.0** - Initial release
  - Multi-platform search integration
  - YouTube, Facebook, Google, Forums, Reddit, and AI assistant access
  - Configurable service toggles
  - Modern HTML-based settings interface
  - Persistent configuration storage
  - Search All mode for opening multiple services
  - AI assistant selection (ChatGPT, Claude, or Perplexity)

## Acknowledgments

- Built using Autodesk Fusion's Python API
- UI powered by modern HTML5 and CSS
- Inspired by the need for quick access to learning resources while working in CAD
- Thanks to the Autodesk Fusion developer community for API documentation and examples

---

*Made with ❤️ for the Autodesk Fusion community*
