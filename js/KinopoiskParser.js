console.info("KinopoiskParser.js loaded");

function KinopoiskParserException(message, code) {
  this.message = message;
  this.code = code;
}

function KinopoiskParser() {
	var movieId = arguments[0];
	if(!movieId) {
		return;
	}
	
	var options = {};
	var callback = null;
	var callbackFail = null;
	if (arguments.length > 1 ) {
		if (typeof(arguments[1]) == 'function') {
			callback = arguments[1];
			if (typeof(arguments[2]) == 'function') {
				callbackFail = arguments[2];
			}
		} else {
			options = arguments[1];
		}
		if (arguments.length > 3) {
			options = arguments[1];
			callback = arguments[2];
			if (typeof(arguments[3]) == 'function') {
				callbackFail = arguments[3];
			}
		}
	}
	this.movieId = movieId;
	this.urlMobile = Properties.get("kinopoisk.mobile.movie.url", this.movieId);
	this.url = Properties.get("kinopoisk.movie.url", this.movieId);
	//this.urlMobile = "http://m.kinopoisk.ru/movie/" + this.movieId + "/";
//this.urlMobile = "http://localhost/rkp2/test/movie/" + this.movieId + ".html";
	//this.url = "http://www.kinopoisk.ru/film/" + this.movieId + "/";
	
	this.rating = {};
	this.details = {};
	
	if (callback && typeof(callback) == 'function') {
		this.onComplete = callback;
	}
	if (callbackFail && typeof(callbackFail) == 'function') {
		this.onFail = callbackFail;
	}
	
	var instance = this;
	(function() {
		instance.retrievePageDocument();
	})();
};

KinopoiskParser.getRating = function (movieId, onComplete){
	var kp = new KinopoiskParser();
	kp.getRating(movieId, onComplete);
};

