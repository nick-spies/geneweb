/**
 * tree_render.js — CSS Grid ancestor tree renderer
 *
 * Symmetric layout: positions are computed from Sosa 1 (center) outward.
 * Paternal line gets negative offsets, maternal line gets positive offsets,
 * always equal in magnitude. Each generation doubles the number of slots.
 * The top generation's extent determines the grid width; positions cascade
 * down so every child is perfectly centered under its parent couple.
 *
 * Grid structure: 2^numGens data columns + (2^numGens - 1) spacer columns.
 * For generation g (0=self, numGens=top), cell c occupies:
 *   gridStart = c * step + 1,  span = step - 1,  step = 2^(row+1)
 * where row = numGens - g.
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
  nameLink.title = this.tooltipText() + ' (click: re-root tree, \u2318-click: person page)';

  var treeAccess = this.treeAccess;
  if (treeAccess) {
    nameLink.addEventListener('click', function(e) {
      if (e.metaKey || e.ctrlKey) return; // Cmd/Ctrl-click: follow link normally
      e.preventDefault();
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

// Per-row display settings based on number of cells in that row
TreeRenderer.prototype.rowStyle = function(numCells) {
  if (numCells <= 2)  return { fontSize: 0.85, imgSize: 50, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 4)  return { fontSize: 0.80, imgSize: 45, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 8)  return { fontSize: 0.75, imgSize: 38, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 16) return { fontSize: 0.70, imgSize: 30, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 32) return { fontSize: 0.65, imgSize: 0,  showImage: false, showSurname: true,  showSosa: false, showDates: false };
  return                      { fontSize: 0.55, imgSize: 0,  showImage: false, showSurname: false, showSosa: false, showDates: false };
};

// Build generation slots: map each row's cells to symmetric Sosa positions.
// Returns array indexed by generation (0=self, numGens=top).
// Each entry is an array of 2^gen slots (cell data or undefined for missing ancestors).
TreeRenderer.prototype.buildGenerations = function(rows) {
  var numGens = rows.length - 1;
  var generations = [];

  for (var r = 0; r < rows.length; r++) {
    var gen = numGens - r;
    var expectedCount = Math.pow(2, gen);
    var slots = new Array(expectedCount);
    var cells = rows[r].cells;

    if (cells.length === expectedCount) {
      // Direct mapping: cell index = slot index
      for (var c = 0; c < cells.length; c++) {
        slots[c] = cells[c];
      }
    } else {
      // Fewer cells than expected (missing ancestors collapsed the grid).
      // Use Sosa numbers to place each cell at its correct symmetric slot.
      var genStart = Math.pow(2, gen);
      for (var c = 0; c < cells.length; c++) {
        if (cells[c].person && cells[c].person.hasSosa) {
          var sosa = parseInt(cells[c].person.sosa);
          var slot = sosa - genStart;
          if (slot >= 0 && slot < expectedCount) {
            slots[slot] = cells[c];
          }
        }
      }
    }

    generations[gen] = slots;
  }

  return generations;
};

TreeRenderer.prototype.render = function() {
  var rows = this.data.rows;
  if (!rows || !rows.length) return;

  var numGens = rows.length - 1;

  // Symmetric grid: 2^numGens data columns + spacers between them
  var idealTop = Math.pow(2, numGens);
  var totalCols = idealTop * 2 - 1;

  // Map data cells to symmetric Sosa-based slots
  var generations = this.buildGenerations(rows);

  var grid = document.createElement('div');
  grid.className = 'tree-grid';

  // Uniform column template: data(1fr) spacer(4px) data(1fr) spacer(4px) ...
  var colTemplate = [];
  for (var i = 0; i < idealTop; i++) {
    if (i > 0) colTemplate.push('4px');
    colTemplate.push('1fr');
  }
  grid.style.gridTemplateColumns = colTemplate.join(' ');

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
    var url = personAccess + sep + 'm=A&t=T&t1=GR&v=' + gens;
    if (sosa1Pz) url += '&pz=' + sosa1Pz + '&nz=' + sosa1Nz + '&ocz=' + sosa1Ocz;
    return url;
  };

  var gridRow = 1;

  // Render generations from top (numGens) to bottom (0 = self)
  for (var g = numGens; g >= 0; g--) {
    var r = numGens - g;
    var slots = generations[g];
    var numCells = slots.length;  // 2^g
    var step = Math.pow(2, r + 1);   // grid columns between cell starts
    var span = step - 1;             // grid columns per cell
    var style = this.rowStyle(numCells);

    // ── Person row ──
    for (var c = 0; c < numCells; c++) {
      var cell = slots[c];
      var gridStart = c * step + 1;

      if (cell && cell.person) {
        var personEl = document.createElement('div');
        personEl.className = 'tree-cell tree-cell-person';
        personEl.style.gridColumn = gridStart + ' / ' + (gridStart + span);
        personEl.style.gridRow = gridRow;

        var pb = new PersonBox(cell.person);
        pb.showImage = style.showImage;
        pb.imgSize = style.imgSize;
        pb.fontSize = style.fontSize;
        pb.showSurname = style.showSurname;
        pb.showSosa = style.showSosa;
        pb.showDates = style.showDates;
        pb.treeAccess = treeAccess;
        pb.options = opts;

        // Mark top-row people who have further ancestors (for minimap triangles)
        if (g === numGens && cell.person.hasParents) {
          personEl.setAttribute('data-has-parents', '1');
        }

        personEl.appendChild(pb.render());
        grid.appendChild(personEl);
      }
      // Empty slots need no DOM element — grid leaves them naturally empty
    }
    gridRow++;

    // ── Branch connector row (between this generation and the one below) ──
    if (g > 0) {
      var childCount = Math.pow(2, g - 1);  // number of children in next gen down

      for (var k = 0; k < childCount; k++) {
        var father = slots[2 * k];      // even slot = paternal (left)
        var mother = slots[2 * k + 1];  // odd slot = maternal (right)
        var fatherOk = father && father.person;
        var motherOk = mother && mother.person;

        var fatherStart = (2 * k) * step + 1;
        var motherStart = (2 * k + 1) * step + 1;
        var gapCol = (2 * k + 1) * step;  // spacer column between couple

        // Left branch (father side)
        if (fatherOk) {
          this.addCell(grid, gridRow, fatherStart, span, 'tree-cell tree-branch-left', '');
        }

        // Bottom bridge connecting the couple
        if (fatherOk && motherOk) {
          this.addCell(grid, gridRow, gapCol, 1, 'tree-branch-bottom', '');
        }

        // Right branch (mother side)
        if (motherOk) {
          this.addCell(grid, gridRow, motherStart, span, 'tree-cell tree-branch-right', '');
        }

        // Marriage year overlay (spans full couple width)
        if (fatherOk && motherOk) {
          var marriageYear = mother.family ? mother.family.marriageYear : '';
          if (marriageYear) {
            var coupleStart = fatherStart;
            var coupleEnd = motherStart + span;
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

  // Build minimap
  var self = this;
  setTimeout(function() { self.buildMinimap(grid); }, 100);
};

TreeRenderer.prototype.updateTitle = function() {
  var opts = this.options;
  if (!opts.isRerooted) return;
  var titleEl = document.getElementById('tree-title');
  if (!titleEl) return;
  var name = (opts.selfName || '').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  var from = opts.currentName || '';
  var span = titleEl.querySelector('span');
  if (span) {
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
    var fromSpan = document.createElement('span');
    fromSpan.className = 'text-small text-muted font-weight-lighter';
    fromSpan.textContent = '(shown from ' + from + ')';
    titleEl.insertBefore(fromSpan, span);
    span.style.display = 'none';
  }

  var selfBtn = document.getElementById('self');
  if (selfBtn && opts.selfAccess) {
    selfBtn.href = opts.selfAccess;
    selfBtn.title = name;
  }
};

TreeRenderer.prototype.addHomeButton = function(treeAccess) {
  var opts = this.options;
  if (!opts.selfAccess) return;

  var ascGroup = document.querySelector('nav.navbar.fixed-bottom .btn-group[aria-label="ascendant tree button group"]');
  if (!ascGroup) return;

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

  var navbar = document.querySelector('nav.navbar.fixed-bottom');
  if (!navbar) return;
  var toolbar = navbar.querySelector('.btn-toolbar');
  if (!toolbar) return;

  var placeholder = document.createElement('div');
  placeholder.style.cssText = 'flex:1;min-width:0;visibility:hidden;';
  toolbar.insertBefore(placeholder, toolbar.firstChild);
  var availW = placeholder.offsetWidth - 16;
  toolbar.removeChild(placeholder);

  if (availW < 60) availW = Math.min(200, viewW * 0.2);

  var navbarH = navbar.offsetHeight - 8;
  var mapW = Math.max(60, Math.min(availW, 300));
  var mapH = navbarH;
  var treeAspect = treeW / treeH;
  var mapAspect = mapW / mapH;
  if (mapAspect > treeAspect) {
    mapW = Math.round(mapH * treeAspect);
  }

  var scaleX = mapW / treeW;
  var scaleY = mapH / treeH;

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

  var personBoxes = grid.querySelectorAll('.person-box');
  var branches = grid.querySelectorAll('.tree-branch-left, .tree-branch-right, .tree-branch-bottom');

  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, mapW, mapH);

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

  var hitZones = [];
  var hitRadius = 8;
  for (var i = 0; i < personBoxes.length; i++) {
    var pb = personBoxes[i];
    var parent = pb.parentNode;
    var px = parent.offsetLeft + parent.offsetWidth / 2;
    var py = parent.offsetTop + parent.offsetHeight / 2;
    var isMale = pb.classList.contains('person-male');
    ctx.fillStyle = isMale ? '#4a7ab5' : '#b54a7a';
    var dotX = Math.round(px * scaleX);
    var dotY = Math.round(py * scaleY);
    ctx.fillRect(dotX - 2, dotY - 1, 4, 3);

    var nameEl = pb.querySelector('a.person-name');
    if (nameEl) {
      hitZones.push({
        x: dotX, y: dotY,
        access: nameEl.href,
        name: pb.title || nameEl.textContent
      });
    }
  }

  var hasParentsCells = grid.querySelectorAll('[data-has-parents="1"]');
  ctx.fillStyle = '#2a2';
  for (var i = 0; i < hasParentsCells.length; i++) {
    var cell = hasParentsCells[i];
    var cx = Math.round((cell.offsetLeft + cell.offsetWidth / 2) * scaleX);
    var cy = Math.round(cell.offsetTop * scaleY);
    var ty = Math.max(0, cy - 7);
    ctx.beginPath();
    ctx.moveTo(cx, ty);
    ctx.lineTo(cx - 4, ty + 5);
    ctx.lineTo(cx + 4, ty + 5);
    ctx.closePath();
    ctx.fill();
  }

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

  function hitTest(mx, my) {
    var best = null, bestDist = hitRadius * hitRadius;
    for (var i = 0; i < hitZones.length; i++) {
      var hz = hitZones[i];
      var dx = mx - hz.x, dy = my - hz.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestDist) { bestDist = d2; best = hz; }
    }
    return best;
  }

  canvas.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    var hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hit ? 'pointer' : 'default';
  });
  canvas.addEventListener('mouseleave', function() {
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('click', function(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var hit = hitTest(mx, my);
    if (hit && hit.access) {
      var gens = self.options.generations || 3;
      var sep = hit.access.indexOf('?') >= 0 ? '&' : '?';
      var url = hit.access + sep + 'm=A&t=T&t1=GR&v=' + gens;
      var sa = self.options.selfAccess || '';
      var pzM = sa.match(/[?&]pz=([^&]*)/);
      var nzM = sa.match(/[?&]nz=([^&]*)/);
      var oczM = sa.match(/[?&]ocz=([^&]*)/);
      if (pzM) url += '&pz=' + pzM[1] + '&nz=' + nzM[1] + '&ocz=' + (oczM ? oczM[1] : '');
      window.location.href = url;
    } else {
      var clickX = mx;
      var targetScroll = (clickX / mapW) * treeW - viewW / 2;
      container.scrollLeft = Math.max(0, Math.min(targetScroll, treeW - viewW));
    }
  });

  var dragging = false;
  wrapper.addEventListener('mousedown', function(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    if (!hitTest(mx, my)) {
      dragging = true;
      e.preventDefault();
    }
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
