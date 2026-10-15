/** Fixed built-in bindings. Hosts may read this reference; there is no rebinding API. */
export type PreviewShortcutAction = 'previous' | 'next' | 'first' | 'last' | 'previousGroup' | 'nextGroup'
  | 'zoomIn' | 'zoomOut' | 'fit' | 'actualSize' | 'cycleZoom' | 'rotateCW' | 'rotateCCW'
  | 'pan' | 'fullscreen' | 'shortcuts' | 'exif' | 'delete' | 'close';
export interface PreviewShortcutCapabilities {
  navigation?: boolean; groups?: boolean; exif?: boolean; delete?: boolean; shortcuts?: boolean;
}
interface Binding {
  code: string; label: string; shift?: boolean | 'any'; mod?: boolean; key?: string; pan?: readonly [number, number];
}
interface Definition { action: PreviewShortcutAction; bindings: readonly Binding[]; capability?: keyof PreviewShortcutCapabilities; repeat?: boolean }
const key = (code: string, label: string, extra: Partial<Binding> = {}): Binding => ({ code, label, ...extra });
const pan = (code: string, label: string, x: number, y: number, shift: boolean | 'any' = 'any') => key(code, label, { pan: [x, y], shift });
const definitions: readonly Definition[] = [
  { action: 'previous', capability: 'navigation', bindings: [key('ArrowLeft', '←'), key('KeyQ', 'Q')] },
  { action: 'next', capability: 'navigation', bindings: [key('ArrowRight', '→'), key('KeyE', 'E')] },
  { action: 'first', capability: 'navigation', bindings: [key('Home', 'Home')] },
  { action: 'last', capability: 'navigation', bindings: [key('End', 'End')] },
  { action: 'zoomIn', repeat: true, bindings: [key('ArrowUp', '↑'), key('Equal', '= / +', { shift: 'any' }), key('NumpadAdd', 'Numpad +', { shift: 'any' })] },
  { action: 'zoomOut', repeat: true, bindings: [key('ArrowDown', '↓'), key('Minus', '-', { shift: 'any' }), key('NumpadSubtract', 'Numpad -', { shift: 'any' })] },
  { action: 'cycleZoom', bindings: [key('Space', 'Space'), key('Numpad0', 'Numpad 0', { shift: 'any' })] },
  { action: 'fit', bindings: [key('Digit0', '0')] },
  { action: 'actualSize', bindings: [key('Digit1', '1')] },
  { action: 'rotateCW', bindings: [key('KeyR', 'R'), key('ArrowRight', 'Ctrl/⌘ + →', { mod: true })] },
  { action: 'rotateCCW', bindings: [key('KeyR', 'Shift + R', { shift: true }), key('ArrowLeft', 'Ctrl/⌘ + ←', { mod: true })] },
  { action: 'pan', repeat: true, bindings: [
    pan('KeyW', 'W', 0, 1), pan('KeyA', 'A', 1, 0), pan('KeyS', 'S', 0, -1), pan('KeyD', 'D', -1, 0),
    pan('Numpad8', 'Numpad 8', 0, 1), pan('Numpad4', 'Numpad 4', 1, 0), pan('Numpad2', 'Numpad 2', 0, -1),
    pan('Numpad5', 'Numpad 5', 0, -1), pan('Numpad6', 'Numpad 6', -1, 0),
    pan('Numpad7', 'Numpad 7', 1, 1), pan('Numpad9', 'Numpad 9', -1, 1),
    pan('Numpad1', 'Numpad 1', 1, -1), pan('Numpad3', 'Numpad 3', -1, -1),
    pan('ArrowUp', 'Shift + ↑', 0, 1, true), pan('ArrowDown', 'Shift + ↓', 0, -1, true),
    pan('ArrowLeft', 'Shift + ←', 1, 0, true), pan('ArrowRight', 'Shift + →', -1, 0, true),
  ] },
  { action: 'fullscreen', bindings: [key('KeyF', 'F')] },
  { action: 'shortcuts', capability: 'shortcuts', bindings: [key('Slash', '?', { key: '?', shift: 'any' })] },
  { action: 'exif', capability: 'exif', bindings: [key('KeyI', 'I')] },
  { action: 'delete', capability: 'delete', bindings: [key('Delete', 'Delete'), key('Backspace', 'Backspace')] },
  { action: 'previousGroup', capability: 'groups', bindings: [key('PageUp', 'Page Up')] },
  { action: 'nextGroup', capability: 'groups', bindings: [key('PageDown', 'Page Down')] },
  { action: 'close', bindings: [key('Escape', 'Esc')] },
];
const fallbackCodes: Record<string, string> = { ' ': 'Space', '?': 'Slash', '+': 'Equal', '=': 'Equal', '-': 'Minus', Add: 'NumpadAdd', Subtract: 'NumpadSubtract' };
export function previewPhysicalKey(event: Pick<KeyboardEvent, 'code' | 'key'>): string {
  if (event.code && event.code !== 'Unknown' && event.code !== 'Unidentified') return event.code;
  if (/^[a-z]$/i.test(event.key)) return `Key${event.key.toUpperCase()}`;
  if (/^[0-9]$/.test(event.key)) return `Digit${event.key}`;
  return fallbackCodes[event.key] ?? event.key;
}
function available(definition: Definition, capabilities: PreviewShortcutCapabilities): boolean {
  return !definition.capability || capabilities[definition.capability] === true;
}
export function getPreviewShortcutHelp(capabilities: PreviewShortcutCapabilities = {}) {
  return definitions.filter((definition) => available(definition, capabilities)).map((definition) => ({
    action: definition.action, keys: definition.bindings.map((binding) => binding.label),
  }));
}
export function resolvePreviewShortcut(event: KeyboardEvent, capabilities: PreviewShortcutCapabilities, canPan: boolean) {
  if (event.isComposing || event.key === 'Process' || event.keyCode === 229) return null;
  const code = previewPhysicalKey(event);
  for (const definition of definitions) {
    if (!available(definition, capabilities) || (definition.action === 'pan' && !canPan)) continue;
    const binding = definition.bindings.find((binding) => binding.code === code
      && (!binding.key || binding.key === event.key)
      && !event.altKey && (event.ctrlKey || event.metaKey) === (binding.mod === true)
      && (binding.shift === 'any' || event.shiftKey === (binding.shift === true)));
    if (binding) return { action: definition.action, repeat: definition.repeat === true, pan: binding.pan, physicalKey: code };
  }
  return null;
}