KinopoiskParser.prototype = {
	debugMode: false,
	movieId: null,
	urlMobile: null,
	title: null,
	originalTitle: null,
	year: null,
	duration: null,
	genres: null,
	countries: null,
	description: null,
	rating: {},
	
	details: {
		director: null,
		cast: null,
		rating: null,
		ratingImdb: null,
		ratingCritic: null,
		ratingReviw: null
	},
	
	onComplete: null,
	onFail: null,
	
	retrievePageDocument: function() {
		var instance = this;
		
		//console.log("movieId: %o, href: %o", instance.movieId, href);
		
		// TODO: add success and fail methods
		$.get(this.urlMobile, function( data ,status,xhr) {
			// TODO: check if movie does not exist
			
			try {
				//console.log("page %o retrieved", href);
				instance.page = $($.parseHTML(data));
				//instance.setDivLoaderHtml(instance.movieId + " page loaded");
				instance.parsePageDocument();
				instance.getRating();
			} catch (e) {
				instance.fail(e);
			}
		});
	},

	/**
	 * TODO: do it like in php
	 */
	parsePageDocument: function() {
		var instance = this;
		
		var titleElement = instance.page.find("#content p.title b");
		if (titleElement.length == 0) {
			throw new KinopoiskParserException("Can not parse page: " + instance.urlMobile, 1);
		}
		
		this.title = titleElement.text();
		
		var enInfo = this.page.find("#content p.title span").text();
		var matches = enInfo.match(/((.*), ){0,1}([\d]{4}), ([^,]*)$/);
		if (matches) {
			// m = new KinopoiskParser(622652)
			// ["2012, 50 ???.", undefined, undefined, "2012", "50 ???."]
			
			// m = new KinopoiskParser(63912)
			// ["Il bisbetico domato, 1980, 104 ???.", "Il bisbetico domato, ", "Il bisbetico domato", "1980", "104 ???."]
			this.originalTitle = matches[2];
			this.year = matches[3];
			this.duration = matches[4];
		}
		
		var ps = this.page.find('#content div[class="block film"] span');
		var details = [];
		ps.each(function(index){
			var p = $(this).html();
			var rows = instance.parseDetails(p);
			if (rows.length > 0) {
				details = details.concat(rows);
			}
		});
		
		// жанр
		var genres = details.shift();
		this.genres = this.parseDetailsList(genres);
		
		// страны
		var countries = details.shift();
		this.countries = this.parseDetailsList(countries);
		
		// other details
		var detailsMap = {};
		$.each(details, function(index, value){
			try{
				var pairs = value.split(/:/ig);
				var key = pairs[0];
				var val = pairs[1].trim();
				detailsMap[key] = val;
			} catch(e) {}
		});
		
		var detailsKeyMap = {
			"режиссер": "director",
			"в ролях": "cast",
			"рейтинг фильма": "rating",
			"рейтинг IMDB": "ratingImdb",
			"рейтинг кинокритиков": "ratingCritic",
			"рейтинг положительных рецензий": "ratingReviw"
		};
		for(var key in detailsMap) {
			var keyEn = detailsKeyMap[key];
			this.details[keyEn] = detailsMap[key];
		}
		
		//
		
		// премьера
		/*
		try {
			var t = this.page.find('#content div[class="block film"] p')[0].textContent;
			var premiere = this.parseDetailsArray(t);
			console.log("premiere: %o", premiere);
		} catch (e) {
			console.error(e);
		}
		*/
		
		// description
		try {
			this.description = this.page.find('#content div[class="block film"] p.descr')[0].textContent;
		} catch (e) {
			console.error("description not found");
		}
	},
	
	parseDetailsList: function(str, delimiter) {
		if (!delimiter) {
			delimiter = ",";
		}
		var list = [];
		var elements = str.split(delimiter);
		elements = this.array_map(this.nbspReplace, elements);
		elements = this.array_map(function(a) {return a.trim();}, elements);
		list = this.arrayUnique(list.concat(elements));
		return list;
	},
	parseDetails: function(str) {
		var rows = str.split(/<br \/>|<br\/>|<br>/i);
		rows = this.array_map(this.nbspReplace, rows);
		rows = this.array_map(function(a) {return $("<q>"+a+"</q>").text();}, rows);
		rows = this.array_map(function(a) {return a.trim();}, rows);
		rows = $.grep(rows,function(n){ return (n!="") });
		var array = {};
		if (rows.length > 0) {
			for (var i in rows) {
				var row = rows[i];
				//console.log("* row: %o", row );
			}
		}
		return rows;
	},
	
	getRating: function () {
		var instance = this;
		
		if (arguments.length > 0 ) {
			this.movieId = arguments[0];
			if (typeof(arguments[1]) == 'function') {
				this.onComplete = arguments[1];
			}
		}
		
		if (!this.movieId) {
			this.fail();
		}
		
		console.log("get kinopoisk rating for movie " + this.movieId);
		
		//var kpRatingUrl = "http://rating.kinopoisk.ru/" + this.movieId + ".xml";
		var kpRatingUrl = Properties.get("kinopoisk.rating.url", this.movieId);
		$.get(kpRatingUrl, function( data ) {
			try {
				console.log("retrieved kinopoisk rating for movie " + instance.movieId);
				
				//instance.kpRating = data.getElementsByTagName("kp_rating")[0].textContent;
				//instance.imdbRating = data.getElementsByTagName("imdb_rating")[0].textContent;
				var xml = $(data);
				
				var kpRating = $(xml.find("kp_rating")[0]);
				var imdbRating = $(xml.find("imdb_rating")[0]);
				
				instance.rating = {};
				instance.rating.kpRatingValue = parseFloat(kpRating.text());
				instance.rating.imdbRatingValue = parseFloat(imdbRating.text());
				
				instance.rating.kpRatingCount = parseInt(kpRating.attr("num_vote"));
				instance.rating.imdbRatingCount = parseInt(imdbRating.attr("num_vote"));
				
			} catch (e) {}
			
			instance.complete();
		});
	},
	
	complete: function() {
		delete(this.page);
		this.printMovieInfo();
			
		if (this.onComplete) {
			var onComplete = this.onComplete;
			delete(this.onComplete);
			onComplete.apply(this);
		}
	},
	
	fail: function(e) {
		delete(this.page);
		if (this.onFail) {
			var onFail = this.onFail;
			delete(this.onFail);
			onFail.apply(this, [e]);
		}
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
		var rutorLoader = $("div.kp-loader.loader-" + this.movieId + "");
		if (rutorLoader.length == 0) {
			loader.append("<div class='kp-loader loader-" + this.movieId + "'></div>");
			rutorLoader = $("div.kp-loader.loader-" + this.movieId + "");
		}
		
		return rutorLoader;
	},
	printMovieInfo: function() {
		if (!this.debugMode) {
			return;
		}
		/*
		var html = "<b>movieId</b>: " + this.movieId + "<br />"
				+ "<b>urlMobile</b>: <a href='" + this.urlMobile + "'>" + this.urlMobile + "</a><br />"
				+ "<b>title</b>: " + this.title + "<br />"
				+ "<b>originalTitle</b>: " + this.originalTitle + "<br />"
				+ "<b>year</b>: " + this.year + "<br />"
				+ "<b>duration</b>: " + this.duration + "<br />"
				+ "<b>genres</b>: " + this.genres + "<br />"
				+ "<b>countries</b>: " + this.countries + "<br />"
				+ "<b>description</b>: " + this.description + "<br />"
				+ "<b></b>: " + "<br />"
				+ "";
		*/
		var jsonDetailsPretty = JSON.stringify(this, null, '\t');
		html = "<pre>KinopoiskParser: " + jsonDetailsPretty + "</pre>";
		
		this.setDivLoaderHtml(html);
	}, 
	
	
	array_map: function( callback ) {	// Applies the callback to the elements of the given arrays
		// 
		// +   original by: Andrea Giammarchi (http://webreflection.blogspot.com)
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)


		var argc = arguments.length, argv = arguments;
		var j = argv[1].length, i = 0, k = 1, m = 0;
		var tmp = [], tmp_ar = [];

		while (i < j) {
			while (k < argc){
				tmp[m++] = argv[k++][i];
			}

			m = 0;
			k = 1;

			if( callback ){
				tmp_ar[i++] = callback.apply(null, tmp);
			} else{
				tmp_ar[i++] = tmp;
			}

			tmp = [];
		}

		return tmp_ar;
	},

	nbspReplace: function(string, replacement) {
		if (!replacement) {
			replacement = "";
		}
		return string.replace(/&nbsp;/i, replacement);
	},
	
	arrayUnique: function(array) {
		var a = array.concat();
		for(var i=0; i<a.length; ++i) {
			for(var j=i+1; j<a.length; ++j) {
				if(a[i] === a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	}
	
	/*
	toJSON: function() {
		return {
			movieId: this.movieId,
			urlMobile: this.urlMobile,
			title: this.title,
			originalTitle: this.originalTitle,
			year: this.year,
			duration: this.duration,
			genres: this.genres,
			countries: this.countries,
			rating: this.rating
		};
	}
	*/
}
