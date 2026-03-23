/**
 * tree_render.js — CSS Grid ancestor tree renderer
 *
 * Data from GeneWeb ancestor_tree_line as tilde-delimited text.
 * Rows go oldest (top) to self (bottom). Each cell has colspan,
 * isLeft/isRight flags, and person data.
 *
 * Display scales per row: dense rows get smaller fonts, no images,
 * compact names. Sparse rows get full detail.
 *
 * Performance: the server emits compact tilde-delimited text (less wire
 * data than HTML tables), and client-side parse + DOM build is sub-ms
 * even at 7 generations (127 cells). The minimap canvas is the most
 * expensive part at ~1ms for a few hundred rectangles.
 */

// ── PersonBox ──────────────────────────────────────────────────────────────

function PersonBox(person) {
  this.person = person;
  this.imgSize = 50;   // max image dimension in px
  this.fontSize = 0.8; // name font size in rem
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
  if (!p.birthYear && !p.deathYear) return '';
  var b = p.birthYear || '?';
  var d = p.deathYear || '';
  return d ? b + '\u2013' + d : '\u002a' + b;
};

PersonBox.prototype.tooltipText = function() {
  var p = this.person;
  var parts = [];
  if (p.sosa) parts.push('Sosa ' + p.sosa);
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

  // Sosa number
  if (this.showSosa && p.hasSosa && p.sosa) {
    var badge = document.createElement('span');
    badge.className = 'person-sosa';
    badge.textContent = p.sosa;
    badge.title = 'Sosa ' + p.sosa;
    box.appendChild(badge);
  }

  // Image
  if (this.showImage && p.hasImage && p.imageUrl) {
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
  }

  // Name — click re-roots tree, Cmd/Ctrl-click goes to person page
  var nameLink = document.createElement('a');
  nameLink.href = p.access;
  nameLink.className = 'person-name';
  nameLink.style.fontSize = this.fontSize + 'rem';
  nameLink.title = this.tooltipText() + ' (click: re-root tree, ⌘-click: person page)';

  var treeAccess = this.treeAccess;
  if (treeAccess) {
    nameLink.addEventListener('click', function(e) {
      if (e.metaKey || e.ctrlKey) return; // Cmd/Ctrl-click: follow link normally
      e.preventDefault();
      // Re-root tree on this person
      window.location.href = treeAccess(p.access);
    });
  }

  var firstName = document.createElement('span');
  firstName.className = 'person-first-name';
  firstName.textContent = p.publicName || p.firstName;
  nameLink.appendChild(firstName);

  if (this.showSurname) {
    nameLink.appendChild(document.createElement('br'));
    var surname = document.createElement('span');
    surname.className = 'person-surname';
    surname.textContent = p.surname;
    nameLink.appendChild(surname);
  }

  box.appendChild(nameLink);

  // Dates
  if (this.showDates) {
    var dates = this.dateSpan();
    if (dates) {
      var dateEl = document.createElement('span');
      dateEl.className = 'person-dates';
      dateEl.textContent = dates;
      dateEl.style.fontSize = (this.fontSize * 0.85) + 'rem';
      if (this.options && this.options.wizard && p.access) {
        dateEl.title = 'Update ' + this.displayName();
        dateEl.style.cursor = 'pointer';
        dateEl.addEventListener('click', function() {
          var sep = p.access.indexOf('?') >= 0 ? '&' : '?';
          window.location.href = p.access + sep + 'm=U';
        });
      }
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

TreeRenderer.prototype.cellPositions = function(cells) {
  var positions = [];
  var col = 1;
  for (var c = 0; c < cells.length; c++) {
    if (c > 0) col++;
    positions.push(col);
    col += cells[c].colspan;
  }
  return positions;
};

// Per-row display settings based on number of cells in that row
TreeRenderer.prototype.rowStyle = function(numCells) {
  // numCells: how many cells in this row (including empties)
  if (numCells <= 2)  return { fontSize: 0.85, imgSize: 50, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 4)  return { fontSize: 0.80, imgSize: 45, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 8)  return { fontSize: 0.75, imgSize: 38, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 16) return { fontSize: 0.70, imgSize: 30, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 32) return { fontSize: 0.65, imgSize: 0,  showImage: false, showSurname: true,  showSosa: false, showDates: false };
  return                      { fontSize: 0.55, imgSize: 0,  showImage: false, showSurname: false, showSosa: false, showDates: false };
};

TreeRenderer.prototype.render = function() {
  var rows = this.data.rows;
  if (!rows || !rows.length) return;

  // Total grid columns from the widest row
  var firstRow = rows[0];
  var totalCols = 0;
  for (var j = 0; j < firstRow.cells.length; j++) {
    if (j > 0) totalCols++;
    totalCols += firstRow.cells[j].colspan;
  }

  var grid = document.createElement('div');
  grid.className = 'tree-grid';

  // Column widths: scale to fit viewport
  var viewW = window.innerWidth || 1200;
  var spacerCount = firstRow.cells.length - 1;
  var dataCols = totalCols - spacerCount;
  var availableW = viewW - (spacerCount * 4) - 30;
  var autoMinW = Math.max(24, Math.min(80, Math.floor(availableW / dataCols)));

  var colTemplate = [];
  for (var j = 0; j < firstRow.cells.length; j++) {
    if (j > 0) colTemplate.push('4px');
    for (var k = 0; k < firstRow.cells[j].colspan; k++) {
      colTemplate.push('minmax(' + autoMinW + 'px, 1fr)');
    }
  }
  grid.style.gridTemplateColumns = colTemplate.join(' ');

  // Build a function that converts a person access URL to a tree URL
  var opts = this.options;
  var gens = opts.generations || 3;
  // Extract original Sosa 1 pz/nz/ocz from selfAccess to preserve across re-roots
  var pzMatch = (opts.selfAccess || '').match(/[?&]pz=([^&]*)/);
  var nzMatch = (opts.selfAccess || '').match(/[?&]nz=([^&]*)/);
  var oczMatch = (opts.selfAccess || '').match(/[?&]ocz=([^&]*)/);
  var sosa1Pz = pzMatch ? pzMatch[1] : '';
  var sosa1Nz = nzMatch ? nzMatch[1] : '';
  var sosa1Ocz = oczMatch ? oczMatch[1] : '';

  var treeAccess = function(personAccess) {
    // personAccess is like "royal92?p=name&n=surname&oc=0"
    // Add ancestor tree params and preserve Sosa 1 identity
    var sep = personAccess.indexOf('?') >= 0 ? '&' : '?';
    var url = personAccess + sep + 'm=A&t=T&t1=GR&v=' + gens;
    // Inject pz/nz/ocz so Sosa 1 is remembered across re-roots
    if (sosa1Pz) url += '&pz=' + sosa1Pz + '&nz=' + sosa1Nz + '&ocz=' + sosa1Ocz;
    return url;
  };

  var gridRow = 1;

  for (var r = 0; r < rows.length; r++) {
    var cells = rows[r].cells;
    var pos = this.cellPositions(cells);
    var style = this.rowStyle(cells.length);

    // ── Person row ──
    for (var c = 0; c < cells.length; c++) {
      if (c > 0) {
        this.addCell(grid, gridRow, pos[c] - 1, 1, 'tree-spacer', '');
      }

      if (cells[c].person) {
        var personEl = document.createElement('div');
        personEl.className = 'tree-cell tree-cell-person';
        personEl.style.gridColumn = pos[c] + ' / ' + (pos[c] + cells[c].colspan);
        personEl.style.gridRow = gridRow;

        var pb = new PersonBox(cells[c].person);
        pb.showImage = style.showImage;
        pb.imgSize = style.imgSize;
        pb.fontSize = style.fontSize;
        pb.showSurname = style.showSurname;
        pb.showSosa = style.showSosa;
        pb.showDates = style.showDates;
        pb.treeAccess = treeAccess;
        pb.options = opts;
        // Mark top-row people who have further ancestors
        if (r === 0 && cells[c].person.hasParents) {
          personEl.setAttribute('data-has-parents', '1');
        }
        personEl.appendChild(pb.render());

        grid.appendChild(personEl);
      } else {
        this.addCell(grid, gridRow, pos[c], cells[c].colspan, 'tree-cell tree-cell-empty', '');
      }
    }
    gridRow++;

    // ── Branch connector row ──
    if (r < rows.length - 1) {
      for (var c = 0; c < cells.length; c++) {
        var hasContent = !cells[c].isEmpty && cells[c].person;

        if (c > 0) {
          var isCoupleGap = cells[c - 1].isLeft && cells[c].isRight;
          var coupleHasPeople = isCoupleGap &&
            !cells[c - 1].isEmpty && cells[c - 1].person &&
            !cells[c].isEmpty && cells[c].person;
          this.addCell(grid, gridRow, pos[c] - 1, 1,
            coupleHasPeople ? 'tree-branch-bottom' : 'tree-spacer', '');
        }

        if (cells[c].isLeft && hasContent) {
          this.addCell(grid, gridRow, pos[c], cells[c].colspan, 'tree-cell tree-branch-left', '');
        } else if (cells[c].isRight && hasContent) {
          this.addCell(grid, gridRow, pos[c], cells[c].colspan, 'tree-cell tree-branch-right', '');
        } else {
          this.addCell(grid, gridRow, pos[c], cells[c].colspan, 'tree-cell tree-cell-empty', '');
        }
      }

      // Marriage year overlays
      for (var c = 1; c < cells.length; c++) {
        if (cells[c - 1].isLeft && cells[c].isRight &&
            cells[c - 1].person && cells[c].person) {
          var marriageYear = cells[c].family ? cells[c].family.marriageYear : '';
          if (marriageYear) {
            var coupleStart = pos[c - 1];
            var coupleEnd = pos[c] + cells[c].colspan;
            var overlay = document.createElement('div');
            overlay.className = 'tree-marriage-overlay';
            overlay.style.gridColumn = coupleStart + ' / ' + coupleEnd;
            overlay.style.gridRow = gridRow;
            var marr = document.createElement('span');
            marr.className = 'tree-marriage';
            marr.textContent = '\u00d7' + marriageYear;
            overlay.appendChild(marr);
            grid.appendChild(overlay);
          }
        }
      }

      gridRow++;
    }
  }

  this.container.innerHTML = '';
  this.container.appendChild(grid);

  // Add Home button if we're not already viewing Sosa 1
  this.addHomeButton(treeAccess);

  // Update title when re-rooted to show Sosa 1 name
  this.updateTitle();

  // Build minimap if tree overflows
  var self = this;
  setTimeout(function() { self.buildMinimap(grid); }, 100);
};

TreeRenderer.prototype.updateTitle = function() {
  var opts = this.options;
  if (!opts.isRerooted) return;
  var titleEl = document.getElementById('tree-title');
  if (!titleEl) return;
  // Capitalize each word of selfName
  var name = (opts.selfName || '').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  var from = opts.currentName || '';
  // Find the main text node (before the togena span)
  var span = titleEl.querySelector('span');
  if (span) {
    // Replace text before the span
    var textNodes = [];
    for (var i = 0; i < titleEl.childNodes.length; i++) {
      if (titleEl.childNodes[i] === span) break;
      textNodes.push(titleEl.childNodes[i]);
    }
    for (var i = 0; i < textNodes.length; i++) {
      titleEl.removeChild(textNodes[i]);
    }
    var newText = document.createTextNode('Ascendants tree of ' + name + ' ');
    titleEl.insertBefore(newText, span);
    // Add "(shown from CurrentPerson)" — remove togena span since generation is shown by button
    var fromSpan = document.createElement('span');
    fromSpan.className = 'text-small text-muted font-weight-lighter';
    fromSpan.textContent = '(shown from ' + from + ')';
    titleEl.insertBefore(fromSpan, span);
    // Remove the togena generation span when re-rooted
    span.style.display = 'none';
  }

  // Update Person button (id="self") to point to Sosa 1
  var selfBtn = document.getElementById('self');
  if (selfBtn && opts.selfAccess) {
    selfBtn.href = opts.selfAccess;
    selfBtn.title = name;
  }
};

TreeRenderer.prototype.addHomeButton = function(treeAccess) {
  var opts = this.options;
  if (!opts.selfAccess) return;

  // Find the ascendant tree button group (Agna./Asc./Cogn.)
  var ascGroup = document.querySelector('nav.navbar.fixed-bottom .btn-group[aria-label="ascendant tree button group"]');
  if (!ascGroup) return;

  // Check if we're already at Sosa 1
  // Use pz/nz from selfAccess (the original Sosa 1 person)
  var selfMatch = opts.selfAccess.match(/[?&]pz=([^&]*)/);
  var selfMatchN = opts.selfAccess.match(/[?&]nz=([^&]*)/);
  if (!selfMatch || !selfMatchN) return;
  var selfP = decodeURIComponent(selfMatch[1].replace(/\+/g, ' ')).toLowerCase();
  var selfN = decodeURIComponent(selfMatchN[1].replace(/\+/g, ' ')).toLowerCase();
  var curParams = new URLSearchParams(window.location.search);
  var curP = decodeURIComponent((curParams.get('p') || '').replace(/\+/g, ' ')).toLowerCase();
  var curN = decodeURIComponent((curParams.get('n') || '').replace(/\+/g, ' ')).toLowerCase();
  var isSelf = curP === selfP && curN === selfN;

  var selfTreeUrl = treeAccess(opts.selfAccess);

  var homeBtn = document.createElement('a');
  homeBtn.setAttribute('role', 'button');
  if (isSelf) {
    homeBtn.className = 'btn btn-outline-primary border-2 rounded mr-1 px-2 pt-1 h-100 disabled font-weight-bold';
    homeBtn.title = 'Sosa 1: ' + (opts.selfName || '') + ' (current root)';
  } else {
    homeBtn.className = 'btn btn-outline-danger border-2 rounded mr-1 px-2 pt-1 h-100';
    homeBtn.href = selfTreeUrl;
    homeBtn.title = 'Return to Sosa 1: ' + (opts.selfName || '');
  }
  homeBtn.innerHTML = '<i class="fa fa-sitemap fa-flip-vertical fa-lg"></i><br>Sosa 1';

  // Insert to the left of the Agna./Asc./Cogn. group
  ascGroup.parentNode.insertBefore(homeBtn, ascGroup);
};

TreeRenderer.prototype.addCell = function(grid, row, col, span, className, text) {
  var el = document.createElement('div');
  el.className = className;
  el.style.gridColumn = col + ' / ' + (col + span);
  el.style.gridRow = row;
  if (text) el.textContent = text;
  grid.appendChild(el);
};

// ── Minimap ────────────────────────────────────────────────────────────────

TreeRenderer.prototype.buildMinimap = function(grid) {
  var container = this.container;
  var treeW = grid.scrollWidth;
  var treeH = grid.scrollHeight;
  var viewW = container.clientWidth;
  var viewH = container.clientHeight;

  var overflows = treeW > viewW + 20;

  // Measure available space in the bottom toolbar
  var navbar = document.querySelector('nav.navbar.fixed-bottom');
  if (!navbar) return;
  var toolbar = navbar.querySelector('.btn-toolbar');
  if (!toolbar) return;

  // Temporarily insert a placeholder to measure available width
  var placeholder = document.createElement('div');
  placeholder.style.cssText = 'flex:1;min-width:0;visibility:hidden;';
  toolbar.insertBefore(placeholder, toolbar.firstChild);
  var availW = placeholder.offsetWidth - 16; // 16px margin
  toolbar.removeChild(placeholder);

  // If not enough space, try a fixed reasonable size
  if (availW < 60) availW = Math.min(200, viewW * 0.2);

  // Scale minimap to fit the navbar dimensions
  var navbarH = navbar.offsetHeight - 8;
  var mapW = Math.max(60, Math.min(availW, 300));
  var mapH = navbarH;
  // Maintain tree aspect ratio: shrink width if needed
  var treeAspect = treeW / treeH;
  var mapAspect = mapW / mapH;
  if (mapAspect > treeAspect) {
    // Map is too wide — shrink width to match tree proportions
    mapW = Math.round(mapH * treeAspect);
  }

  var scaleX = mapW / treeW;
  var scaleY = mapH / treeH;

  // Create canvas
  var canvas = document.createElement('canvas');
  canvas.width = mapW;
  canvas.height = mapH;
  canvas.className = 'tree-minimap-canvas';

  var wrapper = document.createElement('div');
  wrapper.className = 'tree-minimap';
  wrapper.appendChild(canvas);

  wrapper.style.marginRight = '8px';
  toolbar.insertBefore(wrapper, toolbar.firstChild);

  var ctx = canvas.getContext('2d');

  // Draw tree silhouette — find all person boxes and branch lines
  var personBoxes = grid.querySelectorAll('.person-box');
  var branches = grid.querySelectorAll('.tree-branch-left, .tree-branch-right, .tree-branch-bottom');

  // Background
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, mapW, mapH);

  // Draw branch lines
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  for (var i = 0; i < branches.length; i++) {
    var b = branches[i];
    var bx = b.offsetLeft * scaleX;
    var by = b.offsetTop * scaleY;
    var bw = b.offsetWidth * scaleX;
    var bh = b.offsetHeight * scaleY;
    ctx.strokeRect(bx, by, bw, Math.max(1, bh));
  }

  // Draw person dots
  for (var i = 0; i < personBoxes.length; i++) {
    var pb = personBoxes[i];
    var parent = pb.parentNode; // tree-cell-person
    var px = parent.offsetLeft + parent.offsetWidth / 2;
    var py = parent.offsetTop + parent.offsetHeight / 2;
    var isMale = pb.classList.contains('person-male');
    ctx.fillStyle = isMale ? '#4a7ab5' : '#b54a7a';
    ctx.fillRect(
      Math.round(px * scaleX) - 2,
      Math.round(py * scaleY) - 1,
      4, 3
    );
  }

  // Draw upward triangles for top-row people with further ancestors
  var hasParentsCells = grid.querySelectorAll('[data-has-parents="1"]');
  ctx.fillStyle = '#2a2';
  for (var i = 0; i < hasParentsCells.length; i++) {
    var cell = hasParentsCells[i];
    var cx = Math.round((cell.offsetLeft + cell.offsetWidth / 2) * scaleX);
    var cy = Math.round(cell.offsetTop * scaleY);
    // Draw upward triangle above the person
    var ty = Math.max(0, cy - 7);
    ctx.beginPath();
    ctx.moveTo(cx, ty);
    ctx.lineTo(cx - 4, ty + 5);
    ctx.lineTo(cx + 4, ty + 5);
    ctx.closePath();
    ctx.fill();
  }

  // Always show viewport rectangle and scroll controls
  var vpRect = document.createElement('div');
  vpRect.className = 'tree-minimap-viewport';
  wrapper.appendChild(vpRect);

  var self = this;
  function updateViewport() {
    var scrollLeft = container.scrollLeft;
    var rx = scrollLeft * scaleX;
    var rw = viewW * scaleX;
    vpRect.style.left = Math.round(rx) + 'px';
    vpRect.style.top = '0';
    vpRect.style.width = Math.min(Math.round(rw), mapW) + 'px';
    vpRect.style.height = mapH + 'px';
  }
  updateViewport();

  container.addEventListener('scroll', updateViewport);

  // Click minimap to scroll
  canvas.addEventListener('click', function(e) {
    var rect = canvas.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var targetScroll = (clickX / mapW) * treeW - viewW / 2;
    container.scrollLeft = Math.max(0, Math.min(targetScroll, treeW - viewW));
  });

  // Drag minimap viewport
  var dragging = false;
  wrapper.addEventListener('mousedown', function(e) {
    dragging = true;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var rect = canvas.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var targetScroll = (clickX / mapW) * treeW - viewW / 2;
    container.scrollLeft = Math.max(0, Math.min(targetScroll, treeW - viewW));
  });
  document.addEventListener('mouseup', function() { dragging = false; });
};
