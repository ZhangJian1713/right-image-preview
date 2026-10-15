# Keyboard shortcuts

**English** · [中文](./keyboard.zh-CN.md)

Bindings are fixed. Overlay previews focus on open; contained previews respond only while focused.
Text fields, editable content and IME composition retain editing behavior. Hosts can pause image shortcuts
with `keyboardEnabled={false}` while displaying a dialog.

| Keys | Action |
| --- | --- |
| `←` / `Q`, `→` / `E` | Previous / next image; hold for paced navigation |
| `Home` / `End` | First / last image |
| `↑` / `+` / `=` / Numpad `+` | Zoom in one stop |
| `↓` / `-` / Numpad `-` | Zoom out one stop |
| `Space` / Numpad `0` | Adaptive cycle with clickZoomEnabled; otherwise Fit ↔ 100% |
| Main keyboard `0` / `1` | Fit / native 100% |
| `R` / `Shift+R` | Rotate 90° clockwise / counter-clockwise |
| `Ctrl/⌘+→` / `Ctrl/⌘+←` | Existing clockwise / counter-clockwise aliases |
| `W/A/S/D` | Reveal up / left / down / right |
| Numpad `8/4/2(or 5)/6` | Reveal up / left / down / right |
| Numpad `7/9/1/3` | Reveal upper-left / upper-right / lower-left / lower-right |
| `Shift+↑/↓/←/→` | Existing pan aliases |
| `PageUp` / `PageDown` | First image of previous / next group |
| `F` | Toggle fullscreen, delegating to the host adapter when supplied |
| `?` | Invoke onShowShortcuts, when provided |
| `I` | Toggle EXIF panel when showExif=true |
| `Delete` / `Backspace` | Request host deletion when showDelete=true |
| `Esc` | Exit confirmed fullscreen; otherwise close preview |

Pan requires Native mode and geometric viewport overflow. Diagonal and cardinal speeds match. Physical
numpad identity is preserved with NumLock off. Zoom/pan allow repeat; navigation remains presentation-paced.
Single-shot actions ignore repeat. Blur, hidden documents, keyboard suspension and unmount release held state.

Unlisted Ctrl/⌘/Alt combinations are left to the host, including modified Space. Space on a button retains
native button activation. Zoom input submits within the stops maximum; Enter commits and Esc cancels.

`getPreviewShortcutHelp({ navigation, groups, exif, delete, shortcuts })` returns action/key rows from the
actual fixed binding table. Hosts translate action labels and filter unavailable features. There is no
rebinding API, persistence or customization UI.

Toggle-only fullscreen hosts such as VS Code retain preview-close semantics for Esc; use F/the fullscreen
button to toggle the window. Host help dialogs should handle Esc/? first, suspend image shortcuts, and restore focus.
