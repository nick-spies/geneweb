/**
 * tree_render.js — Panoramic ancestor tree renderer
 *
 * Each family unit (couple + child) is a self-contained flex container.
 * Parent branches expand to fit their content — no shared grid columns.
 * Connector lines are positioned after layout using measured DOM positions.
 */

// ── PersonBox ──────────────────────────────────────────────────────────────

function PersonBox(person) {
  this.person = person;
  this.imgSize = 50;
  this.fontSize = 0.8;
  this.showImage = true;
  this.showSurname = true;
  this.showSosa = true;
  this.showDates = true;
}

PersonBox.prototype.displayName = function() {
  var p = this.person;
  return (p.publicName || p.firstName) + ' ' + p.surname;
};

PersonBox.prototype.dateSpan = function() {
  var p = this.person;
  var b = p.birthYear || '\u2014';
  var d = p.deathYear || '\u2014';
  if (b === '\u2014' && d === '\u2014') return '\u2014';
  return b + '\u2013' + d;
};

PersonBox.prototype.tooltipText = function() {
  var p = this.person;
  var parts = [];
  var showSosa = this.positionSosa || p.displaySosa || p.posSosa;
  if (showSosa) parts.push('Sosa ' + showSosa);
  parts.push((p.sex === 0 ? '\u2642' : '\u2640') + ' ' + this.displayName());
  var dates = this.dateSpan();
  if (dates) parts.push('(' + dates + ')');
  return parts.join(' ');
};

PersonBox.prototype.render = function() {
  var p = this.person;
  var box = document.createElement('div');
  box.className = 'person-box' + (p.sex === 0 ? ' person-male' : ' person-female');
  box.title = this.tooltipText();



  var sosaLabel = this.positionSosa || p.displaySosa || p.posSosa;
  if (this.showSosa && sosaLabel) {
    var badge = document.createElement('span');
    badge.className = 'person-sosa';
    badge.textContent = sosaLabel;
    badge.title = 'Sosa ' + sosaLabel;
    box.appendChild(badge);
  }

  if (this.showImage) {
    if (p.hasImage && p.imageUrl) {
      var imgLink = document.createElement('a');
      imgLink.href = p.imageUrl;
      imgLink.target = '_blank';
      imgLink.title = 'View full image';
      imgLink.className = 'person-image-link';
      var img = document.createElement('img');
      img.src = p.imageUrl;
      img.className = 'person-image';
      img.style.maxWidth = this.imgSize + 'px';
      img.style.maxHeight = this.imgSize + 'px';
      img.alt = this.displayName();
      imgLink.appendChild(img);
      box.appendChild(imgLink);
    } else {
      var spacer = document.createElement('div');
      spacer.style.height = this.imgSize + 'px';
      box.appendChild(spacer);
    }
  }

  var nameLink = document.createElement('a');
  nameLink.href = p.access;
  nameLink.className = 'person-name';
  nameLink.style.fontSize = this.fontSize + 'rem';
  nameLink.title = this.tooltipText() + ' (click: re-root tree, \u2318-click: person page)';

  var treeAccess = this.treeAccess;
  if (treeAccess) {
    nameLink.addEventListener('click', function(e) {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      var container = document.getElementById('tree-grid-container');
      if (container && container._renderer && container._renderer._highlightedSosa) return;
      window.location.href = treeAccess(p.access);
    });
  }

  var firstName = document.createElement('span');
  firstName.className = 'person-first-name';
  firstName.textContent = p.publicName || p.firstName;
  nameLink.appendChild(firstName);

  if (this.showSurname) {
    var surname = document.createElement('span');
    surname.className = 'person-surname';
    if (p.surname && p.surname !== 'x' && p.surname !== '?') {
      surname.textContent = p.surname;
    } else {
      surname.innerHTML = '&nbsp;';
    }
    nameLink.appendChild(surname);
  }

  box.appendChild(nameLink);

  if (this.showDates) {
    var dates = this.dateSpan();
    if (dates) {
      var dateEl = document.createElement('span');
      dateEl.className = 'person-dates';
      dateEl.textContent = dates;
      dateEl.style.fontSize = (this.fontSize * 0.85) + 'rem';
      box.appendChild(dateEl);
    }
  }

  return box;
};

// ── TreeRenderer ───────────────────────────────────────────────────────────

function TreeRenderer(container, data, options) {
  this.container = container;
  this.data = data;
  this.options = options || {};
}

TreeRenderer.parseTreeData = function(text) {
  var data = { rows: [] };
  var tokens = text.split('~ROW~');
  for (var i = 1; i < tokens.length; i++) {
    var rowChunk = tokens[i];
    var cellTokens = rowChunk.split('~CELL~');
    var isFirst = cellTokens[0].trim() === '1';
    var row = { isFirst: isFirst, cells: [] };
    for (var j = 1; j < cellTokens.length; j++) {
      var parts = cellTokens[j].split('~');
      var cell = {
        colspan: parseInt(parts[0]) || 1,
        isEmpty: parts[1] === '1',
        isTop: parts[2] === '1',
        isLeft: parts[3] === '1',
        isRight: parts[4] === '1'
      };
      if (!cell.isEmpty && parts[5]) {
        cell.person = {
          firstName: parts[5] || '',
          surname: parts[6] || '',
          publicName: parts[7] || '',
          access: parts[8] || '',
          sex: parseInt(parts[9]) || 0,
          hasImage: parts[10] === '1',
          imageUrl: parts[11] || '',
          hasSosa: parts[12] === '1',
          sosa: parts[13] || '',
          birthYear: parts[14] || '',
          deathYear: parts[15] || '',
          hasParents: parts[17] === '1'
        };
        if (cell.isRight) {
          cell.family = { marriageYear: parts[16] || '' };
        }
      }
      row.cells.push(cell);
    }
    data.rows.push(row);
  }
  return data;
};

