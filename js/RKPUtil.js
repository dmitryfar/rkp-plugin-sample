var RKPUtil = {
	newTorrentIds: [],
	kpDataList: [],
	
	getLog: function() {
		var jsonLog = null;
		try {
			jsonLog = jQuery.parseJSON(localStorage.getItem("jsonLog"));
		} catch (e) {
		}
		if (!jsonLog || jsonLog == "null") {
			jsonLog = [];
		}
		return jsonLog;
	},
	addLog: function(obj) {
		var log = RKPUtil.getLog();
		log.push(obj);
		var str = JSON.stringify(log);
		localStorage.setItem("jsonLog", str);
	},
	resetLog: function(){
		localStorage.setItem("jsonLog", null);
	},
	
	getTorrentsInfo: function(torrentIds, callback) {
		var instance = this;
		var href = Properties.get("rkp.get.torrent.url");
		
		if (!$.isArray(torrentIds)) {
			torrentIds = [torrentIds];
		} else if (torrentIds.length == 0){
			callback.apply(instance, []);
			return;
		}
		
		console.log("get torrents info for torrentIds: %o", torrentIds);
		$.ajax({
			url: href, 
			type: "POST",
			//dataType: "json",
			data: {torrentIds: torrentIds, userId: localStorage.getItem('userId'), requestPageId: localStorage.getItem('requestPageId')}, 
			success: function( response ) {
				console.log("response length: %o", response.length);
				
				try {
					var torrentsInfo = jQuery.parseJSON(response);
					//console.log("json: %o", torrentsInfo);
					
					var jsonPretty = JSON.stringify(torrentsInfo, null, '\t');
					
					console.log("retrieved %o torrents info for %o  requested torrentIds", torrentsInfo.length, torrentIds.length);
					
					callback.apply(instance, [torrentsInfo]);
				} catch (e) {
					console.error("ERROR: %o", e);
					console.error("response:\n%o", response);
					callback.apply(instance, []);
				}
			}
		});
	},
	
	update: function(data, callbackUpdate) {
		console.log("update: %o", data);
		var href = Properties.get("rkp.update.url");
		
		var jsonString = JSON.stringify(data);
		var data = jQuery.parseJSON(jsonString);
		
		if (data.rutorPage.torrentId == 164468) {
			console.warn("WTF??");
		}
		
		if (data) {
			data.userId = localStorage.getItem('userId');
			data.requestPageId = localStorage.getItem('requestPageId');
		}
		
		$.ajax({
			url: href, 
			type: "POST",
			//dataType: "json",
			data: data, 
			success: function( response ) {
				console.info("update received: %o", response);
				
				RKPUtil.getTorrentsInfo(
					data.rutorPage.torrentId,
					function(torrentsInfo) {
						/*if (torrentsInfo.length > 0 && data.rutorPage.kpId == torrentsInfo[0].kinopoiskData.kpId) {
							kinopoiskData = torrentsInfo[0].kinopoiskData;
							kinopoiskInfo = torrentsInfo[0].kinopoiskInfo;
							if (callbackUpdate) {
								callbackUpdate.call(null, torrentsInfo[0]);
							}
						}*/
						if (torrentsInfo.length > 0) {
							if (data.rutorPage.kpId == torrentsInfo[0].kinopoiskData.kpId) {
								kinopoiskData = torrentsInfo[0].kinopoiskData;
								kinopoiskInfo = torrentsInfo[0].kinopoiskInfo;
							}
							if (callbackUpdate) {
								callbackUpdate.call(null, torrentsInfo[0]);
							}
						}
					}
				);
				
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.warn("update error: %o, %o, %o, data: %o", jqXHR, textStatus, errorThrown, data);
				setTorrentInfoHtml(data.rutorPage.torrentId, "nameRu", ".");
			}
		});
	},
	
	/**
	 * data = {kpId: XXXX, kpRating: YY.YY, kpNumVote: ZZZZ}
	 */
	updateRating: function(data, callback) {
		var href = Properties.get("rkp.update.rating.url");
		
		var jsonString = JSON.stringify(data);
		var data = jQuery.parseJSON(jsonString);
		
		if (data) {
			data.userId = localStorage.getItem('userId');
			data.requestPageId = localStorage.getItem('requestPageId');
		}
		
		$.ajax({
			url: href, 
			type: "POST",
			data: data, 
			success: function( response ) {
				if (callback) {
					callback.call(null, response);
				}
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.warn("update error: %o, %o, %o", jqXHR, textStatus, errorThrown);
			}
		});
	},
	
	scanPage: function(rutorPage, callback) {
		// TODO: use rutorPage
		var links = $("#index td a[href*='/torrent/']");

		var torrentIds = [];
		var newTorrentIds = [];
		
		// create torrentIds list
		for(var index = 0; index < links.length; index++) {
			var href = links.get(index).attributes.href.value;
			var torrentId = parseInt(href.match(/\d+/)[0]);
			//var torrentId = href.match(/\d+/)[0];
			torrentIds.push(torrentId);
		}
		
		//console.log("scan torrents on page: %o", torrentIds);

		RKPUtil.getTorrentsInfo(
			torrentIds,
			function(torrentsInfo) {
				var existedItems = [];
				for(var i in torrentsInfo) {
					var torrentInfo = torrentsInfo[i];
					existedItems.push(torrentInfo.rutor.torrentId);
				}
				
				var allItems = torrentIds;
				newTorrentIds = allItems.filter(function (item, pos) {
					return existedItems.indexOf(item) < 0
				});
				console.log("allItems: %o, existedItems: %o, newTorrentIds: %o", allItems.length, existedItems.length, newTorrentIds.length);
				
				if (callback) {
					callback.call(null, torrentsInfo, newTorrentIds);
				}
			}
		);
	},

	scanAll: function(callback) {
		var rutorPage = null;
		RKPUtil.scanPage(rutorPage, function(torrentsInfo, newTorrentIds) {
			RKPUtil.newTorrentIds = newTorrentIds;
			console.log("newTorrentIds: %o", newTorrentIds);
			
			extendTorrentInfoColumns();
				
			for(var i in torrentsInfo) {
				var torrentInfo = torrentsInfo[i];
				
				var kpId = torrentInfo.kinopoiskData.kpId;
				RKPUtil.kpDataList[kpId] = torrentInfo.kinopoiskData;
				
				// use existed info to show ratings
				var torrentId = torrentInfo.rutor.torrentId;
				//console.log("torrentId: %o, data: %o", torrentId, torrentInfo);
				showTorrentInfo(torrentInfo);
			}
			
			if (callback) {
				callback.call(null, torrentsInfo, newTorrentIds);
			}
		});
	},
	
	grabEnable: function() {
		localStorage.setItem("grabEnable", "true");
	},
	grabDisable: function() {
		localStorage.setItem("grabEnable", "false");
	},
	runGrabTimer: function() {
		setTimeout(function() {
			//console.log("grabEnable: %o", localStorage.getItem("grabEnable"));
			if (localStorage.getItem("grabEnable") != "true") {
				return;
			}
			console.log("GRABB!");
			var ids = RKPUtil.newTorrentIds.slice(0, 10);
			if (ids.length > 0) {
				RKPUtil.grabTorrents(ids);
			} else {
				console.log("automatic grabb whole page is complete");
				var href = window.location.href;
				var matches = href.match(/browse\/(\d+)\/(\d+)\/(\d+)\/(\d+)/);
				if (matches) {
					var page = parseInt(matches[1]);
					page ++;
					href = href.replace(/browse\/(\d+)\//,"browse\/" + page + "\/");
					window.location = href;
				}
			}
		}, 5000);
	},

	grabTorrents: function(torrentIds) {
		var grabAllComplete = function() {
			console.log("grabber>>> all complete");
			RKPUtil.runGrabTimer();
		};
		var grabTorrentComplete = function(torrentId) {
			completed++;
			console.log("grabber> complete %o", torrentId);
			
			// TODO: remove torrentId from RKPUtil.newTorrentIds;
			var p = RKPUtil.newTorrentIds.indexOf(torrentId);
			if (p >= 0) {
				RKPUtil.newTorrentIds.splice(p, 1);
			}
			
			if (completed == torrentIds.length) {
				grabAllComplete();
			}
		};
		var completed = 0;
		for(var index in torrentIds) {
			var torrentId = torrentIds[index];
			console.log("grabber> grab torrent %o", torrentId);
			setTorrentInfoHtml(torrentId, "nameRu", "...");
			try {
				var rutorParser = new RutorParser(
					torrentId,
					{
						isTorrentPage: false
					},
					function () {
						var rutorPage = this;
						if (rutorPage.error) {
							RKPUtil.addLog({torrentId: rutorPage.torrentId, error: rutorPage.error});
							grabTorrentComplete(rutorPage.torrentId);
							return;
						}
						
						console.log("grabber> parse torrent page complete: %o", rutorPage);
						
						setTorrentInfoHtml(rutorPage.torrentId, "nameRu", "..");
						
						
						if (rutorPage.kpId && RKPUtil.kpDataList[rutorPage.kpId]) {
							var torrentInfo = {
								rutor: {
									torrentId: rutorPage.torrentId
								},
								kinopoiskData: RKPUtil.kpDataList[rutorPage.kpId]
							};
							console.log("grabber> torrentInfo: %o", torrentInfo);
							RKPUtil.update({rutorPage: rutorPage, kinopoiskPage: torrentInfo.kinopoiskData}, function(torrentInfo) {
								grabTorrentComplete(rutorPage.torrentId);
								showTorrentInfo(torrentInfo);
							});
						} else if (rutorPage.kpId) {
							// get kp data
							var kinopoiskParser = new KinopoiskParser(rutorPage.kpId, function() {
								var kinopoiskPage = this;
								console.log("grabber> parse kinopoisk page complete: %o", kinopoiskParser);
								// update torrent, kp data and rating
								RKPUtil.update({rutorPage: rutorPage, kinopoiskPage: kinopoiskPage}, function(torrentInfo) {
									//completed++;
									grabTorrentComplete(rutorPage.torrentId);
									
									var kpId = torrentInfo.kinopoiskData.kpId;
									RKPUtil.kpDataList[kpId] = torrentInfo.kinopoiskData;
									
									//console.log("grabber>> torrentInfo: %o", torrentInfo);
									showTorrentInfo(torrentInfo);
								});
							},
							function(e){
								/* fail */
								if (e instanceof KinopoiskParserException) {
									if (e.code == 1) {
										setTorrentInfoHtml(rutorPage.torrentId, "nameRu", "<span style='color:red'>Неверная ссылка на Кинопоиск</span>");
									} else {
										setTorrentInfoHtml(rutorPage.torrentId, "nameRu", ".");
									}
								} else {
									setTorrentInfoHtml(rutorPage.torrentId, "nameRu", "..");
								}
								RKPUtil.addLog({torrentId: rutorPage.torrentId, error: e});
								grabTorrentComplete(rutorPage.torrentId);
							});
						} else {
							console.log("grabber> no kp banner found in torrent %o", rutorPage.torrentId);
							//completed++;
							grabTorrentComplete(rutorPage.torrentId);
							showNoKpBanner(rutorPage.torrentId);
						}
					}
				);
			} catch (e) {
				console.error(e);
				setTorrentInfoHtml(torrentId, "nameRu", ",");
			}
		}
	},
	
	initUserId: function() {
		function generateString() {
			return 'xxxxxx'.replace(/[xy]/g, function(c) {
				var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});
		};
		function generateGuig() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});
		};
		function useToken(userId) {
			localStorage.setItem('userId', userId);
			console.log("userId %o stored", userId);
			$(function() {
				$.fire("rkp:storageReady");
			});
		}
		localStorage.setItem('requestPageId', generateString());
		var userId = localStorage.getItem('userId');
		if (userId) {
			useToken(userId);
		} else {
			chrome.storage.sync.get('userId', function(items) {
				var userId = items.userId;
				if (userId) {
					useToken(userId);
				} else {
					userId = generateGuig();
					chrome.storage.sync.set({userId: userId}, function() {
						useToken(userId);
					});
				}
			});
		}
	}
}

RKPUtil.initUserId();