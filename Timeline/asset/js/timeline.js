var oTimeline = {
  resizeTimerID: null,

  resizeTimeline: function() {
    if (resizeTimerID == null) {
      resizeTimerID = window.setTimeout(function() {
        resizeTimerID = null;
        tl.layout();
      }, 500);
    }
  },

  _monkeyPatchFillInfoBubble: function() {
    var oldFillInfoBubble =
    Timeline.DefaultEventSource.Event.prototype.fillInfoBubble;
    Timeline.DefaultEventSource.Event.prototype.fillInfoBubble =
    function(elmt, theme, labeller) {
      var doc = elmt.ownerDocument;

      var title = this.getText();
      var link = this.getLink();
      var image = this.getImage();

      if (image != null) {
        var img = doc.createElement("img");
        img.src = image;

        theme.event.bubble.imageStyler(img);
        elmt.appendChild(img);
      }

      var divTitle = doc.createElement("div");
      var textTitle = doc.createElement("span");
      textTitle.innerHTML = title;
      if (link != null) {
        var a = doc.createElement("a");
        a.href = link;
        a.appendChild(textTitle);
        divTitle.appendChild(a);
      } else {
        divTitle.appendChild(textTitle);
      }
      theme.event.bubble.titleStyler(divTitle);
      elmt.appendChild(divTitle);

      var divBody = doc.createElement("div");
      this.fillDescription(divBody);
      theme.event.bubble.bodyStyler(divBody);
      elmt.appendChild(divBody);

      var divTime = doc.createElement("div");
      this.fillTime(divTime, labeller);
      theme.event.bubble.timeStyler(divTime);
      elmt.appendChild(divTime);

      var divWiki = doc.createElement("div");
      this.fillWikiInfo(divWiki);
      theme.event.bubble.wikiStyler(divWiki);
      elmt.appendChild(divWiki);
    };
  },

  loadTimeline: function(timelineId, timelineData, params) {
    oTimeline._monkeyPatchFillInfoBubble();
    var eventSource = new Timeline.DefaultEventSource();

    var defaultTheme = Timeline.getDefaultTheme();
    defaultTheme.mouseWheel = 'zoom';
    // defaultTheme.autoWidth = true;

    var bandInfos = [];
    if (typeof params.bandInfos !== 'undefined' && params.bandInfos.length) {
      for (i = 0; i < params.bandInfos.length; ++i) {
        if (typeof params.bandInfos[i].eventSource === 'undefined') {
          params.bandInfos[i].eventSource = eventSource;
        }
        bandInfos[i] = Timeline.createBandInfo(params.bandInfos[i]);
      }
    } else {
      bandInfos = [
        Timeline.createBandInfo({
          eventSource: eventSource,
          width: "80%",
          intervalUnit: Timeline.DateTime.MONTH,
          intervalPixels: 100,
          zoomIndex: 10,
          zoomSteps: new Array(
            {pixelsPerInterval: 280, unit: Timeline.DateTime.HOUR},
            {pixelsPerInterval: 140, unit: Timeline.DateTime.HOUR},
            {pixelsPerInterval: 70, unit: Timeline.DateTime.HOUR},
            {pixelsPerInterval: 35, unit: Timeline.DateTime.HOUR},
            {pixelsPerInterval: 400, unit: Timeline.DateTime.DAY},
            {pixelsPerInterval: 200, unit: Timeline.DateTime.DAY},
            {pixelsPerInterval: 100, unit: Timeline.DateTime.DAY},
            {pixelsPerInterval: 50, unit: Timeline.DateTime.DAY},
            {pixelsPerInterval: 400, unit: Timeline.DateTime.MONTH},
            {pixelsPerInterval: 200, unit: Timeline.DateTime.MONTH},
            {pixelsPerInterval: 100, unit: Timeline.DateTime.MONTH} // DEFAULT zoomIndex
          )
        }),
        Timeline.createBandInfo({
          overview: true,
          eventSource: eventSource,
          width: "20%",
          intervalUnit: Timeline.DateTime.YEAR,
          intervalPixels: 200
        })
      ];
    }

    // All bands are synchronized with the first.
    for (i = 1; i < bandInfos.length; ++i) {
      bandInfos[i].syncWith = 0;
      bandInfos[i].highlight = true;
    }

    var tl = Timeline.create(document.getElementById(timelineId), bandInfos);
    window.tl = tl;
    window.tlid = timelineId;
    //console.log("TUTUTUTUTU"+timelineData);
    tl.loadJSON(timelineData, function(json, url) {
      // log the timelineData, and see what's there
      // figure out what's creating the timelineData json
      // console.log("json: ", json);
      // console.log("timelineData: ", timelineData);
      if (json.events.length > 0) {
        //console.log(" EVENTS  "+json.events[0]);
        eventSource.loadJSON(json, url);
        var centerDate = params.centerDate;
        // console.log("centerDate: " + centerDate);
        if (!centerDate) {
          centerDate = new Date().toJSON().slice(0,10);
        } else if (centerDate === '0000-00-00') {
          centerDate = eventSource.getEarliestDate();
        } else if (centerDate === '9999-99-99') {
          centerDate = eventSource.getLatestDate();
        }
        // console.log("centerDate: " + centerDate);
        var parsedDate = Timeline.DateTime.parseGregorianDateTime(centerDate);
        // console.log('parseddate: ', parsedDate);
        tl.getBand(0).setCenterVisibleDate(parsedDate);
      }
    });
    setupFilterHighlightControls(window.tl, [0,1], Timeline.ClassicTheme.create(), params);
    addFullPageButton(window.tlid);
  }
};