TreeRenderer.prototype.rowStyle = function(numCells) {
  if (numCells <= 2)  return { fontSize: 0.85, imgSize: 50, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 4)  return { fontSize: 0.80, imgSize: 45, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 8)  return { fontSize: 0.75, imgSize: 38, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 16) return { fontSize: 0.70, imgSize: 30, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 32) return { fontSize: 0.65, imgSize: 25, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 64) return { fontSize: 0.60, imgSize: 20, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  return                      { fontSize: 0.55, imgSize: 0,  showImage: false, showSurname: true,  showSosa: true,  showDates: true  };
};

TreeRenderer.prototype.render = function() {
  // Cleanup from previous render (for in-place re-render)
  var wrapper = this.container.parentNode;
  if (wrapper) {
    var oldCols = wrapper.querySelectorAll('.gen-label-col');
    for (var ci = 0; ci < oldCols.length; ci++) oldCols[ci].remove();
  }

  var rows = this.data.rows;
  if (!rows || !rows.length) {
    this.updateTitle();
    return;
  }

  var totalGens = rows.length; // number of rows
  var topGen = totalGens - 1;  // generation number of the topmost row

  // Build sosaMap using horizontal containment (handles pedigree collapse)
  // Step 1: Compute horizontal position for each cell from colspans
  var sosaMap = {};
  var marriageMap = {};
  for (var r = 0; r < rows.length; r++) {
    var pos = 0;
    var cells = rows[r].cells;
    for (var c = 0; c < cells.length; c++) {
      if (c > 0) pos++; // separator column
      cells[c]._start = pos;
      cells[c]._end = pos + cells[c].colspan - 1;
      cells[c]._center = (cells[c]._start + cells[c]._end) / 2;
      pos += cells[c].colspan;
    }
  }

  // Step 2: Assign positional Sosa bottom-up
  var bottomCells = rows[rows.length - 1].cells;
  if (bottomCells.length > 0) {
    bottomCells[0]._posSosa = 1;
    if (bottomCells[0].person) {
      bottomCells[0].person.posSosa = 1;
      if (bottomCells[0].person.sosa) bottomCells[0].person.displaySosa = bottomCells[0].person.sosa;
      sosaMap[1] = bottomCells[0].person;
    }
  }

  // Walk upward: each parent cell's center falls within its child cell's span
  for (var r = rows.length - 2; r >= 0; r--) {
    var parentCells = rows[r].cells;
    var childCells = rows[r + 1].cells;
    for (var p = 0; p < parentCells.length; p++) {
      var pCell = parentCells[p];
      if (!pCell.isLeft && !pCell.isRight) continue;
      // Find the child cell whose horizontal span contains this parent
      for (var c = 0; c < childCells.length; c++) {
        var ch = childCells[c];
        if (ch._posSosa && ch._start <= pCell._center && pCell._center <= ch._end) {
          pCell._posSosa = pCell.isLeft ? ch._posSosa * 2 : ch._posSosa * 2 + 1;
          break;
        }
      }
      if (pCell._posSosa && pCell.person) {
        pCell.person.posSosa = pCell._posSosa;
        if (pCell.person.sosa) pCell.person.displaySosa = pCell.person.sosa;
        sosaMap[pCell._posSosa] = pCell.person;
      }
      if (pCell._posSosa && pCell.isRight && pCell.family && pCell.family.marriageYear) {
        marriageMap[pCell._posSosa >> 1] = pCell.family.marriageYear;
      }
    }
  }
  this._marriageMap = marriageMap;

  // Build treeAccess function for re-rooting
  var opts = this.options;
  var gens = opts.generations || 3;
  var pzMatch = (opts.selfAccess || '').match(/[?&]pz=([^&]*)/);
  var nzMatch = (opts.selfAccess || '').match(/[?&]nz=([^&]*)/);
  var oczMatch = (opts.selfAccess || '').match(/[?&]ocz=([^&]*)/);
  var sosa1Pz = pzMatch ? pzMatch[1] : '';
  var sosa1Nz = nzMatch ? nzMatch[1] : '';
  var sosa1Ocz = oczMatch ? oczMatch[1] : '';

  var treeAccess = function(personAccess) {
    var sep = personAccess.indexOf('?') >= 0 ? '&' : '?';
    var url = personAccess + sep + 'm=A&t=T&t1=GR';
    if (sosa1Pz) url += '&pz=' + sosa1Pz + '&nz=' + sosa1Nz + '&ocz=' + sosa1Ocz;
    return url;
  };

  this._sosaMap = sosaMap;
  var self = this;
  var maxSosa = Math.pow(2, topGen + 1) - 1; // highest possible sosa in this tree

  // No per-generation sizing — uniform min-width via CSS on .fu-person
  // Compact cells get a smaller cap via maxWidth

  // Recursive: build DOM subtree for a sosa position
  function buildSubtree(sosa) {
    var gen = Math.floor(Math.log2(sosa));
    var person = sosaMap[sosa];
    var cellsInGen = Math.pow(2, gen);
    var style = self.rowStyle(cellsInGen);

    var unit = document.createElement('div');
    unit.className = 'fu';
    unit.setAttribute('data-sosa', sosa);

    var fatherSosa = sosa * 2;
    var motherSosa = sosa * 2 + 1;
    var hasFather = sosaMap[fatherSosa] !== undefined;
    var hasMother = sosaMap[motherSosa] !== undefined;
    var showParents = (hasFather || hasMother) && fatherSosa <= maxSosa;

    if (showParents) {
      var parentsRow = document.createElement('div');
      parentsRow.className = 'fu-parents';

      // Father branch
      var fBranch = document.createElement('div');
      fBranch.className = 'fu-branch';
      if (hasFather) {
        fBranch.appendChild(buildSubtree(fatherSosa));
      } else {
        var empty = document.createElement('div');
        empty.className = 'fu-empty';
        fBranch.appendChild(empty);
      }
      parentsRow.appendChild(fBranch);

      // Mother branch
      var mBranch = document.createElement('div');
      mBranch.className = 'fu-branch';
      if (hasMother) {
        mBranch.appendChild(buildSubtree(motherSosa));
      } else {
        var empty = document.createElement('div');
        empty.className = 'fu-empty';
        mBranch.appendChild(empty);
      }
      parentsRow.appendChild(mBranch);

      unit.appendChild(parentsRow);

      // Connector placeholder (positioned by JS after layout)
      var conn = document.createElement('div');
      conn.className = 'fu-conn';
      conn.setAttribute('data-sosa', sosa);
      conn.setAttribute('data-father', fatherSosa);
      conn.setAttribute('data-mother', motherSosa);

      // Marriage year label
      var mYear = marriageMap[sosa] || '';
      var marr = document.createElement('span');
      marr.className = 'tree-marriage';
      marr.textContent = mYear || '';
      conn.appendChild(marr);

      unit.appendChild(conn);
    }

    // Person box
    if (person) {
      var personEl = document.createElement('div');
      personEl.className = 'fu-person';
      personEl.setAttribute('data-sosa', sosa);
      personEl.setAttribute('data-gen', gen + 1);

      var pb = new PersonBox(person);
      pb.showImage = style.showImage;
      pb.imgSize = style.imgSize;
      pb.fontSize = style.fontSize;
      pb.showSurname = style.showSurname;
      pb.showSosa = style.showSosa;
      pb.showDates = style.showDates;
      pb.treeAccess = treeAccess;
      pb.options = opts;
      pb.positionSosa = sosa;


      var renderedBox = pb.render();
      renderedBox.setAttribute('data-sosa', sosa);
      personEl.appendChild(renderedBox);
      unit.appendChild(personEl);
    }

    return unit;
  }

  // Build the tree from Sosa 1
  var tree = buildSubtree(1);
  tree.classList.add('fu-root');

  // Wrap tree in zoom container
  var zoomWrap = document.createElement('div');
  zoomWrap.className = 'tree-zoom-wrap';
  zoomWrap.appendChild(tree);

  this.container.innerHTML = '';
  this.container.appendChild(zoomWrap);

  // Position connector lines after layout
  this.positionConnectors(tree);

  var container = this.container;

  // Zoom state — min zoom fits the entire tree in the viewport
  var zoomLevel = 1.0;
  var minZoom = 0.20;
  var maxZoom = 2.0;
  var zoomFactor = 1.06; // 6% multiplicative per step
  // Default: scroll up = zoom in (natural). Toggle stores '1' for inverted.
  var zoomInvert = localStorage.getItem('treeZoomInvert') === '1' ? -1 : 1;
  this._setZoomInvert = function() {
    zoomInvert = localStorage.getItem('treeZoomInvert') === '1' ? -1 : 1;
  };
  this._zoomLevel = zoomLevel;
  this._zoomWrap = zoomWrap;

  // ── Scroll/Zoom/Clamp plumbing ──
  // All geometry in `geo` object (self._geo). Clamp called:
  //   - Synchronous scroll listener (skipped when position matches zoom target)
  //   - Explicitly at end of zoomAt(), panToMinimap(), auto-scroll
  //   - Explicitly in drag handler (pre-clamp pattern)
  var geo = {
    treeW: tree.scrollWidth,
    treeH: tree.scrollHeight,
    padX: 0,   // set after treePadPx init below
    padY: 0,
    zoom: zoomLevel,
    containerW: container.clientWidth,
    containerH: container.clientHeight,
    botReserve: 155
  };
  self._geo = geo;

  // Padding so any person can be scrolled to center of viewport at any zoom.
  // Sized for the full zoom range so it never needs to grow mid-zoom.
  var treePadPx = Math.round(container.clientWidth / minZoom);
  var treePadPxV = Math.round(container.clientHeight / minZoom);
  geo.padX = treePadPx;
  geo.padY = treePadPxV;

  function updatePadding() {
    tree.style.marginLeft = treePadPx + 'px';
    tree.style.marginRight = treePadPx + 'px';
    tree.style.marginTop = treePadPxV + 'px';
    tree.style.marginBottom = treePadPxV + 'px';
  }
  updatePadding();

  // ── Virtual scroll ──
  // Browsers cap element dimensions (~17.9M px in Firefox). When the tree
  // exceeds this, we cap the zoomWrap size and use CSS translate to shift
  // content, making the full tree accessible via (scrollLeft + vOffX).
  var MAX_WRAP_PX = 8000000; // safe for all browsers
  var vOffX = 0, vOffY = 0;  // virtual offset (scaled px)
  var fullWrapW = 0, fullWrapH = 0; // uncapped sizes

  function getEffSL() { return container.scrollLeft + vOffX; }
  function getEffST() { return container.scrollTop + vOffY; }
  var _suppressScroll = 0;
  // Track the last intended effective scroll position so zoomAt can
  // read it instead of getEffSL/ST (which may be wrong if the browser
  // auto-clamped scrollLeft/Top between zoom steps).
  var _intendedSL = 0, _intendedST = 0;
  function setEffScroll(sl, st) {
    _suppressScroll++;
    // Clamp to valid effective scroll range so _intendedSL/ST never
    // store impossible values (prevents compounding error across zoom steps)
    var maxEffSL = Math.max(0, fullWrapW - container.clientWidth);
    var maxEffST = Math.max(0, fullWrapH - container.clientHeight);
    sl = Math.max(0, Math.min(maxEffSL, sl));
    st = Math.max(0, Math.min(maxEffST, st));
    _intendedSL = sl;
    _intendedST = st;
    var maxNativeSL = Math.max(0, Math.min(fullWrapW, MAX_WRAP_PX) - container.clientWidth);
    var maxNativeST = Math.max(0, Math.min(fullWrapH, MAX_WRAP_PX) - container.clientHeight);
    vOffX = Math.max(0, sl - maxNativeSL);
    vOffY = Math.max(0, st - maxNativeST);
    container.scrollLeft = sl - vOffX;
    container.scrollTop = st - vOffY;
    _suppressScroll--;
    updateTransform();
    if (self._updateViewport) self._updateViewport();
  }
  self._getEffSL = getEffSL;
  self._getEffST = getEffST;
  self._setEffScroll = setEffScroll;

  function updateTransform() {
    if (vOffX === 0 && vOffY === 0) {
      zoomWrap.style.transform = 'scale(' + zoomLevel + ')';
    } else {
      zoomWrap.style.transform = 'translate(' + (-vOffX) + 'px,' + (-vOffY) + 'px) scale(' + zoomLevel + ')';
    }
  }

  function updateWrapSize() {
    var scaledW = (geo.treeW + treePadPx * 2) * zoomLevel;
    var scaledH = (geo.treeH + treePadPxV * 2) * zoomLevel;
    fullWrapW = scaledW + container.clientWidth;
    fullWrapH = scaledH + container.clientHeight;
    zoomWrap.style.width = Math.min(fullWrapW, MAX_WRAP_PX) + 'px';
    zoomWrap.style.height = Math.min(fullWrapH, MAX_WRAP_PX) + 'px';
    // Don't call updateTransform here — let setEffScroll handle it
    // to avoid a flash with stale vOffX/vOffY during zoom.
  }
  updateWrapSize();
  updateTransform(); // initial transform only

  // Scroll clamp: prevents tree from scrolling off viewport.
  // Uses rAF coalescing to avoid jitter from fighting with scroll events.
  var _clampRAF = 0;
  function clampScroll() {
    var z = zoomLevel;
    var vw = container.clientWidth;
    var vh = container.clientHeight - geo.botReserve;
    var treeL = treePadPx * z;
    var treeR = (treePadPx + geo.treeW) * z;
    var treeT = treePadPxV * z;
    var treeB = (treePadPxV + geo.treeH) * z;

    // Don't scroll tree edge beyond viewport edge (tight clamp)
    var minSL, maxSL, minST, maxST;
    if (treeR - treeL >= vw) {
      minSL = treeL;
      maxSL = treeR - vw;
    } else {
      // Tree smaller than viewport: keep it centered-ish
      var centerSL = (treeL + treeR) / 2 - vw / 2;
      minSL = centerSL;
      maxSL = centerSL;
    }
    if (treeB - treeT >= vh) {
      minST = treeT;
      maxST = treeB - vh;
    } else {
      var centerST = (treeT + treeB) / 2 - vh / 2;
      minST = centerST;
      maxST = centerST;
    }

    var sl = getEffSL(), st = getEffST();
    var newSL = Math.max(minSL, Math.min(maxSL, sl));
    var newST = Math.max(minST, Math.min(maxST, st));
    if (Math.abs(newSL - sl) > 1 || Math.abs(newST - st) > 1) {
      setEffScroll(newSL, newST);
    }
  }
  // Fallback clamp for keyboard/scrollbar scrolling (wheel is handled above).
  // Wraps clampScroll in _suppressScroll so its setEffScroll doesn't trigger
  // another scroll→clamp cycle.
  container.addEventListener('scroll', function() {
    if (_suppressScroll > 0) return;
    if (_clampRAF) return;
    _clampRAF = requestAnimationFrame(function() {
      _clampRAF = 0;
      if (_suppressScroll > 0) return;
      _suppressScroll++;
      clampScroll();
      requestAnimationFrame(function() { _suppressScroll--; });
    });
  });

  // Zoom anchored on a point (anchorX/Y in viewport-relative coords)
  function zoomAt(newZoom, anchorX, anchorY) {
    var oldZoom = zoomLevel;
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    newZoom = Math.round(newZoom * 1000) / 1000;
    if (newZoom === oldZoom) return;

    // Use intended position (immune to browser auto-clamping between steps)
    var treePosX = (_intendedSL + anchorX) / oldZoom - treePadPx;
    var treePosY = (_intendedST + anchorY) / oldZoom - treePadPxV;

    zoomLevel = newZoom;
    self._zoomLevel = zoomLevel;
    geo.zoom = zoomLevel;

    // Suppress scroll clamp during zoom (including async scroll events)
    _suppressScroll++;

    // Compute target scroll BEFORE changing the DOM
    var newSL = (treePosX + treePadPx) * zoomLevel - anchorX;
    var newST = (treePosY + treePadPxV) * zoomLevel - anchorY;

    // Update wrap dimensions (sets fullWrapW/H and CSS width/height)
    updateWrapSize();

    // Pre-compute the effective scroll + vOff split so we can set the
    // transform BEFORE forcing layout.  This eliminates flash frames
    // where the browser reflows with stale scroll + wrong transform.
    var maxEffSL = Math.max(0, fullWrapW - container.clientWidth);
    var maxEffST = Math.max(0, fullWrapH - container.clientHeight);
    newSL = Math.max(0, Math.min(maxEffSL, newSL));
    newST = Math.max(0, Math.min(maxEffST, newST));
    var maxNativeSL = Math.max(0, Math.min(fullWrapW, MAX_WRAP_PX) - container.clientWidth);
    var maxNativeST = Math.max(0, Math.min(fullWrapH, MAX_WRAP_PX) - container.clientHeight);
    vOffX = Math.max(0, newSL - maxNativeSL);
    vOffY = Math.max(0, newST - maxNativeST);

    // Set transform first (visual-only, no reflow) so the correct
    // position is shown even if the browser paints during forced layout.
    updateTransform();

    // Now force layout and set scroll position
    void container.scrollWidth;
    _intendedSL = newSL;
    _intendedST = newST;
    container.scrollLeft = newSL - vOffX;
    container.scrollTop = newST - vOffY;
    // Delay _suppressScroll decrement to next frame so async scroll events
    // from the scrollLeft/scrollTop assignment above are still suppressed.
    if (_clampRAF) { cancelAnimationFrame(_clampRAF); _clampRAF = 0; }
    requestAnimationFrame(function() { _suppressScroll--; });

    if (self._redrawMinimap) self._redrawMinimap();
    if (self._updateGenLabels) self._updateGenLabels();
  }

  // Zoom centered on viewport (direction: 1 = in, -1 = out)
  function zoomCenter(direction) {
    var newZoom = direction > 0 ? zoomLevel * zoomFactor : zoomLevel / zoomFactor;
    zoomAt(newZoom, container.clientWidth / 2, container.clientHeight / 2);
  }
  this._zoomCenter = zoomCenter;
  this._zoomAt = zoomAt;

  // Wheel handler: Shift+Ctrl/Cmd = zoom, otherwise pan (virtual scroll aware)
  container.addEventListener('wheel', function(e) {
    if (e.shiftKey && (e.metaKey || e.ctrlKey)) {
      // Zoom anchored on cursor
      e.preventDefault();
      var rect = container.getBoundingClientRect();
      var anchorX = e.clientX - rect.left;
      var anchorY = e.clientY - rect.top;
      var delta = (e.deltaY !== 0 ? e.deltaY : e.deltaX) * zoomInvert;
      var newZoom = delta < 0 ? zoomLevel * zoomFactor : zoomLevel / zoomFactor;
      zoomAt(newZoom, anchorX, anchorY);
      return;
    }
    // Intercept all wheel scroll and apply manually with boundary clamping.
    // This prevents native scroll → clamp → scroll jitter loops.
    e.preventDefault();
    var dx = e.deltaX, dy = e.deltaY;
    setEffScroll(getEffSL() + dx, getEffST() + dy);
    clampScroll();
  }, { passive: false });

  // Click-and-drag to pan (standard drag, no pointer lock)
  (function() {
    var dragging = false, moved = false, dragEndTime = 0;
    var lastX, lastY;
    var zoomWrap = container.querySelector('.tree-zoom-wrap');
    container.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      dragging = true; moved = false;
      lastX = e.clientX; lastY = e.clientY;
      if (zoomWrap) zoomWrap.style.pointerEvents = 'none';
      container.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      if (!moved) return;
      lastX = e.clientX; lastY = e.clientY;
      setEffScroll(getEffSL() - dx, getEffST() - dy);
      clampScroll();
    });
    window.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragEndTime = Date.now();
      dragging = false;
      moved = false;
      if (zoomWrap) zoomWrap.style.pointerEvents = '';
      container.style.cursor = 'grab';
    });
    container.addEventListener('click', function(e) {
      if (e.target.closest('.person-sosa')) return; // sosa clicks always pass
      if (Date.now() - dragEndTime < 300) { e.preventDefault(); e.stopPropagation(); return; }
    }, true);
    container.style.cursor = 'grab';
  })();

  // Ancestor line highlighting on sosa badge click
  this.container._renderer = this;
  this.setupLineHighlight(tree);

  // Auto-scroll to center Sosa 1 (skipped during gen change — caller restores position)
  if (!this._skipAutoScroll) {
    var sosa1El = tree.querySelector('.fu-person[data-sosa="1"]');
    if (sosa1El) {
      requestAnimationFrame(function() {
        // Strip transform so getBoundingClientRect gives raw layout px
        var savedTransform = zoomWrap.style.transform;
        zoomWrap.style.transform = 'none';
        container.scrollLeft = 0;
        container.scrollTop = 0;
        vOffX = 0; vOffY = 0;
        void zoomWrap.offsetWidth; // force layout

        // Measure sosa1 position relative to zoomWrap origin
        var wrapR = zoomWrap.getBoundingClientRect();
        var sosaR = sosa1El.getBoundingClientRect();
        var contentX = sosaR.left + sosaR.width / 2 - wrapR.left;
        var contentY = sosaR.top + sosaR.height / 2 - wrapR.top;

        // Restore transform
        zoomWrap.style.transform = savedTransform;

        // Scroll so this content point is centered in viewport
        var newSL = contentX * zoomLevel - container.clientWidth / 2;
        var visibleH = geo.containerH - geo.botReserve;
        var newST = contentY * zoomLevel - visibleH + 40;
        setEffScroll(newSL, newST);
        clampScroll();
      });
    }
  }
  this._skipAutoScroll = false;

  this.updateTitle();

  this._treeAccess = treeAccess;
  this._zoomCenter = zoomCenter;
  this._getZoom = function() { return zoomLevel; };
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      self.buildToolbar(tree);
      self.addGenCursorLabel(tree, container);
    });
  });
};

