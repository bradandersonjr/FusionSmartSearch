"""
Fusion Smart Search - Autodesk Fusion Add-in
=====================================

A professional Autodesk Fusion add-in that provides smart access to search resources
directly from the Autodesk Fusion interface. This add-in integrates seamlessly with Fusion's
Quick Access Toolbar (QAT) and provides an elegant HTML-based settings interface.

Author: brad anderson jr
Contact: brad@bradandersonjr.com
Version: 1.0.0

Features:
    - One-click QAT buttons for instant resource searches
    - Configurable settings panel accessible from Scripts menu
    - Support for YouTube, Facebook, Google, Autodesk Forums, Reddit
    - Multiple AI assistants: ChatGPT, Claude, Gemini, Perplexity
    - Persistent configuration with JSON storage
    - Toggle individual services on/off to show/hide QAT buttons
    - Comprehensive error handling with user-friendly messages

Installation:
    1. Copy this add-in folder to your Autodesk Fusion add-ins directory
    2. Start or restart Autodesk Fusion
    3. Open the Scripts and Add-Ins dialog
    4. Select this add-in and click "Run"
    5. The Fusion Smart Search buttons will appear in your Quick Access Toolbar

Usage:
    - Click any service button in the QAT to search that service
    - Configure which services appear in settings
    - Settings automatically save and persist across sessions

Configuration:
    - Service Toggles: Enable/disable individual services (YouTube, Facebook, Google, Autodesk Forums, Reddit, AI Assistant)
    - AI Assistant Selection: Choose between ChatGPT, Claude, Gemini, or Perplexity
    - All settings are stored locally in config.json

Technical Details:
    - Built on Autodesk Fusion's Command and Event Handler architecture
    - Uses HTML5-based palette for modern, responsive UI
    - Cross-platform browser integration via Python's webbrowser module
    - JSON-based configuration management
    - Follows Autodesk Fusion add-in best practices
    - Comprehensive cleanup procedures to prevent memory leaks
"""

import adsk.core
import adsk.fusion
import traceback
import webbrowser
import json
import os
from typing import Optional, Dict, Any

# ============================================================================
# CONSTANTS AND CONFIGURATION
# ============================================================================

# Add-in metadata
ADDIN_NAME = 'Fusion Smart Search'
ADDIN_VERSION = '2.0.0'
ADDIN_AUTHOR = 'brad anderson jr'
ADDIN_CONTACT = 'brad@bradandersonjr.com'

# File and path constants
CONFIG_FILENAME = 'config.json'

# UI element identifiers
PALETTE_ID = 'FusionSmartSearchPalette'
SETTINGS_CMD_ID = 'FusionSmartSearchSettings'

# Service definitions
SERVICES = {
    'youtube': {
        'name': 'YouTube',
        'url': 'https://www.youtube.com/results?search_query=',
        'icon': './resources/youtube',
        'tooltip': 'Search YouTube',
        'cmd_id': 'FusionSmartSearchYouTube'
    },
    'facebook': {
        'name': 'Facebook',
        'url': 'https://www.facebook.com/search/top?q=',
        'icon': './resources/facebook',
        'tooltip': 'Search Facebook',
        'cmd_id': 'FusionSmartSearchFacebook'
    },
    'google': {
        'name': 'Google',
        'url': 'https://www.google.com/search?q=',
        'icon': './resources/google',
        'tooltip': 'Search Google',
        'cmd_id': 'FusionSmartSearchGoogle'
    },
    'forums': {
        'name': 'Autodesk Forums',
        'url': 'https://forums.autodesk.com/t5/forums/searchpage/tab/message?filter=location&location=category:fusion-en&q=',
        'icon': './resources/forums',
        'tooltip': 'Search Autodesk Forums',
        'cmd_id': 'FusionSmartSearchForums',
        'skip_prefix': True  # Don't add "Autodesk Fusion 360" prefix
    },
    'reddit': {
        'name': 'Reddit',
        'url': 'https://www.reddit.com/search/?q=',
        'icon': './resources/reddit',
        'tooltip': 'Search Reddit',
        'cmd_id': 'FusionSmartSearchReddit'
    },
    'ai': {
        'name': 'AI Assistant',
        'url': '',  # Will be set based on user's selection
        'icon': './resources/ai',
        'tooltip': 'Ask AI Assistant',
        'cmd_id': 'FusionSmartSearchAI'
    },
    'search_all': {
        'name': 'Search All',
        'url': '',  # Special handler for multiple services
        'icon': './resources/search_all',
        'tooltip': 'Search all enabled services at once',
        'cmd_id': 'FusionSmartSearchSearchAll'
    }
}