function addFullPageButton(timelineId) {
  if (window.divfp != null) {
    //console.log("avant add "+window.divfp.id);
    window.divfp.parentNode.removeChild(window.divfp);
    //console.log("après add "+window.divfp);
  }
  //console.log("classNameTimeline "+document.getElementsByClassName("timeline")[0].style.margin);
  //document.getElementsByClassName("timeline")[0].style.margin = "0";
  window.divfp = window.tl.getDocument().createElement("div");
  window.divfp.className = "fullPage";
  delete window.fpimg;
  window.fpimg = document.createElement('img');
  window.fpimg.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/fullscreen_white.svg');
  window.divfp.appendChild(window.fpimg);
  window.fpimg.style.marginRight="0.15em";
  window.fpimg.setAttribute('onclick','enableFullPage();'); // for FF
  window.fpimg.onclick = function() {enableFullPage();}; // for IE
  window.tl._containerDiv.appendChild(window.divfp);
  window.divfp.style.zIndex="100";
  //window.divfp.style.position = "relative";
  //window.divfp.style.cssFloat = "right";
  window.divfp.style.position = "absolute";
  window.divfp.style.right = "0%";
  window.divfp.style.bottom = "0%";
  window.divfp.style.paddingRight = "0.1em";
  window.divfp.style.cursor = "pointer";
}


//
//
// FILTRES
//
//


function setupInputFiltersHighlights(timeline, bandIndices, theme, table, handler) {
  window.regexpckb = [];
  var tr = table.insertRow(2);
  var td = tr.insertCell(0);
  td.style.borderBottomStyle = "none";

  var input = document.createElement("input");
  input.type = "text";
  SimileAjax.DOM.registerEvent(input, "keydown", handler);
  td.appendChild(input);

  for (var i = 0; i < theme.event.highlightColors.length; i++) {
    td = tr.insertCell(i+1);
    td.style.borderBottomStyle = "none";

    input = document.createElement("input");
    input.type = "text";
    SimileAjax.DOM.registerEvent(input, "keydown", handler);
    td.appendChild(input);

    var divColor = document.createElement("div");
    divColor.style.height = "0.5em";
    divColor.style.background = theme.event.highlightColors[i];
    td.appendChild(divColor);
  }
}