// ── Connector positioning (post-layout) ───────────────────────────────────

TreeRenderer.prototype.positionConnectors = function(root) {
  var connectors = root.querySelectorAll('.fu-conn');
  for (var i = 0; i < connectors.length; i++) {
    var conn = connectors[i];
    var fSosa = conn.getAttribute('data-father');
    var mSosa = conn.getAttribute('data-mother');
    var childSosa = parseInt(fSosa) >> 1; // parent of father = child

    var connRect = conn.getBoundingClientRect();
    var connL = connRect.left;
    var connW = connRect.width;

    // Find the immediate father and mother person cells
    var fEl = root.querySelector('.fu-person[data-sosa="' + fSosa + '"]');
    var mEl = root.querySelector('.fu-person[data-sosa="' + mSosa + '"]');

    var fCenter = connW / 4;  // fallback
    var mCenter = connW * 3 / 4; // fallback

    if (fEl) {
      var fRect = fEl.getBoundingClientRect();
      fCenter = fRect.left + fRect.width / 2 - connL;
    }
    if (mEl) {
      var mRect = mEl.getBoundingClientRect();
      mCenter = mRect.left + mRect.width / 2 - connL;
    }

    // Vertical line from father center (top → 50%)
    if (fEl) {
      var fVert = document.createElement('div');
      fVert.className = 'fc-vert';
      fVert.style.left = fCenter + 'px';
      conn.appendChild(fVert);
    }

    // Vertical line from mother center (top → 50%)
    if (mEl) {
      var mVert = document.createElement('div');
      mVert.className = 'fc-vert';
      mVert.style.left = mCenter + 'px';
      conn.appendChild(mVert);
    }

    // Horizontal bar connecting parent centers at 50% height
    var hBar = document.createElement('div');
    hBar.className = 'fc-hbar';
    var hLeft = fEl ? fCenter : mCenter;
    var hRight = mEl ? mCenter : fCenter;
    hBar.style.left = Math.min(hLeft, hRight) + 'px';
    hBar.style.width = Math.abs(hRight - hLeft) + 'px';
    conn.appendChild(hBar);

    // Trunk from parents' midpoint down to child
    var trunkX = (hLeft + hRight) / 2;
    var trunk = document.createElement('div');
    trunk.className = 'fc-trunk';
    trunk.style.left = trunkX + 'px';
    conn.appendChild(trunk);

    // Position marriage label at trunk center
    var marriageLabel = conn.querySelector('.tree-marriage');
    if (marriageLabel) {
      marriageLabel.style.left = trunkX + 'px';
    }

    // Align child under trunk: shift child so its center matches trunkX
    // Find the direct child .fu-person of this family-unit
    var fu = conn.parentNode;
    var childEl = null;
    for (var ch = 0; ch < fu.children.length; ch++) {
      var kid = fu.children[ch];
      if (kid.classList.contains('fu-person') && kid.getAttribute('data-sosa') === '' + childSosa) {
        childEl = kid;
        break;
      }
    }
    if (childEl) {
      // trunkX is relative to connector; connector is width:100% of fu
      var connOffset = conn.getBoundingClientRect().left - fu.getBoundingClientRect().left;
      var trunkInFu = trunkX + connOffset;
      var childRect = childEl.getBoundingClientRect();
      var fuRect = fu.getBoundingClientRect();
      var childCenter = childRect.left + childRect.width / 2 - fuRect.left;
      var offset = trunkInFu - childCenter;
      if (Math.abs(offset) > 1) {
        childEl.style.position = 'relative';
        childEl.style.left = offset.toFixed(1) + 'px';
      }
    }
  }
};