# AI Assistant options
AI_ASSISTANTS = {
    'chatgpt': {
        'name': 'ChatGPT',
        'url': 'https://chatgpt.com/?prompt='
    },
    'claude': {
        'name': 'Claude',
        'url': 'https://claude.ai/new?q='
    },
    'gemini': {
        'name': 'Gemini',
        'url': 'https://gemini.google.com/app?q='
    },
    'perplexity': {
        'name': 'Perplexity',
        'url': 'https://www.perplexity.ai/?q='
    }
}

# Default configuration values
DEFAULT_CONFIG = {
    'services': {
        'youtube': True,
        'facebook': True,
        'google': True,
        'forums': True,
        'reddit': True,
        'ai': True
    },
    'ai_assistant': 'chatgpt',
    'search_all_mode': False
}

# UI dimensions
PALETTE_WIDTH = 560
PALETTE_HEIGHT = 800

# The built React app, not a hand-written page. `ui/` is the source; `npm run
# build` emits ui_dist/ and that output IS committed, so the add-in works from
# a fresh clone with no build step for the user. Resolved absolutely, with
# forward slashes, the same way BradsUtilityToolbox's palette entry point
# resolves its own ui_dist/index.html.
ADDIN_ROOT = os.path.dirname(os.path.realpath(__file__))
PALETTE_URL = os.path.join(ADDIN_ROOT, 'ui_dist', 'index.html').replace('\\', '/')

# Message box constants
MSG_BOX_OK_ONLY = 0
MSG_BOX_INFO_ICON = 0

# Error message template
ERROR_MSG_TEMPLATE = 'Failed:\n{}'

# ============================================================================
# GLOBAL VARIABLES
# ============================================================================

# Event handler storage to prevent garbage collection
handlers = []

# Palette instance
palette = None

# Store command definitions and controls for cleanup
service_commands = {}
service_controls = {}

# Whether the palette's page has announced itself via the 'ready' handshake
# and can receive pushes. Not the same as palette.isVisible: a docked palette
# can be visible before its page has finished loading its JS and wired up its
# message handler, and pushing into that gap silently drops the message.
_ready = False

# ============================================================================
# CONFIGURATION MANAGEMENT
# ============================================================================

def get_config_path() -> str:
    """
    Retrieves the absolute path to the configuration file.

    Returns:
        str: Absolute path to the config.json file
    """
    addin_dir = os.path.dirname(os.path.realpath(__file__))
    return os.path.join(addin_dir, CONFIG_FILENAME)


def create_default_config() -> Dict[str, Any]:
    """
    Creates and returns a default configuration dictionary.

    Returns:
        Dict[str, Any]: Default configuration with all services enabled
    """
    return {
        'services': DEFAULT_CONFIG['services'].copy(),
        'ai_assistant': DEFAULT_CONFIG['ai_assistant'],
        'search_all_mode': DEFAULT_CONFIG['search_all_mode']
    }


