# Settings palette UI

React + shadcn/ui, on the same foundation as BradsUtilityToolbox and
ParametricGuitarFretboardMaker. Vite builds `src/` into `../ui_dist/`, which is
what Fusion loads.

```bash
npm install
npm run dev      # browser, with a mock settings state -- no Fusion needed
npm run build    # emits ../ui_dist/  <- commit this
npm run lint
```

**`ui_dist/` is committed.** The add-in has to load from a fresh clone without
anyone running npm, so the build output is checked in. Rebuild and commit it in
the same change as any edit under `src/`, or Fusion keeps showing the old page.

There is no test suite and no CI here, and none is implied by the presence of a
build. Verification is still a manual load in Fusion.

## Talking to Python

`src/lib/fusion-bridge.ts` is the only file that touches Fusion. Its action
names are the contract with `../Fusion Smart Search.py`; the
`_ACTION_HANDLERS` dict there is the authoritative list, and anything missing
from it is logged and dropped. Adding a message means editing both sides.

The bridge probes the bare `adsk` identifier via `typeof`, **not**
`window.adsk`. Fusion injects `adsk` into script scope and it is not reliably a
property of `window`; testing `window.adsk` gives a palette that renders
perfectly and can never call Python.

Outside Fusion the bridge synthesises a mock settings state, so the layout and
every control can be worked on in an ordinary browser.

## Colours

`src/index.css` carries the three Fusion themes as token blocks, selected by a
`data-theme` attribute. The neutrals are read from Fusion's own theme files --
that is what makes a docked palette match the panels beside it. This add-in has
no theme-polling module (unlike BradsUtilityToolbox's `lib/theme.py`), so the
palette always renders the bare `:root` block, which is Fusion's default Dark
Blue theme.

The brand amber (`--primary`) is a **fill, never a text colour**. Anything
drawn on it uses `--primary-foreground`.

No web fonts and no CDNs: Fusion runs offline routinely, so the type stack is
the system one and icons come from the bundled `lucide-react`.