function setupFilterHighlightControls(timeline, bandIndices, theme, params) {
  var tablelabels = document.createElement("table");
  var tableflt = document.createElement("table");
  var divlabels = document.getElementById("fltLabelsButton");
  var divflt = document.getElementById("ckbfilters");

  var tr = tablelabels.insertRow(0);
  var td = tr.insertCell(tr.cells.length);
  td.style.borderBottomStyle = "none";
  var button = document.createElement("button");
  button.innerHTML = "Clear All";
  SimileAjax.DOM.registerEvent(button, "click", function() {
    clearAllCkb(timeline, bandIndices, tableflt, false);
    clearAllInputs(timeline, bandIndices, tablelabels);
  });
  td.appendChild(button);

  divlabels.appendChild(tablelabels);
  divflt.appendChild(tableflt);


  var handlerCkb = function(elmt, evt, target) {
    onCheck(timeline, bandIndices, tableflt);
  };

  var handlerInputs = function(elmt, evt, target) {
    onKeyPress(timeline, bandIndices, tablelabels);
  }

  if (params.userFilters === '0') {
    tr = tablelabels.insertRow(1);
    td = tr.insertCell(0);
    td.style.borderBottomStyle = "none";
    td.innerHTML = "Filter :";

    td = tr.insertCell(1);
    td.style.borderBottomStyle = "none";
    td.innerHTML = "Highlight:";
    setupInputFiltersHighlights(timeline, bandIndices, theme, tablelabels, handlerInputs);
  }

  var words = params.filters.split('\n');
  if (words[words.length-1] === "" || words[words.length-1] === " ") {
    words.splice(words.length-1, 1);
  }
  if (words.length>=1 && words[0] != "" && words[0] != " ") {
    for (var i=words.length-1; i>=0; i--) {
      tr = tableflt.insertRow(0);
      td = tr.insertCell(0);
      var ckb = document.createElement("input");
      var ckbid = "ckb"+i;
      ckb.setAttribute("type", "checkbox");
      ckb.setAttribute("id", ckbid);
      td.appendChild(ckb);
      td.style.borderBottomStyle = "none";
      td = tr.insertCell(1);
      var input = document.createElement("label");
      input.setAttribute("for", ckbid);
      var t = document.createTextNode(words[i]);
      input.appendChild(t);
      td.appendChild(input);
      SimileAjax.DOM.registerEvent(ckb, "change", handlerCkb);
      td.style.borderBottomStyle = "none";
    }
  }
}


function cleanString(s) {
  return s.replace(/^\s+/, '').replace(/\s+$/, '');
}



//
//
// FILTRAGE DES INPUTS
//
//


var timerID = null;
function onKeyPress(timeline, bandIndices, table) {
  if (timerID != null) {
    window.clearTimeout(timerID);
  }
  timerID = window.setTimeout(function() {
    performFilteringInputs(timeline, bandIndices, table);
  }, 300);
}

function performFilteringInputs(timeline, bandIndices, table) {
  timerID = null;

  var tr = table.rows[2];
  var text = cleanString(tr.cells[0].firstChild.value);

  window.regexpfilter = null;
  if (text.length > 0) {
    window.regexpfilter = text;
  }
  else {
    window.regexpfilter = null;
  }
  var filterMatcher = function(evt) {
    if (window.regexpfilter==null && window.regexpckb.length==0) return true;
    if (typeof window.regexpckb !== 'undefined') {
      for (var i=0; i<window.regexpckb.length; i++) {
        var regex = new RegExp(window.regexpckb[i], "i");
        if (regex.test(evt.getText()) || regex.test(evt.getDescription()) || regex.test(evt.getStart()) || regex.test(evt.getClassName())) {
          return true;
        }
      }
    }
    if (window.regexpfilter==null) return false;
    {
      var regex = new RegExp(window.regexpfilter, "i");
      return regex.test(evt.getText()) || regex.test(evt.getDescription()) || regex.test(evt.getStart()) || regex.test(evt.getClassName());
    }
  }

  var regexes = [];
  var hasHighlights = false;
  for (var x = 1; x < tr.cells.length; x++) {
    var input = tr.cells[x].firstChild;
    var text2 = cleanString(input.value);
    if (text2.length > 0) {
      hasHighlights = true;
      regexes.push(new RegExp(text2, "i"));
    } else {
      regexes.push(null);
    }
  }
  var highlightMatcher = hasHighlights ? function(evt) {
    var text = evt.getText();
    var description = evt.getDescription();
    for (var x = 0; x < regexes.length; x++) {
      var regex = regexes[x];
      if (regex != null && (regex.test(text) || regex.test(description))) {
        return x;
      }
    }
    return -1;
  } : null;

  for (var i = 0; i < bandIndices.length; i++) {
    var bandIndex = bandIndices[i];
    timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(filterMatcher);
    timeline.getBand(bandIndex).getEventPainter().setHighlightMatcher(highlightMatcher);
  }
  timeline.paint();
}

