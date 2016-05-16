console.info("RutorParser.js loaded");

/**
Usage: 
	var currentTorrentId = window.location.href.match(/torrent\/(\d+)/)[1];
	var currentTorrentDocument = $("html");	
	var isTorrentPage = (window.location.href.match(/torrent\/(\d+)/) != null);
	
	var rutorPage = new RutorParser(
		currentTorrentId,
		{
			torrentDocument: currentTorrentDocument,
			isTorrentPage: isTorrentPage
		},
		function () {
			console.log("parse torrent complete: %o", this);
		}
	);
*/

function BannerNotFoundException(message) {
  this.message = message;
}

function RutorParser() {
	var torrentId = arguments[0];
	if(!torrentId) {
		return;
	}
	
	var options = {};
	var callback = null;
	if (arguments.length > 1 ) {
		if (typeof(arguments[1]) == 'function') {
			callback = arguments[1];
		} else {
			options = arguments[1];
		}
		if (arguments.length > 2) {
			options = arguments[1];
			callback = arguments[2];
		}
	}
	
	if (callback && typeof(callback) == 'function') {
		this.onComplete = callback;
	}
	
	
	this.torrentId = parseInt(torrentId);
	//this.isTorrentPage = (window.location.href.match(/torrent\/(\d+)/) != null);
	this.isTorrentPage = options.isTorrentPage;
	this.details = {};
	/*
	if (this.isTorrentPage == undefined) {
		//this.isTorrentPage = (window.location.href.match(/torrent\/(\d+)/) != null);
	}
	*/
	
	
	if (options.torrentDocument !== undefined) {
		this.torrentDocument = options.torrentDocument;
		console.log("torrentDocument is predefined!");
		
		// parse page
		this.parseTorrent();
	} else {
		//this.setDivLoaderHtml(this.torrentId + " loading...");
		// retrieve then parse
		this.retrievePageDocument();
	}
};
RutorParser.categories = {
		"kino"					: 1,	// Зарубежные фильмы		
		"nashe_kino"			: 5,	// Наши фильмы				
		"nauchno_popularnoe"	: 12,	// Научно-популярные фильмы	
		"seriali"				: 4,	// Сериалы					
		"tv"					: 6,	// Телевизор				
		"multiki"				: 7,	// Мультипликация			
		"anime"					: 10	// Аниме					
	};