def load_config() -> Dict[str, Any]:
    """
    Loads the configuration from the JSON file.

    Returns:
        Dict[str, Any]: Configuration dictionary containing service toggles
    """
    config_path = get_config_path()

    # Create default config if file doesn't exist
    if not os.path.exists(config_path):
        default_config = create_default_config()
        save_config(default_config)
        return default_config

    # Attempt to load existing config
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Validate that required keys exist
        if 'services' not in config:
            raise ValueError('Invalid config format')

        # Merge with defaults to ensure all services are present
        merged_config = create_default_config()
        merged_config['services'].update(config.get('services', {}))
        merged_config['ai_assistant'] = config.get('ai_assistant', DEFAULT_CONFIG['ai_assistant'])
        merged_config['search_all_mode'] = config.get('search_all_mode', DEFAULT_CONFIG['search_all_mode'])

        return merged_config

    except (json.JSONDecodeError, IOError, ValueError):
        # If loading fails, return default config
        return create_default_config()


def save_config(config: Dict[str, Any]) -> bool:
    """
    Saves the configuration to the JSON file.

    Args:
        config (Dict[str, Any]): Configuration dictionary to save

    Returns:
        bool: True if save was successful, False otherwise
    """
    config_path = get_config_path()

    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True

    except (IOError, TypeError):
        return False


# ============================================================================
# SERVICE OPERATIONS
# ============================================================================

def open_service_url(service_key: str, ui: Optional[adsk.core.UserInterface] = None) -> None:
    """
    Opens the URL for the specified service in a web browser.

    Args:
        service_key (str): The service key (e.g., 'youtube', 'facebook')
        ui (Optional[adsk.core.UserInterface]): User interface object
    """
    try:
        if service_key in SERVICES:
            service = SERVICES[service_key]
            url = service['url']
            webbrowser.open_new(url)
        else:
            if ui:
                ui.messageBox(
                    f'Unknown service: {service_key}',
                    ADDIN_NAME,
                    MSG_BOX_OK_ONLY,
                    MSG_BOX_INFO_ICON
                )
    except Exception as e:
        error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
        if ui:
            ui.messageBox(error_msg, ADDIN_NAME, MSG_BOX_OK_ONLY, MSG_BOX_INFO_ICON)


# ============================================================================
# USER INTERFACE HELPERS
# ============================================================================

def show_error_message(ui: Optional[adsk.core.UserInterface], error_message: str) -> None:
    """
    Displays an error message dialog to the user.

    Args:
        ui (Optional[adsk.core.UserInterface]): User interface object
        error_message (str): The error message to display
    """
    if ui:
        ui.messageBox(error_message, ADDIN_NAME, MSG_BOX_OK_ONLY, MSG_BOX_INFO_ICON)


def push_state() -> None:
    """
    Sends the current settings to the palette's React app, if it is open and
    has announced itself ready.

    This is the async PUSH_STATE push in reply to the page's 'ready' message
    -- the same contract BradsUtilityToolbox's palette uses. There is no
    synchronous return-data path: the page always asks and Python always
    answers by pushing, which is simpler than trying to race a reply back
    through HTMLEventArgs.returnData.
    """
    global palette

    if not palette or not _ready:
        return

    try:
        config = load_config()

        payload = json.dumps({
            'services': config.get('services', DEFAULT_CONFIG['services']),
            'ai_assistant': config.get('ai_assistant', DEFAULT_CONFIG['ai_assistant']),
            'search_all_mode': config.get('search_all_mode', DEFAULT_CONFIG['search_all_mode'])
        })
        palette.sendInfoToHTML('PUSH_STATE', payload)

    except Exception:
        # A closed or reloading palette is not a failure worth reporting.
        pass


# ============================================================================
# EVENT HANDLERS - PALETTE
# ============================================================================

