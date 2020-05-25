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
  //window.fpimg.onclick = function() {enableFullPage();}; // for IE
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


function recurseDomChildren(start, position, display)
{
  var nodes;
  if(start.children)
  {
    nodes = start.children;
    loopNodeChildren(nodes, position, display);
  }
}

function loopNodeChildren(nodes, position, display)
{
  var node;
  for(var i=0;i<nodes.length;i++)
  {
    node = nodes[i];
    //console.log("dddddddddddddddddddddd "+node);
    node.style.position = position;
    node.style.display = display;
    if(node.children)
    {
      recurseDomChildren(node, position, display);
    }
  }
}

function setupInputFiltersHighlights(timeline, bandIndices, theme, table, handler) {
  window.id=0;
  window.regexpckb = [];

  // la row0 a deja ete inseree: elle contient le bouton "clearall"
  // la row1 contiendra le label Filter
  var tr = table.insertRow(1);
  var td = tr.insertCell(0);
  td.style.borderBottomStyle = "none";
  td.innerHTML = "Filter :";

  // la row2 contiendra le textfield pour le filtre
  tr = table.insertRow(2);
  window.tr2 = tr;
  td = tr.insertCell(0);
  td.style.borderBottomStyle = "none";
  var input = document.createElement("input");
  input.type = "text";
  input.id="filtreInput";
  SimileAjax.DOM.registerEvent(input, "keydown", handler);
  td.appendChild(input);

  // la row3 contient le label "highlight"
  tr = table.insertRow(3);
  td = tr.insertCell(0);
  window.hl = td;
  td.style.borderBottomStyle = "none";
  td.innerHTML = "Highlights:";

  /*
  td = tr.insertCell(1);
  td.style.borderBottomStyle = "none";
  var divhigh = document.createElement("div");
  td.appendChild(divhigh);
  */

  // la row4 contient les N highights text field
  tr = table.insertRow(4);
  for (var i = 0; i < theme.event.highlightColors.length; i++) {
    td = tr.insertCell(i);
    td.style.borderBottomStyle = "none";

    /*
    var divhighi = document.createElement("div");
    divhigh.appendChild(divhighi);
    */

    input = document.createElement("input");
    input.type = "text";
    input.id="filtreInput";
    SimileAjax.DOM.registerEvent(input, "keydown", handler);
    td.appendChild(input);
    //divhighi.appendChild(input);

    var divColor = document.createElement("div");
    divColor.style.height = "0.5em";
    divColor.style.background = theme.event.highlightColors[i];
    td.appendChild(divColor);
    //divhighi.appendChild(divColor);
  }
}

function addBtTmpCkb(text) {
  if (window.params.UserCheckbox === "0") {
    var tr = window.tb.rows[2];
    var td = tr.insertCell(1);
    td.style.borderBottomStyle = "none";
    var bt = document.createElement("button");
    bt.innerHTML = "ajouter un filtre temporaire";
    td.appendChild(bt);
    SimileAjax.DOM.registerEvent(bt, "click", function() {
      //var txt = window.td.firstChild.rows[2].cells[0].firstChild.value;
      console.log("txt "+text);

      tr = window.tbflt.insertRow(0);
      td = tr.insertCell(0);

      var ckb = document.createElement("input");
      var ckbid = "ckb"+window.id;
      console.log("ckbid "+ckbid)
      ckb.setAttribute("type", "checkbox");
      ckb.setAttribute("id", ckbid);
      td.appendChild(ckb);
      td.style.borderBottomStyle = "none";
      td = tr.insertCell(1);
      var input = document.createElement("label");
      input.setAttribute("for", ckbid);
      var t = document.createTextNode(text);
      input.appendChild(t);
      td.appendChild(input);
      SimileAjax.DOM.registerEvent(ckb, "change", window.handlerCkb);
      tr.children[1].style.borderBottomStyle = "none";
      window.id++;
    });
  }
}

function removeBtTmpCkb() {
  if (window.tb.rows[2].cells[1] != null) {
    window.tb.rows[2].deleteCell(1);
  }
}