// ── Persistent generation labels on left and right edges ─────────────────

TreeRenderer.prototype.addGenCursorLabel = function(tree, container) {
  var self = this;

  // Measure vertical midpoint of each generation (in unscaled tree coords)
  var genMids = {};
  var persons = tree.querySelectorAll('.fu-person[data-gen]');
  for (var i = 0; i < persons.length; i++) {
    var g = parseInt(persons[i].getAttribute('data-gen'));
    var r = persons[i].getBoundingClientRect();
    var treeR = tree.getBoundingClientRect();
    var zoom = self._zoomLevel || 1;
    var top = (r.top - treeR.top) / zoom;
    var bot = (r.bottom - treeR.top) / zoom;
    if (genMids[g] === undefined) {
      genMids[g] = { top: top, bot: bot };
    } else {
      genMids[g].top = Math.min(genMids[g].top, top);
      genMids[g].bot = Math.max(genMids[g].bot, bot);
    }
  }
  this._genMids = genMids;

  // Wrap container in a relative parent so overlay columns sit outside scroll
  // (only wrap once — reuse existing wrapper on re-render)
  var wrapper = container.parentNode;
  if (!wrapper || !wrapper.classList.contains('gen-label-wrapper')) {
    wrapper = document.createElement('div');
    wrapper.className = 'gen-label-wrapper';
    wrapper.style.cssText = 'position:relative;width:100%;height:' + container.clientHeight + 'px;';
    container.parentNode.insertBefore(wrapper, container);
    wrapper.appendChild(container);
  } else {
    wrapper.style.height = container.clientHeight + 'px';
  }

  var leftCol = document.createElement('div');
  leftCol.className = 'gen-label-col';
  leftCol.style.cssText = 'position:absolute;left:28px;top:0;width:24px;height:100%;pointer-events:none;z-index:10;';
  var rightCol = document.createElement('div');
  rightCol.className = 'gen-label-col';
  rightCol.style.cssText = 'position:absolute;right:4px;top:0;width:24px;height:100%;pointer-events:none;z-index:10;';
  wrapper.appendChild(leftCol);
  wrapper.appendChild(rightCol);

  function updateLabels() {
    leftCol.innerHTML = '';
    rightCol.innerHTML = '';
    var zoom = self._geo.zoom;
    var scrollTop = self._getEffST();
    var ch = container.clientHeight;
    var padPxV = self._geo.padY;
    var gens = Object.keys(genMids).map(Number).sort(function(a, b) { return a - b; });

    // Compute visible label positions first, then thin if too dense
    var visible = [];
    for (var i = 0; i < gens.length; i++) {
      var g = gens[i];
      var mid = (padPxV + (genMids[g].top + genMids[g].bot) / 2) * zoom - scrollTop;
      if (mid < -10 || mid > ch + 10) continue;
      visible.push({ gen: g, y: mid });
    }

    // Determine skip interval: if average gap < 18px, skip odd, etc.
    var skip = 1;
    if (visible.length > 1) {
      var totalSpan = Math.abs(visible[visible.length - 1].y - visible[0].y);
      var avgGap = totalSpan / (visible.length - 1);
      if (avgGap < 12) skip = 4;
      else if (avgGap < 18) skip = 3;
      else if (avgGap < 28) skip = 2;
    }

    var lblH = 14; // approx label height for centering
    for (var i = 0; i < visible.length; i++) {
      var v = visible[i];
      if (skip > 1 && v.gen % skip !== 0 && v.gen !== 1) continue;
      var y = Math.max(2, Math.min(ch - lblH, v.y - lblH / 2));

      var makeLabel = function(side) {
        var lbl = document.createElement('div');
        lbl.style.cssText = 'position:absolute;font-size:0.7rem;color:#666;font-weight:700;background:rgba(255,255,255,0.9);padding:1px 3px;border-radius:3px;white-space:nowrap;text-align:center;' + side;
        lbl.style.top = y + 'px';
        lbl.textContent = v.gen;
        return lbl;
      };

      leftCol.appendChild(makeLabel('left:0;'));
      rightCol.appendChild(makeLabel('right:0;'));
    }
  }

  updateLabels();
  container.addEventListener('scroll', updateLabels);
  this._updateGenLabels = updateLabels;

  // Debug: show sosa range at cursor position (reuse existing element)
  var debugEl = document.getElementById('sosa-debug-overlay');
  if (!debugEl) {
    debugEl = document.createElement('div');
    debugEl.id = 'sosa-debug-overlay';
    debugEl.style.cssText = 'position:fixed;background:rgba(0,0,0,0.75);color:#fff;padding:4px 12px;font-size:12px;font-family:monospace;border-radius:4px;z-index:99999;pointer-events:none;display:none;white-space:nowrap;';
    document.body.appendChild(debugEl);
  }

  // Remove old listeners before adding new ones
  if (self._debugMoveHandler) container.removeEventListener('mousemove', self._debugMoveHandler);
  if (self._debugLeaveHandler) container.removeEventListener('mouseleave', self._debugLeaveHandler);
  if (self._debugScrollHandler) container.removeEventListener('scroll', self._debugScrollHandler);

  self._debugMoveHandler = function(e) {
    var zoom = self._zoomLevel || 1;
    var treeEl = container.querySelector('.fu-root');
    if (!treeEl) return;
    var treeRect = treeEl.getBoundingClientRect();
    var cursorY = (e.clientY - treeRect.top) / zoom;
    var cursorX = (e.clientX - treeRect.left) / zoom;

    // Find nearest person box to cursor to determine generation
    var allPersons = treeEl.querySelectorAll('.fu-person[data-gen]');
    var bestGen = -1, bestDist = Infinity;
    for (var ai = 0; ai < allPersons.length; ai++) {
      var ap = allPersons[ai];
      var ar = ap.getBoundingClientRect();
      var ay = (ar.top + ar.height / 2 - treeRect.top) / zoom;
      var dy = Math.abs(cursorY - ay);
      if (dy < bestDist) {
        bestDist = dy;
        bestGen = parseInt(ap.getAttribute('data-gen'));
      }
    }
    if (bestGen < 0) { debugEl.style.display = 'none'; return; }

    var lowSosa = Math.pow(2, bestGen - 1);

    // Find actual persons on this gen row, sorted by X position
    var genPersons = treeEl.querySelectorAll('.fu-person[data-gen="' + bestGen + '"]');
    var posArr = [];
    for (var pi = 0; pi < genPersons.length; pi++) {
      var pel = genPersons[pi];
      var s = parseInt(pel.getAttribute('data-sosa'));
      if (!s) continue;
      var r = pel.getBoundingClientRect();
      var px = (r.left + r.width / 2 - treeRect.left) / zoom;
      posArr.push({ sosa: s, x: px });
    }
    posArr.sort(function(a, b) { return a.x - b.x; });

    var guessedSosa, leftActual = null, rightActual = null, onPerson = false;
    var snapPx = 8 / zoom; // tolerance for "on person"
    if (posArr.length === 0) {
      guessedSosa = lowSosa;
    } else if (cursorX <= posArr[0].x) {
      guessedSosa = posArr[0].sosa;
      if (Math.abs(cursorX - posArr[0].x) < snapPx) onPerson = true;
      else rightActual = posArr[0].sosa;
    } else if (cursorX >= posArr[posArr.length - 1].x) {
      guessedSosa = posArr[posArr.length - 1].sosa;
      if (Math.abs(cursorX - posArr[posArr.length - 1].x) < snapPx) onPerson = true;
      else leftActual = posArr[posArr.length - 1].sosa;
    } else {
      for (var pi = 0; pi < posArr.length - 1; pi++) {
        if (cursorX >= posArr[pi].x && cursorX <= posArr[pi + 1].x) {
          var span = posArr[pi + 1].x - posArr[pi].x;
          var t = span > 0 ? (cursorX - posArr[pi].x) / span : 0;
          if (t <= 0.10) {
            guessedSosa = posArr[pi].sosa; onPerson = true;
          } else if (t >= 0.90) {
            guessedSosa = posArr[pi + 1].sosa; onPerson = true;
          } else {
            guessedSosa = Math.round(posArr[pi].sosa + t * (posArr[pi + 1].sosa - posArr[pi].sosa));
            leftActual = posArr[pi].sosa;
            rightActual = posArr[pi + 1].sosa;
          }
          break;
        }
      }
      if (guessedSosa === undefined) guessedSosa = lowSosa;
    }

    var display;
    if (onPerson) {
      display = 'Sosa ' + guessedSosa;
    } else if (leftActual !== null && rightActual !== null) {
      display = leftActual + '\u2013' + rightActual;
    } else if (leftActual !== null) {
      display = leftActual + '\u2013';
    } else if (rightActual !== null) {
      display = '\u2013' + rightActual;
    } else {
      display = '\u2013';
    }
    debugEl.textContent = '(Gen ' + bestGen + ')  ' + display;
    debugEl.style.display = '';
    // Position next to minimap, bottom-aligned
    var mm = document.querySelector('.tree-minimap.pano-minimap');
    if (mm) {
      var mmr = mm.getBoundingClientRect();
      debugEl.style.left = (mmr.right + 8) + 'px';
      debugEl.style.bottom = (window.innerHeight - mmr.bottom) + 'px';
    }
  };
  self._debugLeaveHandler = function() { debugEl.style.display = 'none'; self._lastMouseEvent = null; };
  self._debugScrollHandler = function() { if (self._lastMouseEvent) self._debugMoveHandler(self._lastMouseEvent); };
  var origMoveHandler = self._debugMoveHandler;
  self._debugMoveHandler = function(e) { self._lastMouseEvent = e; origMoveHandler(e); };
  container.addEventListener('mousemove', self._debugMoveHandler);
  container.addEventListener('mouseleave', self._debugLeaveHandler);
  container.addEventListener('scroll', self._debugScrollHandler);
};

