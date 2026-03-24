/**
 * tree_render.js — CSS Grid ancestor tree renderer
 *
 * Position-inheritance layout: row 0 positions cells using colspans + gaps.
 * Each subsequent row inherits positions from its parent row by spanning
 * each child from its father's start to its mother's end. This guarantees
 * children are centered under their parent couples at every level.
 *
 * Invariant: colspanSum(row) + (cells(row) - 1) = gridCols for all rows.
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

  // Compact mode: just a small colored box with Sosa number
  if (this.compact) {
    box.classList.add('person-compact');
    var link = document.createElement('a');
    link.href = p.access;
    link.className = 'person-compact-link';
    link.title = this.tooltipText();
    var treeAccess = this.treeAccess;
    if (treeAccess) {
      link.addEventListener('click', function(e) {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        window.location.href = treeAccess(p.access);
      });
    }
    link.textContent = (p.hasSosa && p.sosa) ? p.sosa : '\u00B7';
    box.appendChild(link);
    return box;
  }

  if (this.showSosa && p.hasSosa && p.sosa) {
    var badge = document.createElement('span');
    badge.className = 'person-sosa';
    badge.textContent = p.sosa;
    badge.title = 'Sosa ' + p.sosa;
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

TreeRenderer.prototype.rowStyle = function(numCells) {
  if (numCells <= 2)  return { fontSize: 0.85, imgSize: 50, showImage: true,  showSurname: true,  showSosa: true,  showDates: true,  compact: false };
  if (numCells <= 4)  return { fontSize: 0.80, imgSize: 45, showImage: true,  showSurname: true,  showSosa: true,  showDates: true,  compact: false };
  if (numCells <= 8)  return { fontSize: 0.75, imgSize: 38, showImage: true,  showSurname: true,  showSosa: true,  showDates: true,  compact: false };
  if (numCells <= 16) return { fontSize: 0.70, imgSize: 30, showImage: true,  showSurname: true,  showSosa: true,  showDates: true,  compact: false };
  if (numCells <= 32) return { fontSize: 0.60, imgSize: 0,  showImage: false, showSurname: false, showSosa: true,  showDates: false, compact: true  };
  return                      { fontSize: 0.55, imgSize: 0,  showImage: false, showSurname: false, showSosa: true,  showDates: false, compact: true  };
};

/**
 * Compute cell positions for a row, with 1-column gaps between cells.
 * Returns array of {start, end} for each cell.
 */
TreeRenderer.prototype.cellLayout = function(cells) {
  var layout = [];
  var col = 1;
  for (var c = 0; c < cells.length; c++) {
    if (c > 0) col++; // 1-column gap between adjacent cells
    var start = col;
    col += cells[c].colspan;
    layout.push({ start: start, end: col });
  }
  return layout;
};

