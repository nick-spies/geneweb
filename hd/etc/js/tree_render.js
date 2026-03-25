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
  var showSosa = p.displaySosa || p.posSosa;
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



  var sosaLabel = p.displaySosa || p.posSosa;
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
  if (numCells <= 2)  return { fontSize: 0.85, imgSize: 50, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 4)  return { fontSize: 0.80, imgSize: 45, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 8)  return { fontSize: 0.75, imgSize: 38, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 16) return { fontSize: 0.70, imgSize: 30, showImage: true,  showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 32) return { fontSize: 0.65, imgSize: 0,  showImage: false, showSurname: true,  showSosa: true,  showDates: true  };
  if (numCells <= 64) return { fontSize: 0.60, imgSize: 0,  showImage: false, showSurname: true,  showSosa: true,  showDates: true  };
  return                      { fontSize: 0.55, imgSize: 0,  showImage: false, showSurname: true,  showSosa: true,  showDates: false };
};

TreeRenderer.prototype.render = function() {
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
      conn.setAttribute('data-father', fatherSosa);
      conn.setAttribute('data-mother', motherSosa);

      // Marriage year label
      var mYear = marriageMap[sosa] || '';
      var marr = document.createElement('span');
      marr.className = 'tree-marriage';
      marr.textContent = mYear ? '& ' + mYear : '&';
      conn.appendChild(marr);

      unit.appendChild(conn);
    }

    // Person box
    if (person) {
      var personEl = document.createElement('div');
      personEl.className = 'fu-person';
      personEl.setAttribute('data-sosa', sosa);

      var pb = new PersonBox(person);
      pb.showImage = style.showImage;
      pb.imgSize = style.imgSize;
      pb.fontSize = style.fontSize;
      pb.showSurname = style.showSurname;
      pb.showSosa = style.showSosa;
      pb.showDates = style.showDates;
      pb.treeAccess = treeAccess;
      pb.options = opts;


      personEl.appendChild(pb.render());
      unit.appendChild(personEl);
    }

    return unit;
  }

  // Build the tree from Sosa 1
  var tree = buildSubtree(1);
  tree.classList.add('fu-root');

  this.container.innerHTML = '';
  this.container.appendChild(tree);



  // Position connector lines after layout
  this.positionConnectors(tree);

  // Auto-scroll to center Sosa 1
  var container = this.container;
  var sosa1El = tree.querySelector('.fu-person[data-sosa="1"]');
  if (sosa1El) {
    setTimeout(function() {
      var elCenter = sosa1El.offsetLeft + sosa1El.offsetWidth / 2;
      var viewCenter = container.clientWidth / 2;
      container.scrollLeft = Math.max(0, elCenter - viewCenter);
    }, 200);
  }

  this.addHomeButton(treeAccess);
  this.updateTitle();

  var self2 = this;
  setTimeout(function() { self2.buildMinimap(tree); }, 300);
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
        childEl.style.transform = 'translateX(' + offset.toFixed(1) + 'px)';
      }
    }
  }
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

TreeRenderer.prototype.addHomeButton = function(treeAccess) {
  var opts = this.options;
  if (!opts.selfAccess) return;

  var ascGroup = document.querySelector('nav.navbar.fixed-bottom .btn-group[aria-label="ascendant tree button group"]');
  if (!ascGroup) return;

  var isSelf = !opts.isRerooted;

  var selfTreeUrl = treeAccess(opts.selfAccess);
  var sosa1Name = (opts.selfName || '').replace(/\b\w/g, function(c) { return c.toUpperCase(); });

  var homeBtn = document.createElement('a');
  homeBtn.setAttribute('role', 'button');
  var i18n = opts.i18n || {};
  if (isSelf) {
    homeBtn.className = 'btn btn-outline-success border-2 rounded mr-1 px-2 pt-1 h-100 font-weight-bold';
    homeBtn.title = (i18n.homeTipSelf || 'Sosa 1') + ': ' + sosa1Name;
  } else {
    homeBtn.className = 'btn btn-outline-danger border-2 rounded mr-1 px-2 pt-1 h-100';
    homeBtn.href = selfTreeUrl;
    homeBtn.title = (i18n.homeTipOther || 'Restore default Sosa 1') + ': ' + sosa1Name;
  }
  homeBtn.innerHTML = '<i class="fa fa-sitemap fa-flip-vertical fa-lg"></i><br>Sosa 1';

  ascGroup.parentNode.insertBefore(homeBtn, ascGroup);
};

// ── Minimap ────────────────────────────────────────────────────────────────

TreeRenderer.prototype.buildMinimap = function(tree) {
  var container = this.container;
  var treeW = tree.scrollWidth;
  var treeH = tree.scrollHeight;
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
  var mapW = Math.max(60, Math.min(availW, 450));
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

  var personBoxes = tree.querySelectorAll('.person-box');

  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, mapW, mapH);

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
  }

  var vpRect = document.createElement('div');
  vpRect.className = 'tree-minimap-viewport';
  wrapper.appendChild(vpRect);

  var self = this;
  var treeRect = tree.getBoundingClientRect();
  function updateViewport() {
    var scrollLeft = container.scrollLeft;
    var rx = scrollLeft * scaleX;
    var rw = viewW * scaleX;

    // Vertical: tree overflows into page scroll
    var treeBCR = tree.getBoundingClientRect();
    var visTop = Math.max(0, -treeBCR.top);
    var visBot = Math.min(treeH, window.innerHeight - treeBCR.top);
    var visH = Math.max(0, visBot - visTop);
    var ry = visTop * scaleY;
    var rh = visH * scaleY;

    vpRect.style.left = Math.round(rx) + 'px';
    vpRect.style.top = Math.round(ry) + 'px';
    vpRect.style.width = Math.min(Math.max(Math.round(rw), 8), mapW) + 'px';
    vpRect.style.height = Math.min(Math.max(Math.round(rh), 8), mapH) + 'px';
  }
  updateViewport();

  container.addEventListener('scroll', updateViewport);
  window.addEventListener('scroll', updateViewport);
  window.addEventListener('resize', updateViewport);

  // Minimap click/drag: scroll both horizontal (container) and vertical (page)
  function panToMinimap(e) {
    var rect = canvas.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var clickY = e.clientY - rect.top;
    // Horizontal: scroll the container
    var targetScrollX = (clickX / mapW) * treeW - viewW / 2;
    container.scrollLeft = Math.max(0, Math.min(targetScrollX, treeW - viewW));
    // Vertical: scroll the page so tree portion under click is centered
    var treeTargetY = (clickY / mapH) * treeH;
    var treePageTop = tree.getBoundingClientRect().top + window.pageYOffset;
    var targetScrollY = treePageTop + treeTargetY - window.innerHeight / 2;
    window.scrollTo({ left: window.pageXOffset, top: Math.max(0, targetScrollY) });
  }

  canvas.addEventListener('click', panToMinimap);

  var dragging = false;
  wrapper.addEventListener('mousedown', function(e) {
    dragging = true;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    panToMinimap(e);
  });
  document.addEventListener('mouseup', function() { dragging = false; });
};