// ── Ancestor line highlighting ────────────────────────────────────────────

TreeRenderer.prototype.setupLineHighlight = function(tree) {
  var self = this;
  var sosaMap = this._sosaMap;
  this._highlightedSosa = null;

  // Collect all sosa subtree members (sosa and all ancestors above it)
  function getSubtreeSosas(sosa) {
    var set = {};
    var queue = [sosa];
    while (queue.length > 0) {
      var s = queue.shift();
      if (set[s]) continue;
      if (!sosaMap[s]) continue;
      set[s] = true;
      if (sosaMap[s * 2]) queue.push(s * 2);
      if (sosaMap[s * 2 + 1]) queue.push(s * 2 + 1);
    }
    return set;
  }

  function clearHighlight() {
    var highlighted = tree.querySelectorAll('.hl-ancestor');
    for (var i = 0; i < highlighted.length; i++) {
      highlighted[i].classList.remove('hl-ancestor');
    }
    var hlConns = tree.querySelectorAll('.hl-conn');
    for (var i = 0; i < hlConns.length; i++) {
      hlConns[i].classList.remove('hl-conn');
    }
    self._highlightedSosa = null;
    if (self._redrawMinimap) self._redrawMinimap();
  }

  function highlightSubtree(sosa) {
    if (self._highlightedSosa === sosa) return;
    clearHighlight();
    var set = getSubtreeSosas(sosa);
    self._highlightedSosa = sosa;

    // Highlight person boxes
    var boxes = tree.querySelectorAll('.person-box[data-sosa]');
    for (var i = 0; i < boxes.length; i++) {
      var s = parseInt(boxes[i].getAttribute('data-sosa'));
      if (set[s]) boxes[i].classList.add('hl-ancestor');
    }

    // Highlight connectors whose child sosa is in the set
    var conns = tree.querySelectorAll('.fu-conn[data-sosa]');
    for (var i = 0; i < conns.length; i++) {
      var s = parseInt(conns[i].getAttribute('data-sosa'));
      if (set[s]) conns[i].classList.add('hl-conn');
    }

    if (self._redrawMinimap) self._redrawMinimap();
  }

  // Click on sosa badge toggles ancestor line highlight
  var badges = tree.querySelectorAll('.person-sosa');
  for (var i = 0; i < badges.length; i++) {
    (function(badge) {
      badge.addEventListener('mousedown', function(e) {
        e.stopPropagation(); // prevent drag from starting
      });
      badge.addEventListener('click', function(e) {
        e.stopPropagation();
        var box = badge.closest('.person-box');
        var sosa = box ? parseInt(box.getAttribute('data-sosa')) : null;
        if (sosa === self._highlightedSosa) clearHighlight();
        else if (sosa) highlightSubtree(sosa);
      });
    })(badges[i]);
  }

  // Click on empty space clears highlight
  tree.addEventListener('click', function(e) {
    if (!e.target.closest('.person-sosa, .person-box, a')) clearHighlight();
  });
};

// ── Title, Home Button, Minimap (unchanged) ──────────────────────────────

TreeRenderer.prototype.updateTitle = function() {
  var opts = this.options;
  var titleEl = document.getElementById('tree-title');
  if (!titleEl) return;

  var gens = opts.generations || 0;
  var sosa1Name = (opts.selfName || '').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  var currentName = opts.currentName || '';

  titleEl.innerHTML = '';

  if (opts.isRerooted) {
    titleEl.appendChild(document.createTextNode('Ancestors of ' + sosa1Name + ' '));
    var fromSpan = document.createElement('span');
    fromSpan.className = 'text-small text-muted font-weight-lighter';
    fromSpan.textContent = '(from ' + currentName + ')';
    titleEl.appendChild(fromSpan);
  } else {
    titleEl.appendChild(document.createTextNode('Ancestors of ' + currentName + ' '));
  }

  var genSpan = document.createElement('span');
  genSpan.className = 'text-small text-muted font-weight-lighter';
  genSpan.textContent = ' \u2014 ' + gens + ' generation' + (gens !== 1 ? 's' : '');
  titleEl.appendChild(genSpan);

  var selfBtn = document.getElementById('self');
  if (selfBtn && opts.selfAccess) {
    selfBtn.href = opts.selfAccess;
    selfBtn.title = sosa1Name;
  }
};

