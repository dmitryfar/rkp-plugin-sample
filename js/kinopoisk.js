//$(document).ready(function(){
$.on("rkp:storageReady", function(){
	//console.log("kinopoisk!");
	
	//var block_blog = $("div.block_blog");
	var block_blog = $("div.block_left_padtop");
	var tr = block_blog.parent().parent();
	
	var title = null;
	try {
		title = $("h1.moviename-big")[0].innerText;
	} catch(e) {
	}
	var header = '<b>R</b>utor.org';
	if (title != null) {
		header += ': <a href ="http://rutor.org/search/0/0/000/0/' + title + '" target="_blank">' + title + '</a>';
	}
	
	var html ='<tr><td id="torrents_header" colspan="3" class="main_line" height="25">'
            + header
            //+ '<a class="btn__show" href="#"></a>'
			+ '</td></tr>';
		
			
	html += '<tr class="torrentsBlooper"><td colspan="3">'
			+ '<div id="torrentsBlock"></div>'
			+ '</td></tr>';
	var torrentsDiv = $(html);
	
	torrentsDiv.insertBefore(tr);
	
	// retrieve torrent list
	
	var kpId = window.location.href.match(/film\/(\d+)/)[1];
	var data = {kpId: kpId, userId: localStorage.getItem('userId'), requestPageId: localStorage.getItem('requestPageId')};
	
	// get rating and update
	KinopoiskParser.getRating(kpId, function() {
		kinopoiskPage = this;
		var rating = kinopoiskPage.rating;
		//console.log("kinopoisk rating: kp: %o(%o), imdb: %o(%o)", rating.kpRatingValue, rating.kpRatingCount, rating.imdbRatingValue, rating.imdbRatingCount);

		// TODO: update torrent and kinopoisk data
		RKPUtil.updateRating({kpId: kpId, kpRating: rating.kpRatingValue, kpNumVote: rating.kpRatingCount}, function(response) {
			//console.log("rating update response: %o", response);
		});
	});
	
	// retrieve torrents by kpId
	
	var href = Properties.get("rkp.get.kp.torrents.url");
	$.ajax({
		url: href, 
		type: "POST",
		//dataType: "json",
		data: data, 
		success: function( response ) {
			//console.clear();
			//console.log("response length: %o", response.length);
			
			try {
				var torrents = jQuery.parseJSON(response);
				//console.log("torrents: %o", torrents);
				if (torrents == null) {
					return;
				}
				
				var hasEpisodes = false;
				for(var i in torrents) {
					var rutor = torrents[i];
					if (rutor.episodes) {
						hasEpisodes = true;
					}
				}
				
				// rutor search link
				var html = "";
				
				
				if (torrents.length > 0) {
					html += "<table width='100%'>"
							+ "<tr>"
							+ "<th></th>"
							+ "<th>Название</th>"
							+ ((hasEpisodes) ? "<th>Эпизоды</th>" : "")
							+ "<th>Релизер</th>"
							+ "<th>Параметры</th>"
							+ "<th>Перевод</th>"
							+ "<th>Качество</th>"
							+ "<th>Размер</th>"
							+ "</tr>";
					for(var i in torrents) {
						try {
							var rutor = torrents[i];
							var trClass = (i%2 == 0) ? "tdark": "";
							html += "<tr class='torrent-data " + trClass + "'>";
							// TODO: add magnet link
							
							var torrentDownloadUrl = Properties.get("rutor.torrent.download.url", rutor.torrentId);
							var torrentUrl = Properties.get("rutor.torrent.url", rutor.torrentId);
							
							html += '<td class="link-icons">';
							html += '<a class="downgif" href="' + torrentDownloadUrl + '"><img src="http://s.rutor.org/i/d.gif" alt="D"></a>';
							if (rutor.hash) {
								var magnetTitle = encodeURI(rutor.torrentName.replace(/\s/gi, "+"));
								var torrentMagnetUrl = Properties.get("rutor.torrent.magnet.url", rutor.hash, magnetTitle);
								html += " <a href='" + torrentMagnetUrl + "' alt='magnet link'><img src='http://s.rutor.org/i/m.png' alt='M'/></a>";
							}
							html += '</td>';
							
							var title = rutor.title;
							// var originalTitle = trim(str_replace("[{$rutor->episodes}]", "", $rutor->originalTitle));
							var originalTitle = rutor.originalTitle;
							if (!rutor.title) {
								title = originalTitle;
								originalTitle = "";
							}
							html += "<td>"
								+ "<a href='" + torrentUrl + "' target='_blank'>"
								+ title
								+ ((originalTitle) ? " / " + originalTitle : "")
								+ "</a>"
							+ "</td>";

							if (hasEpisodes) {
								html += "<td>" + rutor.episodes + "</td>";
							}
							
							html += "<td>" + ((rutor.releaser)? rutor.releaser : "") + "</td>";
							html += "<td>" + ((rutor.properties)? rutor.properties : "") + "</td>";
							html += "<td>" + rutor.translatesList.join("<br />") + "</td>";
							html += "<td>" + ((rutor.quality)? rutor.quality : "") + "</td>";
							
							var fileSize = rutor.fileSize / (1024 * 1024 * 1024);
							if (fileSize < 1) {
								fileSize = Math.round(rutor.fileSize / (1024 * 1024)) + " MB";
							} else {
								fileSize = Math.round(fileSize, 2) + " GB";
							}
							
							html += "<td>" + fileSize + "</td>";
							
							html += "</tr>";
						} catch (e) {
							console.error(e);
						}
					}
					html += "</table>";
				}
				$("#torrentsBlock").html(html);
			} catch (e) {
				console.error("ERROR: %o", e);
				console.error("response:\n%o", response);
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.warn("error: %o, %o, %o", jqXHR, textStatus, errorThrown);
		}
	});
});