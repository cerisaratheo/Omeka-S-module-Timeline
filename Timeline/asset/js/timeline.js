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
        setupFilterHighlightControls(document.getElementById("filters"), window.tl, [0,1], Timeline.ClassicTheme.create());
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




function setupFilterHighlightControls(div, timeline, bandIndices, theme) {
    var table = document.createElement("table");
    var tr = table.insertRow(0);

    var td = tr.insertCell(0);
    td.innerHTML = "Filter:";

    td = tr.insertCell(1);
    td.innerHTML = "Highlight:";

    var handler = function(elmt, evt, target) {
        onKeyPress(timeline, bandIndices, table);
    };

    tr = table.insertRow(1);
    tr.style.verticalAlign = "top";

    td = tr.insertCell(0);

    var input = document.createElement("input");
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

    td = tr.insertCell(tr.cells.length);
    var button = document.createElement("button");
    button.innerHTML = "Clear All";
    SimileAjax.DOM.registerEvent(button, "click", function() {
        clearAll(timeline, bandIndices, table);
    });
    td.appendChild(button);

    div.appendChild(table);
}

var timerID = null;
function onKeyPress(timeline, bandIndices, table) {
    if (timerID != null) {
        window.clearTimeout(timerID);
    }
    timerID = window.setTimeout(function() {
        performFiltering(timeline, bandIndices, table);
    }, 300);
}
function cleanString(s) {
    return s.replace(/^\s+/, '').replace(/\s+$/, '');
}
function performFiltering(timeline, bandIndices, table) {
    timerID = null;

    var tr = table.rows[1];
    var text = cleanString(tr.cells[0].firstChild.value);

    var filterMatcher = null;
    if (text.length > 0) {
        var regex = new RegExp(text, "i");
        filterMatcher = function(evt) {
            return regex.test(evt.getText()) || regex.test(evt.getDescription());
        };
    }

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

    for (var i = 0; i < bandIndices.length; i++) {
        var bandIndex = bandIndices[i];
        timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(filterMatcher);
        timeline.getBand(bandIndex).getEventPainter().setHighlightMatcher(highlightMatcher);
    }
    timeline.paint();
}
function clearAll(timeline, bandIndices, table) {
    var tr = table.rows[1];
    for (var x = 0; x < tr.cells.length - 1; x++) {
        tr.cells[x].firstChild.value = "";
    }

    for (var i = 0; i < bandIndices.length; i++) {
        var bandIndex = bandIndices[i];
        timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(null);
        timeline.getBand(bandIndex).getEventPainter().setHighlightMatcher(null);
    }
    timeline.paint();
}