class PaletteCommandHandler(adsk.core.HTMLEventHandler):
    """
    Handles events and messages from the HTML palette.
    """

    def __init__(self, ui: adsk.core.UserInterface):
        super().__init__()
        self.ui = ui

    def notify(self, args: adsk.core.HTMLEventArgs) -> None:
        """
        Called when the HTML palette sends a message to the add-in.

        Args:
            args (adsk.core.HTMLEventArgs): Event arguments
        """
        try:
            htmlArgs = adsk.core.HTMLEventArgs.cast(args)
            action = htmlArgs.action

            if action == 'ready':
                # The page can receive messages now; reply with the current
                # settings. Idempotent and safe to receive more than once --
                # the page re-sends 'ready' with a backoff until this arrives,
                # because palettes.add() can start loading the page before
                # incomingFromHTML is wired on the next line, and a fast page
                # can announce itself into that gap.
                global _ready
                _ready = True
                push_state()

            elif action == 'savePreferences':
                # Save user's updated preferences
                data = json.loads(htmlArgs.data) if htmlArgs.data else {}
                config = load_config()

                # Extract service toggles, AI assistant selection, and search all mode
                services = data.get('services', {})
                ai_assistant = data.get('ai_assistant', 'chatgpt')
                search_all_mode = data.get('search_all_mode', False)
                config['services'] = services
                config['ai_assistant'] = ai_assistant
                config['search_all_mode'] = search_all_mode

                # Persist to file
                save_config(config)

                # Refresh QAT buttons based on new config
                refresh_qat_buttons(self.ui)

            elif action == 'openUrl':
                # Open any URL in the user's browser
                url = htmlArgs.data if htmlArgs.data else ''
                if url:
                    webbrowser.open_new(url)

        except Exception as e:
            error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
            show_error_message(self.ui, error_msg)


class PaletteClosedHandler(adsk.core.UserInterfaceGeneralEventHandler):
    """
    Handles events when the palette is closed by the user.
    """

    def __init__(self, ui: adsk.core.UserInterface):
        super().__init__()
        self.ui = ui

    def notify(self, args: adsk.core.UserInterfaceGeneralEventArgs) -> None:
        """
        Called when the palette is closed.

        Args:
            args (adsk.core.UserInterfaceGeneralEventArgs): Event arguments
        """
        try:
            # _ready is deliberately NOT cleared here. Fusion raises this
            # event when a docked palette is merely collapsed too, and the
            # page is still alive underneath -- clearing it would drop every
            # push until the user reopens the palette. A genuinely destroyed
            # page re-announces itself through 'ready' when it reloads.
            pass
        except Exception:
            pass


# ============================================================================
# EVENT HANDLERS - SERVICE COMMANDS
# ============================================================================