TreeRenderer.prototype.render = function() {
  var rows = this.data.rows;
  if (!rows || !rows.length) return;

  // Compute grid total: colspanSum + (cells-1) is constant for all rows.
  // Use last row (1 cell, colspanSum = total)
  var lastRow = rows[rows.length - 1];
  var gridCols = 0;
  for (var j = 0; j < lastRow.cells.length; j++) gridCols += lastRow.cells[j].colspan;
  gridCols += lastRow.cells.length - 1;

  // Squeeze: compute a uniform column width.
  // All columns are the same size — this guarantees alignment across rows.
  var topStyle = this.rowStyle(rows[0].cells.length);
  var colWidth;
  if (topStyle.compact) colWidth = 18;
  else if (topStyle.showImage) colWidth = 30;
  else if (topStyle.showDates) colWidth = 22;
  else if (topStyle.showSurname) colWidth = 18;
  else colWidth = 14;

  var grid = document.createElement('div');
  grid.className = 'tree-grid';
  grid.style.gridTemplateColumns = 'repeat(' + gridCols + ', ' + colWidth + 'px)';

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
  var sosa1El = null;

  console.log('=== TREE DEBUG Build 30 ===');
  console.log('gridCols=' + gridCols);
  for (var dr = 0; dr < rows.length; dr++) {
    var dc = rows[dr].cells;
    var dsum = 0;
    for (var dj = 0; dj < dc.length; dj++) dsum += dc[dj].colspan;
    var dtotal = dsum + (dc.length - 1);
    var ok = dtotal === gridCols ? 'OK' : 'MISMATCH!';
    console.log('Row ' + dr + ': cells=' + dc.length + ' colspanSum=' + dsum + ' total=' + dtotal + ' ' + ok);
    // Log first few cell colspans
    var dcs = [];
    for (var dj = 0; dj < dc.length; dj++) {
      var sosa = (dc[dj].person && dc[dj].person.hasSosa) ? 'S' + dc[dj].person.sosa : (dc[dj].isEmpty ? 'empty' : 'person');
      var flags = (dc[dj].isLeft ? 'L' : '') + (dc[dj].isRight ? 'R' : '') + (dc[dj].isTop ? 'T' : '');
      dcs.push(sosa + ':' + dc[dj].colspan + (flags ? '(' + flags + ')' : ''));
    }
    console.log('  cells: ' + dcs.join(', '));
    // Log layout positions for verification
    var dl = this.cellLayout(dc);
    var dps = [];
    for (var dj = 0; dj < Math.min(dc.length, 10); dj++) {
      dps.push('[' + dl[dj].start + ',' + dl[dj].end + ')');
    }
    console.log('  layout: ' + dps.join(', ') + (dc.length > 10 ? '...' : ''));
  }

  for (var r = 0; r < rows.length; r++) {
    var cells = rows[r].cells;
    var layout = this.cellLayout(cells);
    var style = this.rowStyle(cells.length);

    // ── Person row ──
    for (var c = 0; c < cells.length; c++) {
      if (cells[c].person) {
        var personEl = document.createElement('div');
        personEl.className = 'tree-cell tree-cell-person';
        personEl.style.gridColumn = layout[c].start + ' / ' + layout[c].end;
        personEl.style.gridRow = gridRow;

        var pb = new PersonBox(cells[c].person);
        pb.compact = style.compact || false;
        pb.showImage = style.showImage;
        pb.imgSize = style.imgSize;
        pb.fontSize = style.fontSize;
        pb.showSurname = style.showSurname;
        pb.showSosa = style.showSosa;
        pb.showDates = style.showDates;
        pb.treeAccess = treeAccess;
        pb.options = opts;

        if (r === 0 && cells[c].person.hasParents) {
          personEl.setAttribute('data-has-parents', '1');
        }

        if (r === rows.length - 1) {
          sosa1El = personEl;
        }

        personEl.appendChild(pb.render());
        grid.appendChild(personEl);
      } else {
        this.addCell(grid, gridRow, layout[c].start, layout[c].end - layout[c].start,
          'tree-cell tree-cell-empty', '');
      }
    }
    gridRow++;

    // ── Branch connector row ──
    // Uses explicit positioned elements instead of pseudo-elements.
    // A "trunk" line descends from the couple center (= child center)
    // so asymmetric parents don't cause visual misalignment.
    if (r < rows.length - 1) {
      var c = 0;
      while (c < cells.length) {
        var isCouple = cells[c].isLeft && c + 1 < cells.length && cells[c + 1].isRight;
        var leftPerson = !cells[c].isEmpty && cells[c].person;
        var rightPerson = isCouple && !cells[c + 1].isEmpty && cells[c + 1].person;

        if (isCouple) {
          if (leftPerson || rightPerson) {
            var coupleStart = layout[c].start;
            var coupleEnd = layout[c + 1].end;
            var coupleW = coupleEnd - coupleStart;

            var conn = document.createElement('div');
            conn.className = 'tree-connector-box';
            conn.style.gridColumn = coupleStart + ' / ' + coupleEnd;
            conn.style.gridRow = gridRow;

            var fPct = leftPerson
              ? ((layout[c].start + layout[c].end) / 2 - coupleStart) / coupleW * 100 : 50;
            var mPct = rightPerson
              ? ((layout[c + 1].start + layout[c + 1].end) / 2 - coupleStart) / coupleW * 100 : 50;

            // Vertical from father center (top → 50%)
            if (leftPerson) {
              var el = document.createElement('div');
              el.className = 'tree-conn-vert-top';
              el.style.left = fPct.toFixed(2) + '%';
              conn.appendChild(el);
            }
            // Vertical from mother center (top → 50%)
            if (rightPerson) {
              var el = document.createElement('div');
              el.className = 'tree-conn-vert-top';
              el.style.left = mPct.toFixed(2) + '%';
              conn.appendChild(el);
            }
            // Horizontal bar connecting parent centers at 50% height
            var hLeft = leftPerson ? fPct : 50;
            var hRight = rightPerson ? mPct : 50;
            var hBar = document.createElement('div');
            hBar.className = 'tree-conn-hbar';
            hBar.style.left = hLeft.toFixed(2) + '%';
            hBar.style.width = (hRight - hLeft).toFixed(2) + '%';
            conn.appendChild(hBar);

            // Trunk from couple center (50%) down to child
            var trunk = document.createElement('div');
            trunk.className = 'tree-conn-trunk';
            conn.appendChild(trunk);

            grid.appendChild(conn);

            // Marriage overlay
            var marriageYear = cells[c + 1].family ? cells[c + 1].family.marriageYear : '';
            var overlay = document.createElement('div');
            overlay.className = 'tree-marriage-overlay';
            overlay.style.gridColumn = coupleStart + ' / ' + coupleEnd;
            overlay.style.gridRow = gridRow;
            var marr = document.createElement('span');
            marr.className = 'tree-marriage';
            marr.textContent = marriageYear ? '& ' + marriageYear : '&';
            overlay.appendChild(marr);
            grid.appendChild(overlay);
          }
          c += 2; // always advance by 2 for couples
        } else if (leftPerson) {
          // Standalone person — vertical line through
          var el = document.createElement('div');
          el.className = 'tree-connector-box';
          el.style.gridColumn = layout[c].start + ' / ' + layout[c].end;
          el.style.gridRow = gridRow;
          var vert = document.createElement('div');
          vert.className = 'tree-conn-trunk-full';
          el.appendChild(vert);
          grid.appendChild(el);
          c++;
        } else {
          c++;
        }
      }
      gridRow++;
    }
  }

  this.container.innerHTML = '';
  this.container.appendChild(grid);

  // Auto-scroll to center Sosa 1 in viewport
  var container = this.container;
  if (sosa1El) {
    setTimeout(function() {
      var elCenter = sosa1El.offsetLeft + sosa1El.offsetWidth / 2;
      var viewCenter = container.clientWidth / 2;
      container.scrollLeft = Math.max(0, elCenter - viewCenter);
    }, 200);
  }

  this.addHomeButton(treeAccess);
  this.updateTitle();

  var self = this;
  setTimeout(function() { self.buildMinimap(grid); }, 300);
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