// ── Unified Toolbar ──────────────────────────────────────────────────────
// Layout: [Sosa 1] [Move arrows] [Zoom] [Minimap] [Generations] [Options]

TreeRenderer.prototype.buildToolbar = function(tree) {
  var toolbar = document.getElementById('pano-toolbar-inner');
  if (!toolbar) return;
  toolbar.innerHTML = '';

  var opts = this.options;
  var self = this;
  var container = this.container;
  var treeAccess = this._treeAccess;
  var zoomCenter = this._zoomCenter;
  var getZoom = this._getZoom;

  // Three sections
  var left = document.createElement('div');
  left.className = 'pano-left';
  var center = document.createElement('div');
  center.className = 'pano-center';
  var right = document.createElement('div');
  right.className = 'pano-right';

  // ── LEFT: Sosa 1 ──
  var isSelf = !opts.isRerooted;
  var sosa1Name = (opts.selfName || '').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  if (opts.selfAccess) {
    var homeBtn = document.createElement('a');
    homeBtn.setAttribute('role', 'button');
    homeBtn.className = 'pano-btn' + (isSelf ? ' pano-btn-active' : ' pano-btn-alert');
    homeBtn.title = isSelf ? 'Sosa 1: ' + sosa1Name : 'Return to Sosa 1: ' + sosa1Name;
    if (!isSelf) homeBtn.href = treeAccess(opts.selfAccess);
    homeBtn.innerHTML = '<i class="fa fa-sitemap fa-flip-vertical"></i><br>Sosa 1';
    left.appendChild(homeBtn);
  }

  // ── LEFT: Move arrows ──
  var arrows = [
    { icon: 'fa-arrow-left', dx: -200, dy: 0, title: 'Scroll left' },
    { icon: 'fa-arrow-right', dx: 200, dy: 0, title: 'Scroll right' },
    { icon: 'fa-arrow-up', dx: 0, dy: -200, title: 'Scroll up' },
    { icon: 'fa-arrow-down', dx: 0, dy: 200, title: 'Scroll down' }
  ];
  for (var a = 0; a < arrows.length; a++) {
    var ab = document.createElement('button');
    ab.className = 'pano-btn';
    ab.innerHTML = '<i class="fa ' + arrows[a].icon + '"></i>';
    ab.title = arrows[a].title;
    (function(btn, dx, dy) {
      function doScroll() { container.scrollBy({ left: dx, top: dy }); }
      var timer = null, interval = null;
      btn.addEventListener('mousedown', function(e) {
        e.preventDefault(); doScroll();
        timer = setTimeout(function() { interval = setInterval(doScroll, 120); }, 400);
      });
      function stop() { clearTimeout(timer); clearInterval(interval); timer = interval = null; }
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
    })(ab, arrows[a].dx, arrows[a].dy);
    left.appendChild(ab);
  }

  // ── LEFT: Zoom ──
  var btnZoomOut = document.createElement('button');
  btnZoomOut.className = 'pano-btn';
  btnZoomOut.innerHTML = '<b>\u2212</b>';
  btnZoomOut.title = 'Zoom out';

  var zoomLabel = document.createElement('span');
  zoomLabel.className = 'pano-zoom-label';
  zoomLabel.textContent = Math.round(getZoom() * 100) + '%';

  var btnZoomIn = document.createElement('button');
  btnZoomIn.className = 'pano-btn';
  btnZoomIn.innerHTML = '<b>+</b>';
  btnZoomIn.title = 'Zoom in';

  var btnZoomReset = document.createElement('button');
  btnZoomReset.className = 'pano-btn';
  btnZoomReset.innerHTML = '<i class="fa fa-compress"></i><br>Reset';
  btnZoomReset.title = 'Reset zoom';

  function updateZoomLabel() {
    zoomLabel.textContent = Math.round(getZoom() * 100) + '%';
  }
  function doZoom(dir) { zoomCenter(dir); updateZoomLabel(); }

  function repeatBtn(btn, dir) {
    var timer = null, interval = null;
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault(); doZoom(dir);
      timer = setTimeout(function() { interval = setInterval(function() { doZoom(dir); }, 80); }, 400);
    });
    function stop() { clearTimeout(timer); clearInterval(interval); timer = interval = null; }
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
  }
  repeatBtn(btnZoomOut, -1);
  repeatBtn(btnZoomIn, 1);
  btnZoomReset.addEventListener('click', function() {
    self._zoomAt(1.0, container.clientWidth / 2, container.clientHeight / 2);
    updateZoomLabel();
  });
  container.addEventListener('wheel', function() { setTimeout(updateZoomLabel, 20); });

  // ── RIGHT: Generations (also creates Deep button) ──
  this._buildGenControls(right);

  var btnZoomDir = document.createElement('button');
  btnZoomDir.className = 'pano-btn';
  var isInverted = localStorage.getItem('treeZoomInvert') === '1';
  btnZoomDir.innerHTML = isInverted ? '<b>&darr;+</b>' : '<b>&uarr;+</b>';
  btnZoomDir.title = 'Zoom: scroll ' + (isInverted ? 'down' : 'up') + ' = zoom in (click to toggle)';
  btnZoomDir.addEventListener('click', function() {
    var inv = localStorage.getItem('treeZoomInvert') === '1';
    localStorage.setItem('treeZoomInvert', inv ? '0' : '1');
    btnZoomDir.innerHTML = inv ? '<b>&uarr;+</b>' : '<b>&darr;+</b>';
    btnZoomDir.title = 'Zoom: scroll ' + (inv ? 'up' : 'down') + ' = zoom in (click to toggle)';
    // Update the live zoomInvert variable in the render closure
    if (self._setZoomInvert) self._setZoomInvert();
  });

  left.appendChild(btnZoomOut);
  left.appendChild(zoomLabel);
  left.appendChild(btnZoomIn);
  left.appendChild(btnZoomReset);
  left.appendChild(btnZoomDir);

  // ── CENTER: Minimap ──
  this._buildMinimapInToolbar(tree, center);

  toolbar.appendChild(left);
  toolbar.appendChild(center);
  toolbar.appendChild(right);

  // Fixed button height: half of minimap (120/2 = 60px)
  var btnH = '60px';
  var allBtns = left.querySelectorAll('.pano-btn, .pano-zoom-label, .pano-gen-input');
  for (var i = 0; i < allBtns.length; i++) {
    allBtns[i].style.height = btnH;
  }
  var rightBtns = right.querySelectorAll('.pano-btn, .pano-zoom-label, .pano-gen-input');
  for (var i = 0; i < rightBtns.length; i++) {
    rightBtns[i].style.height = btnH;
  }
  left.style.height = btnH;
  right.style.height = btnH;
};

// ── Minimap (called from buildToolbar) ────────────────────────────────────