class ServiceButtonHandler(adsk.core.CommandEventHandler):
    """
    Handles the execution of service button clicks.
    """

    def __init__(self, ui: adsk.core.UserInterface, service_key: str):
        super().__init__()
        self.ui = ui
        self.service_key = service_key

    def notify(self, args: adsk.core.CommandEventArgs) -> None:
        """
        Called when a service button is clicked.

        Args:
            args (adsk.core.CommandEventArgs): Command execution event arguments
        """
        try:
            # Get the service information
            service = SERVICES.get(self.service_key)
            if not service:
                show_error_message(self.ui, f'Unknown service: {self.service_key}')
                return

            # Special handling for "Search All" mode
            if self.service_key == 'search_all':
                self._handle_search_all()
                return

            # For AI service, get the selected AI assistant
            if self.service_key == 'ai':
                config = load_config()
                ai_assistant = config.get('ai_assistant', 'chatgpt')
                ai_info = AI_ASSISTANTS.get(ai_assistant, AI_ASSISTANTS['chatgpt'])
                base_url = ai_info['url']
                service_name = ai_info['name']
            else:
                base_url = service['url']
                service_name = service['name']

            # Show input dialog for search query
            search_query, cancelled = self.ui.inputBox(
                f'What would you like to search for on {service_name}?',
                'Search Query',
                ''
            )

            # If user cancelled or entered empty string, don't open anything
            if cancelled or not search_query.strip():
                return

            # Build the URL with the search query
            # Automatically prepend "Autodesk Fusion 360" to the search (unless skip_prefix is set)
            if service.get('skip_prefix', False):
                full_query = search_query.strip()
            else:
                full_query = 'Autodesk Fusion 360 ' + search_query.strip()
            full_url = base_url + full_query

            # Open the URL in the browser
            webbrowser.open_new(full_url)

        except Exception as e:
            error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
            show_error_message(self.ui, error_msg)

    def _handle_search_all(self) -> None:
        """
        Handles the Search All button click by opening all enabled services.
        """
        try:
            # Load config to see which services are enabled
            config = load_config()
            services_config = config.get('services', DEFAULT_CONFIG['services'])
            ai_assistant = config.get('ai_assistant', 'chatgpt')

            # Count enabled services
            enabled_services = []
            for service_key, is_enabled in services_config.items():
                if is_enabled and service_key in SERVICES and service_key != 'search_all':
                    enabled_services.append(service_key)

            if not enabled_services:
                show_error_message(self.ui, 'No services are enabled. Please enable at least one service in settings.')
                return

            # Show input dialog for search query
            search_query, cancelled = self.ui.inputBox(
                f'What would you like to search for?\n({len(enabled_services)} services will be searched)',
                'Search All Services',
                ''
            )

            # If user cancelled or entered empty string, don't open anything
            if cancelled or not search_query.strip():
                return

            # Open each enabled service
            for service_key in enabled_services:
                service = SERVICES[service_key]

                # For AI service, get the selected AI assistant
                if service_key == 'ai':
                    ai_info = AI_ASSISTANTS.get(ai_assistant, AI_ASSISTANTS['chatgpt'])
                    base_url = ai_info['url']
                else:
                    base_url = service['url']

                # Build the URL with the search query
                if service.get('skip_prefix', False):
                    full_query = search_query.strip()
                else:
                    full_query = 'Autodesk Fusion 360 ' + search_query.strip()
                full_url = base_url + full_query

                # Open the URL in the browser
                webbrowser.open_new_tab(full_url)

        except Exception as e:
            error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
            show_error_message(self.ui, error_msg)


class ServiceButtonCommandCreatedHandler(adsk.core.CommandCreatedEventHandler):
    """
    Handles the creation of service button commands.
    """

    def __init__(self, ui: adsk.core.UserInterface, service_key: str):
        super().__init__()
        self.ui = ui
        self.service_key = service_key

    def notify(self, args: adsk.core.CommandCreatedEventArgs) -> None:
        """
        Called when a service button command is created.

        Args:
            args (adsk.core.CommandCreatedEventArgs): Command creation event arguments
        """
        try:
            command = args.command

            # Attach execute handler for button clicks
            on_execute = ServiceButtonHandler(self.ui, self.service_key)
            command.execute.add(on_execute)
            handlers.append(on_execute)

        except Exception as e:
            error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
            show_error_message(self.ui, error_msg)


# ============================================================================
# EVENT HANDLERS - SETTINGS
# ============================================================================

