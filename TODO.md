# GeneWeb Project TODO

## Panorama Tree Renderer (`grid-tree-renderer` branch)
- [x] Core CSS Grid layout with tilde-delimited template parsing
- [x] Per-row adaptive scaling
- [x] Click-to-reroot navigation (acts as zoom)
- [x] Persistent Sosa 1 identity via pz/nz URL params
- [x] Minimap with ancestor-depth triangles
- [x] Birth/death dates with wizard click-to-update
- [x] Marriage years between couples
- [x] Toolbar: floating transparent panel, drag-to-pan, minimap improvements
- [x] Gen controls, AJAX navigation, zoom clamp, Deep mode, gen labels (label offset fix in Build 228)
- [x] Zoom controls for Panoramic tree
- [x] Ancestor line highlighting, non-editable chart, minimap Sosa 1 dot
- [x] Scroll clamping: chart edges stay within viewport (drag + wheel/trackpad), dynamic minimap reserve, zoom suppression (Build 228)
- [ ] Dragging screen: 1. mouse-down spot on chart should stay under the mouse until 2. cursor goes off screen and 3. reappears on other side of screen while 4. continuing move in same direction. 5. Limit chart move to a padding distance from edges of the screen. Discuss before doing.
- [ ] Show the Sosa number under cursor in chart (and in minimap) as implemented in earlier builds as a debugging aid. However, draw these values in a fixed rectangle 45% height of minimap, aligned 10px from right edge of minimap to 10px shy of right edge of Generations + button, and in plane, uninverted text. Discuss before doing. As with debugging display, clear when there is no 4-arrow drag cursor.
- [ ] When dragging horizontally with shift key down, constrain cursor position to vertical position of mouse down before drag i.e. to the same generation.
- [ ] Draw rectangle border around the control panel at bottom, at a 3px distance from minimap and surrounding buttons. Assure drawing of chart does not occur within this rectangle. 
- [ ] Check functionality at a lower video resolution.
- [ ] Adjust parameters, if necessary, according to actual screen resolution.
- [ ] Visual polish — match quality of default ascending tree
- [ ] Merge grid-tree-renderer branch to master
- [ ] Rename all references from ‘Grid tree’ to ‘Panorama tree’
- [ ] make title of Panorama tree: ‘Ancestors of <name of original Sosa 1>’ OR, when a differrent display Sosa has been chosen, ‘Ancestors of <name of person with original Sosa 1> (from his/her Sosa <Sosa number of the display Sosa person with respect to actual Sosa 1>: <name of person with display Sosa 1>)’ . Discuss before doing.
- [x] When chart is first displayed it should fit between the page title and the top of the minimap (Build 228: auto-scroll positions Sosa 1 above minimap)
- [ ] Display should not jitter with mouse wheel

## Wiki Syntax Extensions
- [x] Natural name person links `[[First Last (oc)]]`
- [x] Inline images `[[image:...]]`
- [x] Floated images with captions `{{file|align|width|caption}}`
- [ ] Update README/docs with latest syntax

## macOS App Bundle
- [x] `create_bundle.sh` — self-contained `.app` with bundled dylibs
- [x] `create_dmg.sh` — distributable DMG
- [x] Launcher fix (`wait $GWD_PID`, `CFBundleExecutable` case match)
- [ ] Database import UX for new users (first-run wizard or config file)
- [ ] Keep `/Applications/geneweb.app` up to date with latest changes

## Upstream Proposals (geneweb/geneweb)
- [ ] File issue: macOS app bundle packaging (`make macos-bundle`)
- [ ] File issue: Database picker on first launch
- [ ] Prepare clean PRs branched from `upstream/master`

## General
- [ ] Cross-platform install (Windows .exe, Linux packages)
- [ ] SOSA tooltip unification across views
- [ ] Always provide a Build badge and always update with each new build. Make note of changes with respect to build and what those changes entailed, so as to be able to re-apply them or revert them if needed.