TreeRenderer.prototype._buildMinimapInToolbar = function(tree, toolbar) {
  var container = this.container;
  var treeW = this._geo.treeW;
  var treeH = this._geo.treeH;

  var mapH = 120;
  var mapW = 300;

  var canvas = document.createElement('canvas');
  canvas.width = mapW;
  canvas.height = mapH;
  canvas.className = 'tree-minimap-canvas';

  var wrapper = document.createElement('div');
  wrapper.className = 'tree-minimap pano-minimap';
  wrapper.appendChild(canvas);
  toolbar.appendChild(wrapper);

  // Compute actual bottom reserve from minimap position (after layout)
  var self2 = this;
  requestAnimationFrame(function() {
    var cr = container.getBoundingClientRect();
    var mr = canvas.getBoundingClientRect();
    var reserve = cr.bottom - mr.top + 25;
    if (reserve > 50 && reserve < 400) {
      self2._geo.botReserve = reserve;
    }
  });

  var ctx = canvas.getContext('2d');

  // Compute generation from sosa number: gen = floor(log2(sosa))
  function sosaGen(s) { return Math.floor(Math.log(s) / Math.LN2); }
  var totalGens = this.options.generations || 3;
  var margin = 6; // top/bottom margin in minimap pixels

  var scaleX = mapW / treeW;
  var scaleY = mapH / treeH;

  // Minimap dot data: { gen -> [{sosa, dotX, dotY}] } for hover lookup
  var minimapDotsByGen = {};

  function drawMinimapDots_dotsOnly() {
    var personBoxes = tree.querySelectorAll('.person-box');
    var treeRect = tree.getBoundingClientRect();
    var sosa2x = mapW / 2, sosa3x = mapW / 2;
    var sosa1y = mapH - margin;
    var zoom = self._zoomLevel || 1;
    minimapDotsByGen = {};
    for (var i = 0; i < personBoxes.length; i++) {
      var pb = personBoxes[i];
      var parent = pb.parentNode;
      var parentRect = parent.getBoundingClientRect();
      var px = (parentRect.left + parentRect.width / 2 - treeRect.left) / zoom;
      var py = (parentRect.top + parentRect.height / 2 - treeRect.top) / zoom;
      var isHighlighted = pb.classList.contains('hl-ancestor');
      var isMale = pb.classList.contains('person-male');
      var dotX = Math.round(px * scaleX);
      var dotY = Math.round(py * scaleY);
      var sosaNum = pb.getAttribute('data-sosa');
      var s = parseInt(sosaNum);
      if (!s || s < 1) continue;
      var gen = sosaGen(s);
      var genKey = gen + 1;
      if (!minimapDotsByGen[genKey]) minimapDotsByGen[genKey] = [];
      minimapDotsByGen[genKey].push({ sosa: s, dotX: dotX, dotY: dotY });
      if (sosaNum === '2') { sosa2x = dotX; }
      if (sosaNum === '3') { sosa3x = dotX; }
      if (sosaNum === '1') { sosa1y = dotY; continue; }
      if (isHighlighted) {
        ctx.fillStyle = '#c8900a';
        ctx.fillRect(dotX - 2, dotY - 2, 4, 4);
      } else {
        ctx.fillStyle = isMale ? '#4a7ab5' : '#b54a7a';
        ctx.fillRect(dotX - 2, dotY - 2, 4, 4);
      }
    }
    var s1x = Math.round((sosa2x + sosa3x) / 2);
    ctx.fillStyle = '#28a745';
    ctx.fillRect(s1x - 3, sosa1y - 2, 6, 5);
  }
  function drawMinimapDots() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, mapW, mapH);
    drawMinimapDots_dotsOnly();
  }
  var self = this;
  var vpX = 0, vpY = 0, vpW = mapW, vpH = mapH;

  function drawAll() {
    drawMinimapDots();
    // Pale shading over entire minimap
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
    ctx.fillRect(0, 0, mapW, mapH);
    ctx.restore();
    // Nav box: white BG with dots + thin border
    ctx.save();
    ctx.beginPath();
    ctx.rect(vpX, vpY, vpW, vpH);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(vpX, vpY, vpW, vpH);
    drawMinimapDots_dotsOnly();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vpX + 0.5, vpY + 0.5, vpW - 1, vpH - 1);
    ctx.restore();
  }
  drawAll();
  this._redrawMinimap = drawAll;

  function updateViewport() {
    var zoom = self._geo.zoom;
    var padPx = self._geo.padX;
    var padPxV = self._geo.padY;
    var scrollInTree = self._getEffSL() / zoom - padPx;
    vpX = Math.round(scrollInTree * scaleX);
    vpY = Math.round((self._getEffST() / zoom - padPxV) * scaleY);
    vpW = Math.max(Math.round((container.clientWidth / zoom) * scaleX), 8);
    vpH = Math.max(Math.round((container.clientHeight / zoom) * scaleY), 8);
    // Clip nav box to minimap bounds
    if (vpX < 0) { vpW += vpX; vpX = 0; }
    if (vpY < 0) { vpH += vpY; vpY = 0; }
    if (vpX + vpW > mapW) vpW = mapW - vpX;
    if (vpY + vpH > mapH) vpH = mapH - vpY;
    vpW = Math.max(vpW, 4);
    vpH = Math.max(vpH, 4);
    drawAll();
  }
  updateViewport();
  this._updateViewport = updateViewport;
  container.addEventListener('scroll', updateViewport);
  window.addEventListener('resize', function() {
    self._geo.containerW = container.clientWidth;
    self._geo.containerH = container.clientHeight;
    var cr = container.getBoundingClientRect();
    var mr = canvas.getBoundingClientRect();
    var reserve = cr.bottom - mr.top + 25;
    if (reserve > 50 && reserve < 400) self._geo.botReserve = reserve;
    updateViewport();
  });

  function panToMinimap(e) {
    var zoom = self._geo.zoom;
    var rect = canvas.getBoundingClientRect();
    var clickX = Math.max(0, Math.min(mapW, e.clientX - rect.left));
    var clickY = Math.max(0, Math.min(mapH, e.clientY - rect.top));
    // Convert minimap coords back to tree coords (via content bounds)
    var treeX = clickX / scaleX;
    var treeY = clickY / scaleY;
    var targetSL = (treeX + self._geo.padX) * zoom - container.clientWidth / 2;
    var targetST = (treeY + self._geo.padY) * zoom - container.clientHeight / 2;
    self._setEffScroll(targetSL, targetST);
  }
  var mmDragging = false, mmMoved = false;
  canvas.addEventListener('mousedown', function(e) {
    mmDragging = true; mmMoved = false;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!mmDragging) return;
    mmMoved = true;
    panToMinimap(e);
  });
  document.addEventListener('mouseup', function() { mmDragging = false; });
  canvas.addEventListener('click', function(e) {
    if (mmMoved) { mmMoved = false; return; }
    panToMinimap(e);
  });

  // Wheel on minimap: zoom centered on viewport center
  wrapper.addEventListener('wheel', function(e) {
    e.preventDefault();
    var zi = localStorage.getItem('treeZoomInvert') === '1' ? -1 : 1;
    var delta = (e.deltaY !== 0 ? e.deltaY : e.deltaX) * zi;
    var newZoom = delta < 0
      ? self._zoomLevel * 1.15
      : self._zoomLevel / 1.15;
    self._zoomAt(newZoom, container.clientWidth / 2, container.clientHeight / 2);
  }, { passive: false });

  // Minimap hover: compute Sosa overlay directly from dot data
  function minimapSosaOverlay(e) {
    var debugEl = document.getElementById('sosa-debug-overlay');
    if (!debugEl) return;
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    if (mx < 0 || mx > mapW || my < 0 || my > mapH) { debugEl.style.display = 'none'; return; }

    // Find nearest gen by dotY distance
    var bestGen = -1, bestDist = Infinity;
    for (var g in minimapDotsByGen) {
      var dots = minimapDotsByGen[g];
      if (dots.length === 0) continue;
      var dy = Math.abs(my - dots[0].dotY);
      if (dy < bestDist) { bestDist = dy; bestGen = parseInt(g); }
    }
    if (bestGen < 0) { debugEl.style.display = 'none'; return; }

    // Get dots for this gen, sorted by X
    var dots = minimapDotsByGen[bestGen].slice().sort(function(a, b) { return a.dotX - b.dotX; });
    var snapPx = 6;
    var guessedSosa, leftActual = null, rightActual = null, onPerson = false;

    if (dots.length === 0) {
      debugEl.style.display = 'none'; return;
    } else if (mx <= dots[0].dotX) {
      guessedSosa = dots[0].sosa;
      if (Math.abs(mx - dots[0].dotX) < snapPx) onPerson = true;
      else rightActual = dots[0].sosa;
    } else if (mx >= dots[dots.length - 1].dotX) {
      guessedSosa = dots[dots.length - 1].sosa;
      if (Math.abs(mx - dots[dots.length - 1].dotX) < snapPx) onPerson = true;
      else leftActual = dots[dots.length - 1].sosa;
    } else {
      for (var i = 0; i < dots.length - 1; i++) {
        if (mx >= dots[i].dotX && mx <= dots[i + 1].dotX) {
          var span = dots[i + 1].dotX - dots[i].dotX;
          var t = span > 0 ? (mx - dots[i].dotX) / span : 0;
          if (t <= 0.10) { guessedSosa = dots[i].sosa; onPerson = true; }
          else if (t >= 0.90) { guessedSosa = dots[i + 1].sosa; onPerson = true; }
          else {
            guessedSosa = Math.round(dots[i].sosa + t * (dots[i + 1].sosa - dots[i].sosa));
            leftActual = dots[i].sosa;
            rightActual = dots[i + 1].sosa;
          }
          break;
        }
      }
      if (guessedSosa === undefined) guessedSosa = dots[0].sosa;
    }

    var display;
    if (onPerson) display = 'Sosa ' + guessedSosa;
    else if (leftActual !== null && rightActual !== null) display = leftActual + '\u2013' + rightActual;
    else if (leftActual !== null) display = leftActual + '\u2013';
    else if (rightActual !== null) display = '\u2013' + rightActual;
    else display = '\u2013';

    debugEl.textContent = '(Gen ' + bestGen + ')  ' + display;
    debugEl.style.display = '';
    var mm = document.querySelector('.tree-minimap.pano-minimap');
    if (mm) {
      var mmr = mm.getBoundingClientRect();
      debugEl.style.left = (mmr.right + 8) + 'px';
      debugEl.style.bottom = (window.innerHeight - mmr.bottom) + 'px';
    }
  }
  wrapper.addEventListener('mousemove', minimapSosaOverlay);
  wrapper.addEventListener('mouseleave', function() {
    var debugEl = document.getElementById('sosa-debug-overlay');
    if (debugEl) debugEl.style.display = 'none';
  });
};

