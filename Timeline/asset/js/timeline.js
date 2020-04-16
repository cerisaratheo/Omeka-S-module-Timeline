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
    tl.loadJSON(timelineData, function(json, url) {
      // log the timelineData, and see what's there
      // figure out what's creating the timelineData json
      // console.log("json: ", json);
      // console.log("timelineData: ", timelineData);
      if (json.events.length > 0) {
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
  }
};

function test1() {
  var tl = window.tl;
  var parsedDate = Timeline.DateTime.parseGregorianDateTime("1880-01-01");
  tl.getBand(0).setCenterVisibleDate(parsedDate);
};







//
//
// FONCTIONS IMPORTÉES DU MODULE SIMILE
//
//




function setupFilterHighlightControls(timeline, bandIndices, theme, params) {
  var tablelabels = document.createElement("table");
  var tableflt = document.createElement("table");
  var divlabels = document.getElementById("fltLabelsButton");
  var divflt = document.getElementById("ckbfilters");
  var tr = tablelabels.insertRow(0);

  var td = tr.insertCell(0);
  td.style.borderBottomStyle = "none";
  td.innerHTML = "Filters :";
  /*
  td = tr.insertCell(1);
  td.innerHTML = "Highlight:";
  */
  var handler = function(elmt, evt, target) {
    onKeyPress(timeline, bandIndices, tableflt);
    /*
    else {
    clearAll(timeline, bandIndices, table);
  }
  */
};

var words = params.filters.split(';');
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
    SimileAjax.DOM.registerEvent(ckb, "change", handler);
    td.style.borderBottomStyle = "none";
  }
}

/*
tr = table.insertRow(1);
//tr.style.verticalAlign = "top";

td = tr.insertCell(0);
var ckb = document.createElement("input");
ckb.setAttribute("type", "checkbox");
ckb.setAttribute("id", "ckb");
td.appendChild(ckb);

td = tr.insertCell(1);
var input = document.createElement("label");
input.setAttribute("for", "ckb");
var t = document.createTextNode("thèses");
input.appendChild(t);
td.appendChild(input);
SimileAjax.DOM.registerEvent(ckb, "change", handler);

tr = table.insertRow(2);
//tr.style.verticalAlign = "top";

td = tr.insertCell(0);

var ckb1 = document.createElement("input");
ckb1.setAttribute("type", "checkbox");
ckb1.setAttribute("id", "ckb1");
td.appendChild(ckb1);

td = tr.insertCell(1);
var input1 = document.createElement("label");
input1.setAttribute("for", "ckb1");
var t1 = document.createTextNode("école");
input1.appendChild(t1);
td.appendChild(input1);
SimileAjax.DOM.registerEvent(ckb1, "change", handler);
*/
/*
input.type = "text";
SimileAjax.DOM.registerEvent(input, "keypress", handler);
td.appendChild(input);

for (var i = 0; i < theme.event.highlightColors.length; i++) {
td = tr.insertCell(i + 1);

input = document.createElement("input");
input.type = "text";
SimileAjax.DOM.registerEvent(input, "keypress", handler);
td.appendChild(input);

var divColor = document.createElement("div");
divColor.style.height = "0.5em";
divColor.style.background = theme.event.highlightColors[i];
td.appendChild(divColor);
}
*/

tr = tablelabels.insertRow(1);

td = tr.insertCell(tr.cells.length);
td.style.borderBottomStyle = "none";
var button = document.createElement("button");
button.innerHTML = "Clear All";
SimileAjax.DOM.registerEvent(button, "click", function() {
  clearAll(timeline, bandIndices, tableflt);
});
td.appendChild(button);

divlabels.appendChild(tablelabels);
divflt.appendChild(tableflt);
}

function onKeyPress(timeline, bandIndices, table) {
  performFiltering(timeline, bandIndices, table);
}
function cleanString(s) {
  return s.replace(/^\s+/, '').replace(/\s+$/, '');
}
function performFiltering(timeline, bandIndices, table) {
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
    clearAll(timeline, bandIndices, table);
    return;
  }
  var filterMatcher = function(evt) {
    for (var i=0; i<list.length; i++) {
      var regex = new RegExp(list[i], "i");
      if (regex.test(evt.getText()) || regex.test(evt.getDescription())) {
        return true;
      }
    }
    return false;
  };
  /*
  var regexes = [];
  var hasHighlights = false;
  for (var x = 1; x < tr.cells.length - 1; x++) {
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
*/
for (var i = 0; i < bandIndices.length; i++) {
  var bandIndex = bandIndices[i];
  timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(filterMatcher);
  // timeline.getBand(bandIndex).getEventPainter().setHighlightMatcher(highlightMatcher);
}
timeline.paint();
}
function clearAll(timeline, bandIndices, table) {
  for (var i=0; i<table.rows.length; i++) {
    var tr = table.rows[i];
    tr.cells[0].firstChild.checked=false;
  }
  for (var i = 0; i < bandIndices.length; i++) {
    var bandIndex = bandIndices[i];
    timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(null);
    timeline.getBand(bandIndex).getEventPainter().setHighlightMatcher(null);
  }
  timeline.paint();
}
