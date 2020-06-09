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
		tl.loadJSON(timelineData, function(json, url) {
			// log the timelineData, and see what's there
			// figure out what's creating the timelineData json
			// console.log("json: ", json);
			// console.log("timelineData: ", timelineData);
			if (json.events.length > 0) {
				eventSource.loadJSON(json, url);



				var evts = eventSource._events._events._a;
				var evt = null;
				window.url = "";
				window.pgContent = "";
				evt = eventSource._events._events._a[i]._obj;

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



		var tb0 = document.getElementById("timeline-band-0");
		window.mousedown = 0;
		//var cX = 0;
		var cY = 0;
		var deltaY=0;

		tb0.addEventListener("mousedown", function() {
			window.mousedown = 1;
			//window.mdX = event.clientX;
			window.mdY = event.clientY;
		});

		tb0.addEventListener("mouseup", function() {
			window.mousedown = 0;
		});

		tb0.addEventListener("mousemove", function() {
			if (window.mousedown === 1) {
				//cX = event.clientX;
				cY = event.clientY;
				deltaY = cY-window.mdY;

				var bandTop = document.getElementById("timeline-band-0").style.top;
				var nouvTop = parseInt(bandTop.substring(0,bandTop.length-2)) + deltaY;
				if (nouvTop>0) return;
				document.getElementById("timeline-band-0").style.top = nouvTop+"px";

				var bandHeight = document.getElementById("timeline-band-0").clientHeight;
				var nouvHeight = bandHeight - deltaY;
				document.getElementById("timeline-band-0").style.height = nouvHeight+"px";
				window.mdY = event.clientY;
			}
		});

	}
};

function httpGet(url, hdler) {
	if (window.XMLHttpRequest) {
		xmlhttp=new XMLHttpRequest();
	}
	xmlhttp.onreadystatechange=function()
	{
		if (xmlhttp.readyState==4 && xmlhttp.status==200)
		{
			var rep = JSON.parse(xmlhttp.responseText);
			var reps = [];
			for (var i=0;i<rep.length;i++) {
				reps.push(rep[i]['o:id']);
			}
			window.pgContent = reps;
			hdler();
		}
	}
	xmlhttp.open("GET", url, false );
	xmlhttp.send();
}

function addFullPageButton(timelineId) {
	if (window.divfp != null) {
		window.divfp.parentNode.removeChild(window.divfp);
	}
	window.divfp = window.tl.getDocument().createElement("div");
	window.divfp.className = "fullPage";
	delete window.fpimg;
	window.fpimg = document.createElement('img');
	window.fpimg.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/fullscreen_white.svg');
	window.divfp.appendChild(window.fpimg);
	window.fpimg.style.marginRight="0.15em";
	window.fpimg.setAttribute('onclick','enableFullPage();'); // for FF
	window.tl._containerDiv.appendChild(window.divfp);
	window.divfp.style.zIndex="100";
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
	// la row1 contient le bouton qui active la recherche dans les metadonnees
	tr = table.insertRow(1);
	td = tr.insertCell(0);
	td.style.borderBottom = "none";
	window.metaBt = document.createElement("button");
	window.metaBt.innerHTML = "Chercher dans les metadonnées";
	td.appendChild(window.metaBt);
	window.metaBt.addEventListener("click", metaSearch);


	// la row2 contiendra le label Filter
	var tr = table.insertRow(2);
	var td = tr.insertCell(0);
	td.style.borderBottomStyle = "none";
	td.innerHTML = "Filter :";

	// la row3 contiendra le textfield pour le filtre
	tr = table.insertRow(3);
	window.tr2 = tr;
	td = tr.insertCell(0);
	td.style.borderBottomStyle = "none";
	var input = document.createElement("input");
	input.type = "text";
	input.id="filtreInput";
	SimileAjax.DOM.registerEvent(input, "keydown", handler);
	td.appendChild(input);

	// la row4 contient le label "highlight"
	tr = table.insertRow(4);
	td = tr.insertCell(0);
	window.hl = td;
	td.style.borderBottomStyle = "none";
	td.innerHTML = "Highlights:";

	// la row5 contient les N highights text field
	tr = table.insertRow(5);
	for (var i = 0; i < theme.event.highlightColors.length; i++) {
		td = tr.insertCell(i);
		td.style.borderBottomStyle = "none";

		input = document.createElement("input");
		input.type = "text";
		input.id="filtreInput";
		SimileAjax.DOM.registerEvent(input, "keydown", handler);
		td.appendChild(input);

		var divColor = document.createElement("div");
		divColor.style.height = "0.5em";
		divColor.style.background = theme.event.highlightColors[i];
		td.appendChild(divColor);
	}

	// TODO definir le setfilter xxxx
	window.regexpckb = [];
	window.regexpfilter = null;
	window.metadataIds = [];

	// cette fonction esy appelée à chaque affichage, pour chaque item
	var filterMatcher = function(evt) {
		if (window.regexpfilter==null && window.regexpckb.length==0) return true;
		if (typeof(window.metadataIds) != 'undefined' && window.metadataIds.length > 0) {
			for (var i=0; i<window.metadataIds.length; i++) {
				var regex = new RegExp(window.metadataIds[i], "i");
				if (regex.test(evt.getLink())) {
					return true;
				}
			}
		}
		else {
			for (var i=0; i<window.regexpckb.length; i++) {
				var regex = new RegExp(window.regexpckb[i], "i");
				if (regex.test(evt.getText()) || regex.test(evt.getDescription())) {
					return true;
				}
			}
			if (window.regexpfilter==null) return false;
			else {
				var regex = new RegExp(window.regexpfilter, "i");
				return regex.test(evt.getText()) || regex.test(evt.getDescription());
			}
		}
	}

	var highlightMatcher = function(evt) {
		if (window.metakeywords!=null && window.metakeywords.length>0) {
			// cas ou on fait une recherche en metadata
			for (var i=0; i<window.metakeywords.length; i++) {
				var regex = window.metakeywords[i];
				if (regex.test(evt.getLink())) return i;
			}
		} else {
			// cas ou on fait une recherche sans metadata
			if (window.regexes != null && typeof(window.regexes) != 'undefined') {
				for (var i=0; i<window.regexes.length; i++) {
					var regex = new RegExp(window.regexes[i], "i");
					if (regex.test(evt.getText()) || regex.test(evt.getDescription())) {
						return i;
					}
				}
			}
		}
	}

	for (var i = 0; i < bandIndices.length; i++) {
		var bandIndex = bandIndices[i];
		timeline.getBand(bandIndex).getEventPainter().setFilterMatcher(filterMatcher);
		timeline.getBand(bandIndex).getEventPainter().setHighlightMatcher(highlightMatcher);
	}
	timeline.paint();

}

function addBtTmpCkb(text) {
	if (window.params.UserCheckbox === "0") {
		var tr = window.tb.rows[3];
		var td = tr.insertCell(1);
		td.style.borderBottomStyle = "none";
		var bt = document.createElement("button");
		bt.innerHTML = "ajouter un filtre temporaire";
		td.appendChild(bt);
		SimileAjax.DOM.registerEvent(bt, "click", function() {

			tr = window.tbflt.insertRow(0);
			td = tr.insertCell(0);

			var ckb = document.createElement("input");
			var ckbid = "ckb"+window.id;
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
	if (window.tb.rows[3].cells[1] != null) {
		window.tb.rows[3].deleteCell(1);
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

// cette methode est appelée à chaque char entré dans les filterfields
function performFilteringInputs(timeline, bandIndices, table) {
	timerID = null;

	// a chaque touche pressée, on supprime le résultats des recherches metadatas
	window.metakeywords=[];
	window.metadataIds=[];

	var tr = table.rows[3];
	var text = cleanString(tr.cells[0].firstChild.value);

	if (text != null && text != "" && text != " ") {
		// Affiche un bouton pour ajouter le filtre aux checkbox
		removeBtTmpCkb();
		addBtTmpCkb(text);
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

	// highlights appeles apres chaque char
	tr = table.rows[5];
	window.regexes = [];
	for (var x = 0; x < tr.cells.length; x++) {
		var input = tr.cells[x].firstChild;
		var text2 = cleanString(input.value);
		console.log(text2);
		if (text2.length > 0) {
			window.regexes.push(text2);
		} else {
			window.regexes.push(null);
		}
	}
	timeline.paint();
}

function clearAllInputs(timeline, bandIndices, table) {
	window.regexpfilter = null;
	window.regexes = null;
	window.metakeywords = [];
	table.rows[3].cells[0].firstChild.value = "";
	var tr = table.rows[5];
	for (var x = 0; x < tr.cells.length; x++) {
		tr.cells[x].firstChild.value = "";
	}
	timeline.paint();
}



//
//
// FILTRAGE DES CHECKBOXES
//
//

function metaSearch() {
	callAPIsearch();
	searchInMetadata();
	window.tl.paint();
}


function onCheck(timeline, bandIndices, table) {
	performFilteringCkb(timeline, bandIndices, table);
}

function searchInMetadata() {
	var keywords2search = [];
	for (var i=0; i<window.regexpckb.length; i++) {
		keywords2search.push(window.regexpckb[i]);
	}
	if (window.regexpfilter!=null) {
		keywords2search.push(window.regexpfilter);
	}
	window.metadataIds = [];
	for (var i=0;i<keywords2search.length;i++) {
		if (keywords2search[i].length>0) {
			window.url = "http://"+window.params.domainName+"/omeka-s/api/items?per_page=100000000000000&fulltext_search=%22"+keywords2search[i]+"%22";
			httpGet(window.url, function() {
				if (window.pgContent != null) {
					for (var j = 0; j<window.pgContent.length; j++) {
						window.metadataIds.push(window.pgContent[j]);
					}
				}
			});
		}
	}
}

// click sur bouton "metadata search"
function callAPIsearch() {
	window.metakeywords=[];
	recursSearch(0);
	window.tl.paint();
}

function recursSearch(z) {
	if (z>3) return;
	if (typeof(window.regexes) != 'undefined' && window.regexes != null && window.regexes[z] != null && window.regexes[z].length>0) {
		var url = "http://"+window.params.domainName+"/omeka-s/api/items?per_page=100000000000000&fulltext_search=%22"+window.regexes[z]+"%22";
		httpGet(url, function() {
			if (window.pgContent != null) {
				var rst=window.pgContent[0];
				for (var j = 1; j<window.pgContent.length; j++) {
					rst = rst + "|" +window.pgContent[j];
				}
			}
			if (typeof(rst)=='undefined' || rst.length==0) window.metakeywords.push(new RegExp("hfdjkeyvfiulegvbhrzvr","i"));
			else {
				var regex = new RegExp(rst, "i");
				window.metakeywords.push(regex);
			}
			recursSearch(z+1);
		});
	}
	else {
		window.metakeywords.push(new RegExp("hfdjkeyvfiulegvbhrzvr","i"));
		recursSearch(z+1);
	}
}

function performFilteringCkb(timeline, bandIndices, table) {
	window.metakeywords=[];
	window.metadataIds=[];
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
	timeline.paint();
}

function clearAllCkb(timeline, bandIndices, table, createfilt) {
	for (var i=0; i<table.rows.length; i++) {
		var tr = table.rows[i];
		tr.cells[0].firstChild.checked=false;
	}
	window.regexpckb = [];
	timeline.paint();
}



//
//
// TIMELINE FULL PAGE MODE
//
//

function clickfleche() {
	if (window.fltVisible===1) {
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
	document.getElementById("content").style.padding = "0";
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
			b[i].children[2].style.height = "90vh";
			b[i].children[2].style.top = 0+"px";
			window.tlBasTop = b[i].children[4].style.top;
			b[i].children[4].style.top = "0";
			window.tlBasHeight = b[i].children[4].style.height;
			b[i].children[4].style.height = "10vh";
			b[i].children[4].style.top = b[i].children[2].clientHeight+"px";
		}
	}

	if (window.divfp != null) {
		window.divfp.parentNode.removeChild(window.divfp);
	}
	window.divfp = window.tl.getDocument().createElement("div");
	window.divfp.className = "fullPage";
	delete window.fpimg;
	window.fpimg = document.createElement('img');
	window.fpimg.setAttribute('src', '/omeka-s/modules/Timeline/asset/img/exit-fullscreen_white.svg');
	window.divfp.appendChild(window.fpimg);
	window.fpimg.style.marginRight="0.15em";
	window.fpimg.setAttribute('onclick','disableFullPage();');
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
		window.divfpfiltzone.appendChild(divFleche);

		window.fleche.setAttribute('onclick','clickfleche();'); // for FF
	}
}

function disableFullPage() {
	if (document.getElementById("user-bar") != null) {
		document.getElementById("user-bar").style.display = "block";
	}
	document.getElementsByTagName("header")[0].style.display = "block";
	document.getElementsByTagName("footer")[0].style.display = "block";
	document.getElementById("content").style = window.contentStyle;
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
			b[i].children[4].style.top = window.tlBasTop;
			b[i].children[4].style.height = window.tlBasHeight;
		}
	}
	document.getElementsByClassName("blocks")[0].appendChild(document.getElementById("filters"));
	recurseDomChildren(document.getElementsByClassName("blocks")[0], "", "");
	if (window.divfpfiltzone != null) {
		window.divfpfiltzone.parentNode.removeChild(window.divfpfiltzone);
	}
	addFullPageButton(window.tlid);
	if (window.tb.firstChild.children[5] != null) {
		//performFilteringInputs(window.tl, [0,1], window.tb);
		metaSearch();
	}
}