function clearAllInputs(timeline, bandIndices, table) {
  window.regexpfilter = null;
  var tr = table.rows[2];
  for (var x = 0; x < tr.cells.length; x++) {
    tr.cells[x].firstChild.value = "";
  }

  for (var i = 0; i < bandIndices.length; i++) {
    var bandIndex = bandIndices[i];
    timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(null);
    timeline.getBand(bandIndex).getEventPainter().setHighlightMatcher(null);
  }
  timeline.paint();
}



//
//
// FILTRAGE DES CHECKBOXES
//
//


function onCheck(timeline, bandIndices, table) {
  performFilteringCkb(timeline, bandIndices, table);
}

function performFilteringCkb(timeline, bandIndices, table) {
  var list=[];
  for(var i=0;i<table.rows.length; i++) {
    var tr = table.rows[i];
    if (tr.cells[0].firstChild.checked) {
      var text = cleanString(tr.cells[1].firstChild.innerText);

      if (text.length > 0) {
        list.push(text);
      }
    }
  }
  if (list.length===0) {
    clearAllCkb(timeline, bandIndices, table, true);
    return;
  }
  window.regexpckb = [];
  for (var i=0; i<list.length; i++) {
    window.regexpckb.push(list[i]);
  }
  var filterMatcher = function(evt) {
    /*
    console.log("   evt     "+Object.values(evt));
    console.log("   KEYS    "+Object.keys(evt));
    console.log("   obj    "+evt._id);
    console.log("   ClassName    "+evt._classname);
    if (evt._id === "e381") {
      console.log("   evt     "+Object.values(evt));
      console.log("   keys    "+Object.keys(evt));
      console.log("   TRUC    "+evt._classname);
    }
    console.log("   obj    "+Object.keys(evt._obj));
    */
    if (window.regexpfilter==null && window.regexpckb.length==0) return true;
    for (var i=0; i<window.regexpckb.length; i++) {
      var regex = new RegExp(window.regexpckb[i], "i");
      if (regex.test(evt.getText()) || regex.test(evt.getDescription()) || regex.test(evt.getStart()) || regex.test(evt.getClassName())) {
        return true;
      }
    }
    if (window.regexpfilter==null) return false;
    {
      var regex = new RegExp(window.regexpfilter, "i");
      return regex.test(evt.getText()) || regex.test(evt.getDescription()) || regex.test(evt.getStart()) || regex.test(evt.getClassName());
    }
  }

  for (var i = 0; i < bandIndices.length; i++) {
    var bandIndex = bandIndices[i];
    timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(filterMatcher);
  }
  timeline.paint();
}

function clearAllCkb(timeline, bandIndices, table, createfilt) {
  for (var i=0; i<table.rows.length; i++) {
    var tr = table.rows[i];
    tr.cells[0].firstChild.checked=false;
  }
  window.regexpckb = [];
  if (!createfilt) {


    var filterMatcher = function(evt) {
      if (window.regexpfilter==null) return true;
      var regex = new RegExp(window.regexpfilter, "i");
      return regex.test(evt.getText()) || regex.test(evt.getDescription()) || regex.test(evt.getStart());
    }

    for (var i = 0; i < bandIndices.length; i++) {
      var bandIndex = bandIndices[i];
      timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(null);
    }
  }
  timeline.paint();
}



//
//
// TIMELINE FULL PAGE MODE
//
//

