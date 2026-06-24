// Shared opener for the global ⌘K command palette, kept out of the component
// file so React Fast Refresh stays happy (component files export only components).
export const OPEN_EVENT = 'loopsy:open-command-palette';

/** Open the global command palette from anywhere (e.g. a nav button). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}
