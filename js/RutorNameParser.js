function RutorNameParserException(message) {
  this.message = message;
}

	var RutorNameInfo = function(name){
		this.parse(name);
	};
	RutorNameInfo.prototype = {
		rutorName: null,
		rusName: null,
		originalName: null,
		releaser: null,
		properties: [],
		translates: [],
		year: null,
		quality: null,
		episodes: null,
		isSerie: false,
		
		parse: function(name) {
			this.rutorName = name;
			
			// parse parameters
			
			name = name.replace(" l ", " | "); // hook contra estupidos
			
			var parameters = name.split("|");
			var parameters2 = [];
			name = parameters.shift().trim();
			for(var j in parameters) {
				var parameter = parameters[j].trim();
				if (parameter == "") {
					continue;
				}
				parameter = parameter.replace(/\+/ig, ",");
				if (parameter.indexOf(",")) {
					parameter = parameter.replace(/[\s]*,[\s]*/ig, ",");
					parameters2 = parameters2.concat(parameter.split(","));
				} else {
					parameters2.push(parameter);
				}
			}
			parameters = parameters2;
			
			// split translates and other parameters
			
			var translates = [];
			var params = [];
			for(var j in parameters) {
				var t = parameters[j];
				if (TRANSLATE_TYPE.hasOwnProperty(t)) {
					translates.push(t);
				} else {
					params.push(t);
				}
			}
			this.properties = params;
			this.translates = translates;
			
			// parse name, year
			
			var matches = name.match(/(((.*) \/ (.*))|(.*)) \((\d+(\s*[\|\,\-]\s*\d+){0,})\)/);
			if (!matches) {
				throw new RutorNameParserException("Can not parse name: " + name);
			}
			this.nameSuffix = name.replace(matches[0], "").trim();
			this.fullName = matches[1];
			this.rusName = matches[3];
			this.originalName = matches[4];
			this.year = matches[6];
			
			this.year = this.year.replace(/[\s]*([\-\,\/\|])[\s]*/ig, "$1");
			
			if (this.fullName.indexOf(" / ") > 0) {

			} else {
				this.originalName = matches[5]; 
			}
			
			// parse releaser, quality
			
			var checkReleasePattern = /(.*) (от|by) (.*)/ig;
			var checkRelease = checkReleasePattern.exec(this.nameSuffix);
			if (checkRelease) {
				this.nameSuffix = checkRelease[1];
				
				this.releaser = checkRelease[3];
			}
			
			this.quality = this.nameSuffix.trim();
			
			if (this.rusName != null && this.originalName == "") {
				this.originalName = this.rusName;
				this.rusName = null;
			}
			
			// parse episodes
			
			this.isSerie = false;
			var checkEpisodesPattern = /\[(.*\d+.*)\]/i;
			//checkEpisodesPattern.compile();
			var res = checkEpisodesPattern.exec(this.originalName);
			//checkEpisodesPattern = /\[(.*\d+.*)\]/ig;
			if ((this.rusName == null || !checkEpisodesPattern.test(this.rusName)) && checkEpisodesPattern.test(this.originalName)) {
				this.episodes = res[1];
				this.isSerie = true;
			}
		},
		
		log: function() {
			// debug output
			
			console.log("");
			console.log("%o", this.rutorName);
			
			if (this.episodes) {
				console.warn("serie: %o", this);
			} else {
				console.log("cine: %o", this);
			}
			if (this.properties.length > 0) {
				console.log("properties: %o", this.properties);
			}
			if (this.translates.length > 0) {
				var tList = [];
				for (j in this.translates) {
					var t = this.translates[j];
					tList.push(TRANSLATE_TYPE[t]);
				}
				console.log("translates: %o", tList);
			}
		}
	};

	// Обозначения качества переводов на русский в Названии презентаций:
	var TRANSLATE_TYPE = {
		"D": "Дублированный",
		"P": "Профессиональный многоголосый закадровый",
		"P1": "Профессиональный одноголосый закадровый",
		"P2": "Профессиональный двухголосый закадровый",
		"A": "Авторский",
		"L": "Любительский многоголосый закадровый",
		"L1": "Любительский одноголосый закадровый",
		"L2": "Любительский двухголосый закадровый",
		"Sub": "Только субтитры"
	};