RutorParser.prototype = {
	debugMode: false,
	
	isTorrentPage: false,
	torrentDocument: null,
	
	torrentId: null,
	torrentName: null,
	torrentNameData: null,
	
	hash: null,
	
	kpId: null,
	kpBannerUrl: null,
	imdbMovieId: null,
	
	details: {
		releaser: null,
		categoryRu: null,
		categoryLink: null,
		categoryId: null,
		createDateText: null,
		createDate: null,
		fileSize: null,
	},
	
	error: null,
	
	retrievePageDocument: function() {
		var instance = this;
		
		
		//(function(rId) {
			//var torrentId = rId;
			//var href = "http://rutor.org/torrent/" + instance.torrentId;
			var href = Properties.get("rutor.torrent.url", instance.torrentId);
			console.log("retrieve torrent page: torrentId=%o, href: %o", instance.torrentId, href);
			
			$.get(href, function( data ) {
				console.log("page %o retrieved", href);
				//instance.torrentDocument = $(data);
				instance.torrentDocument = $($.parseHTML(data));
				//console.log("torrentDocument: %o", torrentDocument);
				//instance.setDivLoaderHtml(instance.torrentId + " page loaded");
				/*if (instance.onPageLoaded) {
					instance.onPageLoaded.apply(instance);
				}*/
				instance.parseTorrent();
			});
		//})(instance.torrentId);
	},

	parseTorrent: function() {
		var instance = this;
		console.log("parse torrent page %o", instance.torrentId);
		
		try {
			this.hash = this.getHash();
			
			this.kpId = this.getKpMovieId();
			//this.kpBannerUrl = this.torrentDocument.find('img[src*="kinopoisk.ru/rating/"][src$=".gif"]').attr("src");
			
			this.imdbMovieId = this.getImdbMovieId();
			
			if (this.isTorrentPage) {
				// TODO: check this
				this.torrentName = this.torrentDocument.find('#all h1').text();
			} else {
				this.torrentName = this.torrentDocument.filter('#all').find('h1').text();
			}
			
			this.torrentNameData = new RutorNameInfo(this.torrentName);
			console.warn("torrent name data: %o", this.torrentNameData);
			
			this.transformDetails();
		} catch(e) {
			console.error(e);
			this.error = e;
		}
		this.complete();
	},

	complete: function() {
		delete(this.torrentDocument);
		this.printTorrentInfo();
		
		if (this.onComplete) {
			var instance = this;
			setTimeout(function(instance){
				instance.onComplete.apply(instance);
			}(instance), 1);
			delete(this.onComplete);
		}
	},
	
	getHash: function() {
		try {
			var magnet = this.torrentDocument.find('#download').find('a[href^="magnet:"]').attr("href");
			var hash = magnet.match(/urn:btih:([^&]+)/i)[1];
			return hash;
		} catch(e) {
			return null;
		}
	},

	getKpMovieId: function() {
		var kpLink1 = this.torrentDocument.find("a[href*='kinopoisk.ru/film']");
		if (kpLink1.find("img").length == 0) {
			kpLink1 = [];
		}
		var kpLink2 = this.torrentDocument.find("a[href*='kinopoisk.ru/level/1/film']");
		if (kpLink2.find("img").length == 0) {
			kpLink2 = [];
		}
		var kpLink3 = this.torrentDocument.find("img[src*='kinopoisk.ru/rating/']");
		
		// torrent 286895
		try {
			var kpId = 0;
			if (kpLink1.length > 0) {
				kpId = kpLink1.attr('href').match(/film\/(\d+)/)[1];
			} else if (kpLink2.length > 0) {
				//this.kpId = kpLink2.attr('href').match(/film\/(\d+)/)[1];
				kpId = kpLink2.attr('href').match(/film(\/){1,}(\d+)/)[2];
			} else if (kpLink3.length > 0) {
				kpId = kpLink3.attr('src').match(/rating\/(\d+)/)[1];
			} else {
				throw new BannerNotFoundException("kinopoisk banner not found");
			}
			kpId = parseInt(kpId);
			if (isNaN(kpId) || kpId == 0) {
				throw new BannerNotFoundException("kinopoisk banner not found");
			}
			return kpId;
		} catch(e) {
			if (e instanceof BannerNotFoundException) {
				console.warn(e.message);
			} else {
				console.error("kinopoisk banner retrive error: %o", e.message);
			}
			return null;
		}
	},

	getImdbMovieId: function() {
		try {
			var imdbLink = this.torrentDocument.find("a[href*='imdb.com/title']");
			if (imdbLink.length > 0){
				return imdbLink.attr('href').match(/title\/(tt\d+)/)[1];
			}
			throw new BannerNotFoundException("imdb banner not found");
		} catch(e) {
			if (e instanceof BannerNotFoundException) {
				console.warn(e.message);
			} else {
				console.error("imdb banner retrive error: %o", e.message);
			}
			return null;
		}
	},

	transformDetails: function() {
		var detailsTd = this.torrentDocument.find('#details tr td.header');
		var detailsDom = {};
		$.each(detailsTd, function(i,item){
			//var r = item.parent.find("td",1);
			var td = $(item.parentNode).find("td").get(1)
			var key = item.textContent.trim();
			var val = td.textContent.trim();
			// console.log("%o: %o", key, val);
			detailsDom[key] = $(td);
		});
		
		// uploader
		try {
			var valTd = detailsDom["Залил"];
			if (valTd) {
				this.details["releaser"] = valTd.text();
				//this.details["releaserLink"] = valTd.find("a",0).href;
				this.details["releaserLink"] = valTd.find("a", 0).attr('href');
			}
		} catch (e) {}
		
		// category

		try {
			var valTd = detailsDom["Категория"];
			if (valTd) {
				this.details["categoryRu"] = valTd.text().trim();
				this.details["categoryLink"] = valTd.find("a", 0).attr('href').substr(1);
				this.details["categoryId"] = RutorParser.categories[this.details["categoryLink"]];
			}
		} catch (e) {}
		
		// create date

		try {
			var valTd = detailsDom["Добавлен"];
			if (valTd) {
				var createDate = valTd.text();
				this.details["createDateText"] = createDate.trim();
				createDate = createDate.match(/(.*)\(.*\)/)[1].trim();
				
				var m = createDate.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
				var year = m[3];
				var month = parseInt(m[2]) - 1;
				var day = m[1];
				var hours = m[4];
				var minutes = m[5];
				var seconds = m[6];
				var date = new Date(year, month, day, hours, minutes, seconds, 0);
				this.details["createDate"] = date;
			}
		} catch (e) {}
		
		// torrent size
		
		try {
			var valTd = detailsDom["Размер"];
			if (valTd) {
				var fileSize = valTd.text();
					this.details["fileSize"] = fileSize.match(/.*\((\d+) Bytes\)/)[1];
			}
		} catch (e) {}
	},

	removeDivLoader: function() {
		var rutorLoader = this.getDivLoader();
		rutorLoader.remove();
	},
	setDivLoaderHtml: function(html) {
		var rutorLoader = this.getDivLoader();
		rutorLoader.html(html);
	},
	getDivLoader: function() {
		var loader = $("div.loader");
		if (loader.length == 0) {
			$("body").append("<div class='loader-wrapper'><div class='loader'></div></div>");
			loader = $("div.loader");
			$( "div.loader-wrapper" ).resizable({
				//handles: "s, w"
			});
		}
		loader.append("<div class='rutor-loader loader-" + this.torrentId + "'></div>");
		
		var rutorLoader = $("div.rutor-loader.loader-" + this.torrentId + "");
		return rutorLoader;
	},
	printTorrentInfo: function() {
		if (!this.debugMode) {
			return;
		}
		var html = "<b>torrentId</b>: " + this.torrentId + "<br />"
				+ "<b>torrentName</b>: " + this.torrentName + "<br />"
				+ ((this.kpId) ? "<b>kpId</b>: <a href='http://www.kinopoisk.ru/film/" + this.kpId + "/' target='_blank'>" + this.kpId + "</a><br />" : "")
				+ "<b>kpBannerUrl</b>: " + this.kpBannerUrl + "<br />"
				+ "<b>isTorrentPage</b>: " + this.isTorrentPage + "<br />"
				+ ((this.imdbMovieId) ? "<b>imdbMovieId</b>: <a href='http://www.imdb.com/title/" + this.imdbMovieId + "/' target='_blank'>" + this.imdbMovieId + "</a><br />" : "")
				+ "";
		
		var jsonDetailsPretty = JSON.stringify(this.details, null, '\t');
		html += "<pre>details: " + jsonDetailsPretty + "</pre>";
		
		var jsonTorrentNameDataPretty = JSON.stringify(this.torrentNameData, null, '\t');
		html += "<pre>torrentNameData: " + jsonTorrentNameDataPretty + "</pre>";
		
		var jsonTorrentDataPretty = JSON.stringify(this, null, '\t');
		html = "<pre>RutorParser: " + jsonTorrentDataPretty + "</pre>";
		
		this.setDivLoaderHtml(html);
	}
}
