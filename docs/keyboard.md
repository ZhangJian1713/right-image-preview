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
| `W` / Numpad `8` | Reveal up |
| `S` / Numpad `2` / Numpad `5` | Reveal down |
| `A` / Numpad `4` | Reveal left |
| `D` / Numpad `6` | Reveal right |
| Numpad `7` | Reveal upper-left |
| Numpad `9` | Reveal upper-right |
| Numpad `1` | Reveal lower-left |
| Numpad `3` | Reveal lower-right |
| `PageUp` / `PageDown` | First image of previous / next group |
| `F` | Toggle fullscreen, delegating to the host adapter when supplied |
| `?` | Invoke onShowShortcuts, when provided |
| `I` | Toggle EXIF panel when showExif=true |
| `Delete` / `Backspace` | Request host deletion when showDelete=true |
| `Esc` | Exit confirmed fullscreen; otherwise close preview |

Pan requires Native mode and geometric viewport overflow. Diagonal and cardinal speeds match. Physical
numpad identity is preserved with NumLock off. Zoom/pan allow repeat; navigation remains presentation-paced.
Single-shot actions ignore repeat. Blur, hidden documents, keyboard suspension and unmount release held state.

Ctrl/⌘/Shift + arrow keys are left to the host. Unlisted Ctrl/⌘/Alt combinations are left to the host, including modified Space. Space on a button retains
native button activation. Zoom input submits within the stops maximum; Enter commits and Esc cancels.

`getPreviewShortcutHelp({ navigation, groups, exif, delete, shortcuts })` returns action/key rows from the
actual fixed binding table. Pan has eight separate rows identified by `direction`; use `direction || action` as the row key. Hosts translate action/direction labels and filter unavailable features. There is no
rebinding API, persistence or customization UI.

Toggle-only fullscreen hosts such as VS Code retain preview-close semantics for Esc; use F/the fullscreen
button to toggle the window. Host help dialogs should handle Esc/? first, suspend image shortcuts, and restore focus.

Side-arrow holds track the initiating pointer. Window capture listeners handle release/cancel/lost capture even if a boundary arrow unmounts; pointer movement with no buttons pressed also ends an orphaned hold. Thumbnail selection cancels continuous navigation before jumping. Keyboard keyup cleanup runs in capture phase so focused controls cannot swallow release. Genuine holds remain presentation-paced.