function enableFullPage() {
  document.getElementById("user-bar").style.display = "none";
  document.getElementsByTagName("header")[0].style.display = "none";
  document.getElementsByTagName("footer")[0].style.display = "none";
  window.contentPadding = document.getElementById("content").style.padding;
  document.getElementById("content").style.padding = "0";
  window.contentMargin = document.getElementById("content").style.margin;
  document.getElementById("content").style.margin = "0";
  var b = document.getElementsByClassName("blocks")[0].children;
  for (var i=0; i<b.length; i++) {
    var fw = [];
    fw = b[i].className.split(" ");
    if (fw[0] != "timeline" && b[i].tagName != "SCRIPT") {
      b[i].style.display = "none";
    }
    if (fw[0] === "timeline") {
      window.cadreExtMargin = b[i].style.margin;
      b[i].style.margin = "0";
      window.cadreExtPadding = b[i].style.padding;
      b[i].style.padding = "0";
      window.cadreExtHeight = b[i].style.height;
      b[i].style.height = "100vh";
      window.cadreExtWidth = b[i].style.width;
      b[i].style.width = "100vw";
      window.tlHautHeight = b[i].children[2].style.height;
      b[i].children[2].style.height = "85vh";
      window.tlHautPos = b[i].children[2].style.position;
      b[i].children[2].style.position = "relative";
      window.tlBasTop = b[i].children[4].style.top;
      b[i].children[4].style.top = "0";
      window.tlBasHeight = b[i].children[4].style.height;
      b[i].children[4].style.height = "15vh";
      window.tlBasPos = b[i].children[4].style.position;
      b[i].children[4].style.position = "relative";
    }
  }

  if (window.divfp != null) {
    //console.log("avant delete "+window.divfp);
    window.divfp.parentNode.removeChild(window.divfp);
    //console.log("après delete "+window.divfp);
  }
  window.divfp = window.tl.getDocument().createElement("div");
  window.divfp.className = "fullPage";
  delete window.fpimg;
  //console.log(window.fpimg);
  window.fpimg = document.createElement('img');
  //console.log(window.fpimg);
  window.fpimg.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/exit-fullscreen_white.svg');
  window.divfp.appendChild(window.fpimg);
  window.fpimg.style.marginRight="0.15em";
  window.fpimg.setAttribute('onclick','disableFullPage();'); // for FF
  window.fpimg.onclick = function() {disableFullPage();}; // for IE
  window.tl._containerDiv.appendChild(window.divfp);
  window.divfp.style.zIndex="100";
  //window.divfp.style.position = "relative";
  //window.divfp.style.float = "right";
  //window.divfp.style.bottom = "100%"
  window.divfp.style.position = "absolute";
  window.divfp.style.right = "0%";
  window.divfp.style.bottom = "0%";
  window.divfp.style.cursor = "pointer";
}

function disableFullPage() {
  document.getElementById("user-bar").style.display = "block";
  document.getElementsByTagName("header")[0].style.display = "block";
  document.getElementsByTagName("footer")[0].style.display = "block";
  document.getElementById("content").style.padding = window.contentPadding;
  document.getElementById("content").style.margin = window.contentMargin;
  var b = document.getElementsByClassName("blocks")[0].children;
  for (var i=0; i<b.length; i++) {
    var fw = [];
    fw = b[i].className.split(" ");
    if (fw[0] != "timeline" && b[i].tagName != "SCRIPT") {
      b[i].style.display = "block";
    }
    if (fw[0] === "timeline") {
      b[i].style.margin = window.cadreExtMargin;
      b[i].style.padding = window.cadreExtPadding;
      b[i].style.height = window.cadreExtHeight;
      b[i].style.width = window.cadreExtWidth;
      b[i].children[2].style.height = window.tlHautHeight;
      b[i].children[2].style.position = window.tlHautPos;
      b[i].children[4].style.top = window.tlBasTop;
      b[i].children[4].style.height = window.tlBasHeight;
      b[i].children[4].style.position = window.tlBasPos;
    }
  }
  addFullPageButton(window.tlid);
}