class SettingsHandler(adsk.core.CommandEventHandler):
    """
    Handles showing and hiding the settings palette.
    """

    def __init__(self, ui: adsk.core.UserInterface):
        super().__init__()
        self.ui = ui

    def notify(self, args: adsk.core.CommandEventArgs) -> None:
        """
        Called when the settings command is executed.

        Args:
            args (adsk.core.CommandEventArgs): Command execution event arguments
        """
        try:
            global palette

            if palette:
                # Toggle palette visibility if it already exists
                try:
                    was_visible = palette.isVisible
                    palette.isVisible = not was_visible

                    # Send fresh state when showing palette
                    if palette.isVisible:
                        push_state()
                except RuntimeError:
                    # Palette is in an invalid state - recreate it
                    palette = None
                    palette = self._create_palette()
            else:
                # Create the palette for the first time
                palette = self.ui.palettes.itemById(PALETTE_ID)

                if not palette:
                    # Palette doesn't exist - create it
                    palette = self._create_palette()
                else:
                    # Palette exists but was hidden - show it
                    try:
                        palette.isVisible = True
                        push_state()
                    except RuntimeError:
                        # Palette is invalid - recreate it
                        palette = None
                        palette = self._create_palette()

        except Exception as e:
            error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
            show_error_message(self.ui, error_msg)

    def _create_palette(self) -> adsk.core.Palette:
        """
        Creates and configures the settings palette, pointed at the built
        React app (ui_dist/index.html) rather than a hand-written page.

        Returns:
            adsk.core.Palette: The newly created palette instance
        """
        global _ready

        # A freshly created page has not announced itself yet -- pushing
        # before that would be dropped, so state is sent only once the page's
        # own 'ready' handshake arrives (see PaletteCommandHandler.notify).
        _ready = False

        # Create the palette. useNewWebBrowser=True: the built React bundle
        # loads as an ES module, which the legacy embedded browser can't run.
        new_palette = self.ui.palettes.add(
            PALETTE_ID,
            'Fusion Smart Search Settings',
            PALETTE_URL,
            True,  # Show palette immediately
            True,  # Show close button
            True,  # Can be resized by user
            PALETTE_WIDTH,
            PALETTE_HEIGHT,
            True   # useNewWebBrowser
        )

        # Register HTML event handler
        on_html = PaletteCommandHandler(self.ui)
        new_palette.incomingFromHTML.add(on_html)
        handlers.append(on_html)

        # Register closed event handler
        on_closed = PaletteClosedHandler(self.ui)
        new_palette.closed.add(on_closed)
        handlers.append(on_closed)

        # Dock palette on the left side
        new_palette.dockingState = adsk.core.PaletteDockingStates.PaletteDockStateLeft

        return new_palette


class SettingsCommandCreatedHandler(adsk.core.CommandCreatedEventHandler):
    """
    Handles the creation of the Settings command.
    """

    def __init__(self, ui: adsk.core.UserInterface):
        super().__init__()
        self.ui = ui

    def notify(self, args: adsk.core.CommandCreatedEventArgs) -> None:
        """
        Called when the settings command is created.

        Args:
            args (adsk.core.CommandCreatedEventArgs): Command creation event arguments
        """
        try:
            command = args.command

            # Attach execute handler
            on_execute = SettingsHandler(self.ui)
            command.execute.add(on_execute)
            handlers.append(on_execute)

        except Exception as e:
            error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
            show_error_message(self.ui, error_msg)


# ============================================================================
# QAT BUTTON MANAGEMENT
# ============================================================================

def create_service_button(ui: adsk.core.UserInterface, service_key: str, qat_toolbar: adsk.core.Toolbar) -> None:
    """
    Creates and adds a service button to the QAT.

    Args:
        ui (adsk.core.UserInterface): The Fusion UI object
        service_key (str): The service key
        qat_toolbar (adsk.core.Toolbar): The QAT toolbar (QATRight)
    """
    try:
        service = SERVICES[service_key]
        cmd_id = service['cmd_id']

        # Remove existing command definition if present
        existing_cmd = ui.commandDefinitions.itemById(cmd_id)
        if existing_cmd:
            existing_cmd.deleteMe()

        # Get the tooltip (dynamically for AI assistant)
        tooltip = service['tooltip']
        if service_key == 'ai':
            config = load_config()
            ai_assistant = config.get('ai_assistant', 'chatgpt')
            ai_info = AI_ASSISTANTS.get(ai_assistant, AI_ASSISTANTS['chatgpt'])
            tooltip = f'Ask {ai_info["name"]}'

        # Create command definition
        cmd_def = ui.commandDefinitions.addButtonDefinition(
            cmd_id,
            service['name'],
            tooltip,
            service['icon']
        )

        # Attach command created handler
        on_created = ServiceButtonCommandCreatedHandler(ui, service_key)
        cmd_def.commandCreated.add(on_created)
        handlers.append(on_created)

        # Add button to QATRight toolbar (insert before HealthStatusCommand)
        control = qat_toolbar.controls.addCommand(cmd_def, 'HealthStatusCommand', False)

        # Store references for cleanup
        service_commands[service_key] = cmd_def
        service_controls[service_key] = control

    except Exception as e:
        error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
        show_error_message(ui, error_msg)