function setupFilterHighlightControls(timeline, bandIndices, theme, params) {
  window.params = params;
  var tablelabels = document.createElement("table");
  window.tb = tablelabels;
  var tableflt = document.createElement("table");
  window.tbflt = tableflt;
  var divlabels = document.getElementById("fltLabelsButton");
  var divflt = document.getElementById("ckbfilters");

  divlabels.appendChild(tablelabels);
  divflt.appendChild(tableflt);

  window.handlerCkb = function(elmt, evt, target) {
    onCheck(timeline, bandIndices, tableflt);
  };

  window.handlerInputs = function(elmt, evt, target) {
    onKeyPress(timeline, bandIndices, tablelabels);
  };

  if (params.userFilters === '0' || params.filters != "") {
    var tr = tablelabels.insertRow(0);
    var td = tr.insertCell(tr.cells.length);
    td.style.borderBottomStyle = "none";
    var button = document.createElement("button");
    button.innerHTML = "Clear All";
    SimileAjax.DOM.registerEvent(button, "click", function() {
      clearAllCkb(timeline, bandIndices, tableflt, false);
      clearAllInputs(timeline, bandIndices, tablelabels);
      removeBtTmpCkb();
    });
    td.appendChild(button);
  }

  if (params.userFilters === '0') {
    setupInputFiltersHighlights(timeline, bandIndices, theme, tablelabels, handlerInputs);
  }

  var words = params.filters.split('\n');
  if (words[words.length-1] === "" || words[words.length-1] === " ") {
    words.splice(words.length-1, 1);
  }
  window.id = words.length;
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

  if (text != null && text != "" && text != " ") {
    //if (window.tb.rows[2].cells[1] === undefined) {
      removeBtTmpCkb();
      addBtTmpCkb(text);
    //}
  }
  else {
    removeBtTmpCkb();
  }

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

  tr = table.rows[4];
  var regexes = [];
  var hasHighlights = false;
  for (var x = 0; x < tr.cells.length; x++) {
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
  table.rows[2].cells[0].firstChild.value = "";
  var tr = table.rows[4];
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

function clickfleche() {
  if (window.fltVisible===1) {
    //console.log("visible 1 "+window.fltVisible);
    if (screen.height < 1080) {
      animateLeft(window.divfpfiltzone, 0, -24);
    }
    else {
      animateLeft(window.divfpfiltzone, 0, -17);
    }
    window.fleche.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/flecheDroite.svg');
    window.fltVisible = 0;
  }
  else {
    //console.log("visible 0 "+window.fltVisible);
    if (screen.height < 1080) {
      animateLeft(window.divfpfiltzone, -24, 0);
    }
    else {
      animateLeft(window.divfpfiltzone, -17, 0);
    }
    window.fleche.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/flecheGauche.svg');
    window.fltVisible = 1;
  }
}


function animateLeft(obj, from, to){
  //console.log("animateleft");
  obj.style.left = from+"vw";
  if (to<0) {
    if (from > to) {
      setTimeout(function(){
        animateLeft(obj, from - 1, to);
      }, 3)
    }
  }
  if (to >= 0) {
    if (from < to) {
      setTimeout(function(){
        animateLeft(obj, from + 1, to);
      }, 3)
    }
  }
}


function enableFullPage() {
  //console.log("res "+screen.height);
  window.fltVisible=1;
  var theotab = document.getElementById("fltLabelsButton").firstChild;
  theotab.style.position = "relative";
  recurseDomChildren(theotab, "relative", "block");

  if (document.getElementById("user-bar") != null) {
    document.getElementById("user-bar").style.display = "none";
  }
  document.getElementsByTagName("header")[0].style.display = "none";
  document.getElementsByTagName("footer")[0].style.display = "none";
  window.contentStyle = document.getElementById("content").style;
  //window.contentPadding = document.getElementById("content").style.padding;
  document.getElementById("content").style.padding = "0";
  //window.contentMargin = document.getElementById("content").style.margin;
  document.getElementById("content").style.margin = "0";
  var b = document.getElementsByClassName("blocks")[0].children;
  for (var i=0; i<b.length; i++) {
    var fw = [];
    fw = b[i].className.split(" ");
    if (fw[0] != "timeline" && b[i].tagName != "SCRIPT") {
      b[i].style.display = "none";
    }
    if (fw[0] === "timeline") {
      //window.biStyle = b[i].style;
      //window.bichildren2Style = b[i].children[2].style;
      //window.bichildren4Style = b[i].children[4].style;
      window.cadreExtMargin = b[i].style.margin;
      b[i].style.margin = "0";
      window.cadreExtPadding = b[i].style.padding;
      b[i].style.padding = "0";
      window.cadreExtHeight = b[i].style.height;
      b[i].style.height = "100vh";
      window.cadreExtWidth = b[i].style.width;
      b[i].style.width = "100vw";
      window.tlHautHeight = b[i].children[2].style.height;
      b[i].children[2].style.height = "90vh";
      window.tlHautPos = b[i].children[2].style.position;
      b[i].children[2].style.position = "relative";
      window.tlBasTop = b[i].children[4].style.top;
      b[i].children[4].style.top = "0";
      window.tlBasHeight = b[i].children[4].style.height;
      b[i].children[4].style.height = "10vh";
      window.tlBasPos = b[i].children[4].style.position;
      b[i].children[4].style.position = "relative";
    }
  }

    if (window.divfp != null) {
      window.divfp.parentNode.removeChild(window.divfp);
    }
    window.divfp = window.tl.getDocument().createElement("div");
    //window.divfp = document.createElement("div");
    window.divfp.className = "fullPage";
    delete window.fpimg;
    window.fpimg = document.createElement('img');
    window.fpimg.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/exit-fullscreen_white.svg');
    window.divfp.appendChild(window.fpimg);
    window.fpimg.style.marginRight="0.15em";
    window.fpimg.setAttribute('onclick','disableFullPage();'); // for FF
    //window.fpimg.onclick = function() {disableFullPage();}; // for IE
    window.tl._containerDiv.appendChild(window.divfp);
    window.divfp.style.zIndex="100";
    window.divfp.style.position = "absolute";
    window.divfp.style.right = "0%";
    window.divfp.style.bottom = "0%";
    window.divfp.style.cursor = "pointer";

  if (window.tb.firstChild.children[0] != null) {
    window.divfpfiltzone = window.tl.getDocument().createElement("div");
    var divFleche = document.createElement('div');
    window.fleche = document.createElement('img');
    //window.divfpfiltzone = document.createElement("div");
    window.divfpfiltzone.id = "fullPageFiltersZone";
    window.divfpfiltzone.style.position = "absolute";
    window.divfpfiltzone.style.top = "0%";
    window.divfpfiltzone.style.zIndex="101";
    window.divfpfiltzone.style.height = "100vh";
    if (screen.height < 864) {
      window.divfpfiltzone.style.width = "26vw";
      divFleche.style.height = "5vh";
      animateLeft(window.divfpfiltzone, 0, -24);
      window.fleche.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/flecheDroite.svg');
      window.fltVisible = 0;

    }
    else {
      window.divfpfiltzone.style.width = "19vw";
      divFleche.style.height = "4vh";
      animateLeft(window.divfpfiltzone, 0, -17);
      window.fleche.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/flecheDroite.svg');
      window.fltVisible = 0;
    }
    window.divfpfilt = window.tl.getDocument().createElement("div");
    window.divfpfilt.id = "fullPageFilters";
    window.divfpfilt.style.width = "90%";
    window.divfpfilt.style.height = "100vh";
    window.divfpfilt.style.position = "absolute";
    window.divfpfilt.style.top = "0%";
    window.divfpfilt.style.left = "0%";
    window.divfpfilt.style.backgroundColor = "rgb(97, 87, 107)";
    window.divfpfilt.style.zIndex="101";
    window.divfpfilt.style.overflow = "auto";
    window.divfpfilt.appendChild(document.getElementById("filters"));
    window.divfpfilt.firstChild.style.display = "block";
    window.divfpfilt.style.color = "white";
    window.divfpfiltzone.appendChild(window.divfpfilt);
    window.tl._containerDiv.appendChild(divfpfiltzone);

    divFleche.id = "divFleche";
    divFleche.appendChild(fleche);
    divFleche.style.position = "absolute";
    divFleche.style.width = "10%";
    divFleche.style.right = "0%";
    divFleche.style.top = "47%";
    divFleche.style.zIndex = "101";
    divFleche.style.backgroundColor = "rgb(97, 87, 107)";
    /*
    divFleche.addEventListener("mouseover", function(event) {
    event.target.style.display = "block";
  });
  divFleche.addEventListener("mouseleave", function(event) {
  event.target.style.display = "none";
});
*/
window.divfpfiltzone.appendChild(divFleche);

window.fleche.setAttribute('onclick','clickfleche();'); // for FF
//window.fleche.onclick = function() {clickfleche();}; // for IE
}
}

function disableFullPage() {
  if (document.getElementById("user-bar") != null) {
    document.getElementById("user-bar").style.display = "block";
  }
  document.getElementsByTagName("header")[0].style.display = "block";
  document.getElementsByTagName("footer")[0].style.display = "block";
  document.getElementById("content").style = window.contentStyle;
  //document.getElementById("content").style.padding = window.contentPadding;
  //document.getElementById("content").style.margin = window.contentMargin;
  var b = document.getElementsByClassName("blocks")[0].children;
  for (var i=0; i<b.length; i++) {
    var fw = [];
    fw = b[i].className.split(" ");
    if (fw[0] != "timeline" && b[i].tagName != "SCRIPT") {
      b[i].style.display = "block";
    }
    if (fw[0] === "timeline") {
      //b[i].style = window.biStyle;
      //b[i].children[2].style = window.bichildren2Style;
      //b[i].children[4].style = window.bichildren4Style;
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
  document.getElementsByClassName("blocks")[0].appendChild(document.getElementById("filters"));
  recurseDomChildren(document.getElementsByClassName("blocks")[0], "", "");
  if (window.divfpfiltzone != null) {
    window.divfpfiltzone.parentNode.removeChild(window.divfpfiltzone);
  }
  addFullPageButton(window.tlid);
  if (window.tb.firstChild.children[4] != null) {
    performFilteringInputs(window.tl, [0,1], window.tb);
  }
}
