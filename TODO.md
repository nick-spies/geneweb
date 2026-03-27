# GeneWeb Project TODO

## Grid Tree Renderer (`grid-tree-renderer` branch)
- [x] Core CSS Grid layout with tilde-delimited template parsing
- [x] Per-row adaptive scaling
- [x] Click-to-reroot navigation (acts as zoom)
- [x] Persistent Sosa 1 identity via pz/nz URL params
- [x] Minimap with ancestor-depth triangles
- [x] Birth/death dates with wizard click-to-update
- [x] Marriage years between couples
- [x] Toolbar: floating transparent panel, drag-to-pan, minimap improvements
- [x] Gen controls, AJAX navigation, zoom clamp, Deep mode, gen labels
- [x] Zoom controls for Panoramic tree
- [x] Ancestor line highlighting, non-editable chart, minimap Sosa 1 dot
- [ ] Visual polish — match quality of default ascending tree
- [ ] Merge grid-tree-renderer branch to master

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