def remove_service_button(ui: adsk.core.UserInterface, service_key: str, qat_toolbar: adsk.core.Toolbar) -> None:
    """
    Removes a service button from the QAT.

    Args:
        ui (adsk.core.UserInterface): The Fusion UI object
        service_key (str): The service key
        qat_toolbar (adsk.core.Toolbar): The QAT toolbar
    """
    try:
        service = SERVICES[service_key]
        cmd_id = service['cmd_id']

        # Remove control
        if service_key in service_controls:
            try:
                service_controls[service_key].deleteMe()
            except:
                pass
            del service_controls[service_key]

        # Remove command definition
        cmd_def = ui.commandDefinitions.itemById(cmd_id)
        if cmd_def:
            cmd_def.deleteMe()

        if service_key in service_commands:
            del service_commands[service_key]

    except Exception:
        pass


def refresh_qat_buttons(ui: adsk.core.UserInterface) -> None:
    """
    Refreshes QAT buttons based on current configuration.

    Args:
        ui (adsk.core.UserInterface): The Fusion UI object
    """
    try:
        config = load_config()
        services_config = config.get('services', DEFAULT_CONFIG['services'])
        search_all_mode = config.get('search_all_mode', False)
        qat_toolbar = ui.toolbars.itemById('QATRight')

        if not qat_toolbar:
            return

        if search_all_mode:
            # Remove all individual service buttons
            for service_key in SERVICES.keys():
                if service_key != 'search_all' and service_key in service_controls:
                    remove_service_button(ui, service_key, qat_toolbar)

            # Create the search_all button if it doesn't exist
            if 'search_all' not in service_controls:
                create_service_button(ui, 'search_all', qat_toolbar)
        else:
            # Remove the search_all button if it exists
            if 'search_all' in service_controls:
                remove_service_button(ui, 'search_all', qat_toolbar)

            # Update each individual service button
            for service_key in SERVICES.keys():
                if service_key == 'search_all':
                    continue

                is_enabled = services_config.get(service_key, True)

                if is_enabled:
                    # Create button if it doesn't exist
                    if service_key not in service_controls:
                        create_service_button(ui, service_key, qat_toolbar)
                else:
                    # Remove button if it exists
                    if service_key in service_controls:
                        remove_service_button(ui, service_key, qat_toolbar)

    except Exception:
        pass


# ============================================================================
# ADD-IN LIFECYCLE FUNCTIONS
# ============================================================================