// ── Generation controls (called from buildToolbar) ───────────────────────

TreeRenderer.prototype._buildGenControls = function(toolbar) {
  var opts = this.options;
  var absMax = Math.min(opts.maxGenerations || 20, 20);
  var fastMax = 12;
  var currentGen = opts.generations || 3;
  var urlTpl = opts.genUrlTemplate || '';
  if (!urlTpl) return;

  var deepMode = currentGen > fastMax;
  var effectiveMax = deepMode ? absMax : fastMax;
  var self = this;
  var navigating = false;

  var btnMinus = document.createElement('button');
  btnMinus.className = 'pano-btn';
  btnMinus.innerHTML = '<b>\u2212</b>';
  btnMinus.title = 'Fewer generations';

  var input = document.createElement('input');
  input.type = 'number';
  input.min = 1;
  input.max = effectiveMax;
  input.value = currentGen;
  input.className = 'pano-gen-input';
  input.title = 'Type generation and press Enter';

  var btnPlus = document.createElement('button');
  btnPlus.className = 'pano-btn';
  btnPlus.innerHTML = '<b>+</b>';
  btnPlus.title = 'More generations';

  // Deep mode toggle: unlocks generations beyond fastMax
  var btnDeep = document.createElement('button');
  btnDeep.className = 'pano-btn' + (deepMode ? ' pano-btn-deep-on' : '');
  btnDeep.style.fontSize = '0.75rem';
  btnDeep.innerHTML = 'Deep';
  btnDeep.title = deepMode
    ? 'Deep mode ON (up to ' + absMax + ') \u2014 click to limit to ' + fastMax
    : 'Unlock generations beyond ' + fastMax + ' (up to ' + absMax + ')';

  var upToLabel; // set later when DOM element is created
  function updateLimits() {
    effectiveMax = deepMode ? absMax : fastMax;
    input.max = effectiveMax;
    btnDeep.className = 'pano-btn' + (deepMode ? ' pano-btn-deep-on' : '');
    btnDeep.title = deepMode
      ? 'Deep mode ON (up to ' + absMax + ') \u2014 click to limit to ' + fastMax
      : 'Unlock generations beyond ' + fastMax + ' (up to ' + absMax + ')';
    btnPlus.classList.toggle('disabled', currentGen >= effectiveMax);
    if (upToLabel) upToLabel.textContent = 'Up to ' + effectiveMax;
  }

  // Inject CSS animation for loading spinner (once)
  if (!document.getElementById('gen-progress-anim')) {
    var style = document.createElement('style');
    style.id = 'gen-progress-anim';
    style.textContent =
      '@keyframes gen-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
      '.gen-spinner { width:24px;height:24px;border:3px solid #e0e0e0;border-top-color:#4a7ab5;' +
      'border-radius:50%;animation:gen-spin 0.8s linear infinite;margin:0 auto 8px; }';
    document.head.appendChild(style);
  }

  function navigate(v) {
    v = Math.max(1, Math.min(effectiveMax, v));
    if (v === currentGen || navigating) return;
    navigating = true;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.4);z-index:99998;display:flex;align-items:center;justify-content:center;pointer-events:none;';
    overlay.innerHTML = '<div style="background:#fff;padding:18px 32px;border-radius:8px;border:1px solid #ccc;box-shadow:0 2px 10px rgba(0,0,0,0.15);text-align:center;">' +
      '<div class="gen-spinner"></div>' +
      '<div style="font-size:1.1rem;color:#555;font-weight:600;">Loading ' + v + ' generations\u2026</div>' +
      '</div>';
    document.body.appendChild(overlay);
    self._loadingOverlay = overlay;

    // Yield to browser so it can paint between heavy steps
    function yieldThen(fn) {
      return new Promise(function(resolve) {
        requestAnimationFrame(function() { setTimeout(function() { resolve(fn()); }, 0); });
      });
    }

    var url = urlTpl.replace('__V__', v);
    var parsedData, savedOffsetFromSosa1X, savedOffsetFromSosa1Y;
    fetch(url)
      .then(function(resp) { return resp.text(); })
      .then(function(html) {
        return yieldThen(function() {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var dataEl = doc.getElementById('tree-data');
          if (!dataEl) throw new Error('No tree data in response');
          return dataEl.textContent;
        });
      })
      .then(function(rawData) {
        return yieldThen(function() {
          parsedData = TreeRenderer.parseTreeData(rawData);
        });
      })
      .then(function() {
        return yieldThen(function() {
          var wrapper = self.container.parentNode;
          if (wrapper) {
            var cols = wrapper.querySelectorAll('.gen-label-col');
            for (var i = 0; i < cols.length; i++) cols[i].remove();
          }

          // Capture viewport center's offset from Sosa 1 (in content coords)
          var container = self.container;
          var zoom = self._zoomLevel || 1;
          var vpCenterX = (self._getEffSL() + container.clientWidth / 2) / zoom;
          var vpCenterY = (self._getEffST() + container.clientHeight / 2) / zoom;
          var oldSosa1 = container.querySelector('.fu-person[data-sosa="1"]');
          if (oldSosa1) {
            var p = oldSosa1.parentNode;
            var s1x = p.offsetLeft + p.offsetWidth / 2;
            var s1y = p.offsetTop + p.offsetHeight / 2;
            savedOffsetFromSosa1X = vpCenterX - s1x;
            savedOffsetFromSosa1Y = vpCenterY - s1y;
          } else {
            savedOffsetFromSosa1X = 0;
            savedOffsetFromSosa1Y = 0;
          }

          self.data = parsedData;
          self.options.generations = v;
          currentGen = v;
          self._skipAutoScroll = true;
          self.render();
        });
      })
      .then(function() {
        return yieldThen(function() {
          // Restore viewport center at same offset from Sosa 1
          var container = self.container;
          var newZoom = self._zoomLevel || 1;
          var newSosa1 = container.querySelector('.fu-person[data-sosa="1"]');
          if (newSosa1) {
            var p = newSosa1.parentNode;
            var s1x = p.offsetLeft + p.offsetWidth / 2;
            var s1y = p.offsetTop + p.offsetHeight / 2;
            var targetX = (s1x + savedOffsetFromSosa1X) * newZoom;
            var targetY = (s1y + savedOffsetFromSosa1Y) * newZoom;
            self._setEffScroll(targetX - container.clientWidth / 2, targetY - container.clientHeight / 2);
          }
          // Clamp so nav box stays within minimap

          history.pushState(null, '', url);

          setTimeout(function() {
            if (self._loadingOverlay) { self._loadingOverlay.remove(); self._loadingOverlay = null; }
          }, 250);
          input.value = v;
          btnMinus.classList.toggle('disabled', v <= 1);
          btnPlus.classList.toggle('disabled', v >= effectiveMax);
          updateLimits();
          navigating = false;
        });
      })
      .catch(function(err) {
        if (self._loadingOverlay) { self._loadingOverlay.remove(); self._loadingOverlay = null; }
        console.error('Gen navigate error:', err);
        window.location.href = url;
      });
  }

  function repeatGen(btn, delta) {
    var timer = null, interval = null, pending = 0;
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      pending = Math.max(1, Math.min(absMax, currentGen + delta));
      input.value = pending;
      timer = setTimeout(function() {
        interval = setInterval(function() {
          pending = Math.max(1, Math.min(absMax, pending + delta));
          input.value = pending;
        }, 300);
      }, 600);
    });
    function stop() {
      clearTimeout(timer); clearInterval(interval); timer = interval = null;
      if (pending && pending !== currentGen) navigate(pending);
      else input.value = currentGen;
      pending = 0;
    }
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
  }
  repeatGen(btnMinus, -1);
  repeatGen(btnPlus, 1);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var v = parseInt(input.value);
      if (!v || v < 1) { input.value = currentGen; return; }
      if (v > effectiveMax) v = effectiveMax;
      navigate(v);
    }
  });
  input.addEventListener('wheel', function(e) { e.stopPropagation(); });
  btnDeep.addEventListener('click', function() {
    deepMode = !deepMode;
    updateLimits();
  });

  btnMinus.classList.toggle('disabled', currentGen <= 1);
  btnPlus.classList.toggle('disabled', currentGen >= effectiveMax);

  // Deep button — right section, before "Up to"
  toolbar.appendChild(btnDeep);

  // "Up to nn" label
  upToLabel = document.createElement('span');
  upToLabel.className = 'pano-zoom-label';
  upToLabel.textContent = 'Up to ' + effectiveMax;
  toolbar.appendChild(upToLabel);

  // "Generations" label
  var gLabel = document.createElement('span');
  gLabel.className = 'pano-zoom-label';
  gLabel.textContent = 'Generations';
  toolbar.appendChild(gLabel);

  toolbar.appendChild(btnMinus);
  toolbar.appendChild(input);
  toolbar.appendChild(btnPlus);
};