def run(context: Dict[str, Any]) -> None:
    """
    Entry point for the Autodesk Fusion add-in.

    Args:
        context (Dict[str, Any]): Context dictionary provided by Fusion
    """
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface

        # ====================================================================
        # CLEANUP EXISTING DEFINITIONS
        # ====================================================================

        qat_toolbar = ui.toolbars.itemById('QATRight')

        # Remove existing service buttons
        for service_key, service in SERVICES.items():
            cmd_id = service['cmd_id']

            # Remove existing control
            existing_control = qat_toolbar.controls.itemById(cmd_id)
            if existing_control:
                existing_control.deleteMe()

            # Remove existing command definition
            existing_cmd = ui.commandDefinitions.itemById(cmd_id)
            if existing_cmd:
                existing_cmd.deleteMe()

        # Remove existing settings command
        existing_settings_cmd = ui.commandDefinitions.itemById(SETTINGS_CMD_ID)
        if existing_settings_cmd:
            existing_settings_cmd.deleteMe()

        # Remove existing settings control
        workspace = ui.workspaces.itemById('FusionSolidEnvironment')
        if workspace:
            addins_panel = workspace.toolbarPanels.itemById('SolidScriptsAddinsPanel')
            if addins_panel:
                existing_settings_control = addins_panel.controls.itemById(SETTINGS_CMD_ID)
                if existing_settings_control:
                    existing_settings_control.deleteMe()

        # ====================================================================
        # CREATE SERVICE BUTTONS BASED ON CONFIGURATION
        # ====================================================================

        config = load_config()
        services_config = config.get('services', DEFAULT_CONFIG['services'])
        search_all_mode = config.get('search_all_mode', False)

        if search_all_mode:
            # Create only the search_all button
            create_service_button(ui, 'search_all', qat_toolbar)
        else:
            # Create individual service buttons for enabled services
            for service_key in SERVICES.keys():
                if service_key != 'search_all' and services_config.get(service_key, True):
                    create_service_button(ui, service_key, qat_toolbar)

        # ====================================================================
        # CREATE SETTINGS COMMAND
        # ====================================================================

        settings_cmd = ui.commandDefinitions.addButtonDefinition(
            SETTINGS_CMD_ID,
            'Fusion Smart Search Settings',
            'Configure which search services appear in the toolbar',
            './resources'
        )

        # Attach command created handler
        on_settings_created = SettingsCommandCreatedHandler(ui)
        settings_cmd.commandCreated.add(on_settings_created)
        handlers.append(on_settings_created)

        # Add settings command to ADD-INS panel
        if workspace:
            addins_panel = workspace.toolbarPanels.itemById('SolidScriptsAddinsPanel')
            if addins_panel:
                control = addins_panel.controls.addCommand(settings_cmd)
                if control and hasattr(control, 'isDropDown'):
                    control.isDropDown = False

    except Exception as e:
        if ui:
            error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
            show_error_message(ui, error_msg)


def stop(context: Dict[str, Any]) -> None:
    """
    Cleanup function called when the add-in is stopped or unloaded.

    Args:
        context (Dict[str, Any]): Context dictionary provided by Fusion
    """
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface

        # ====================================================================
        # CLEANUP PALETTE
        # ====================================================================

        global palette, _ready
        if palette:
            palette.deleteMe()
            palette = None
        _ready = False

        # ====================================================================
        # CLEANUP SERVICE BUTTONS
        # ====================================================================

        qat_toolbar = ui.toolbars.itemById('QATRight')

        for service_key, service in SERVICES.items():
            cmd_id = service['cmd_id']

            # Remove command definition
            cmd_def = ui.commandDefinitions.itemById(cmd_id)
            if cmd_def:
                cmd_def.deleteMe()

            # Remove control from QATRight
            cmd_control = qat_toolbar.controls.itemById(cmd_id)
            if cmd_control:
                cmd_control.deleteMe()

        # ====================================================================
        # CLEANUP SETTINGS COMMAND
        # ====================================================================

        settings_cmd_def = ui.commandDefinitions.itemById(SETTINGS_CMD_ID)
        if settings_cmd_def:
            settings_cmd_def.deleteMe()

        workspace = ui.workspaces.itemById('FusionSolidEnvironment')
        if workspace:
            addins_panel = workspace.toolbarPanels.itemById('SolidScriptsAddinsPanel')
            if addins_panel:
                settings_control = addins_panel.controls.itemById(SETTINGS_CMD_ID)
                if settings_control:
                    settings_control.deleteMe()

        # ====================================================================
        # CLEANUP EVENT HANDLERS
        # ====================================================================

        handlers.clear()
        service_commands.clear()
        service_controls.clear()

    except Exception:
        if ui:
            error_msg = ERROR_MSG_TEMPLATE.format(traceback.format_exc())
            show_error_message(ui, error_msg)
