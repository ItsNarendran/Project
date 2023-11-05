function registerABresult(testname, urlToRedirect) {
	$.ajax({
		type: "POST",
		url: "/home/RegisterABResult",
		data: { testname: testname },
		async: false,
		success: function (msg) {
			if (urlToRedirect !== undefined) {
				document.location.href = urlToRedirect;
			}
		}
	});

	return false;
}


function getQueryStringParameterByName(name) {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
	return results === null ? undefined : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function createCookie(name, value, days) {
	var expires = "";
	if (days) {
		var date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = "; expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + value + expires + "; path=/";
}

function getCookie(name) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}

function saveUtmSource() {
	var utm_source = "";
	var gclid = getQueryStringParameterByName("gclid");
	if (gclid !== undefined) { utm_source = "adwords"; }

	var utm_source_param = getQueryStringParameterByName("utm_source");
	if (utm_source_param !== undefined) { utm_source += (utm_source == "" ? "" : ",") + utm_source_param.replace(',', ''); }

	if (utm_source !== "") {
		var value = "";
		if (getCookie('utmSource') !== undefined)
			value = getCookie('utmSource') + "," + utm_source;
		else
			value = utm_source;

		createCookie('utmSource', value, 30);
	}
	else {
		var path = window.location.pathname;
		if (getCookie('utmSource') === undefined)
			createCookie('utmSource', path || "/", 30);
	}
}

function closeTopbar() {
	$("#topbar").slideUp();
	createCookie("tobarhidden", "true", 5);
}

function LoadCssFile(cssPath) {
	var cb = function () {
		var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = cssPath;
		var h = document.getElementsByTagName('head')[0]; h.appendChild(l);
	}
	var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
	if (raf) raf(cb);
	else window.addEventListener('load', cb);
}

//animated images
$(function () {
	$.fn.visible = function (partial) {
		var $t = $(this),
			$w = $(window),
			viewTop = $w.scrollTop(),
			viewBottom = viewTop + $w.height(),
			_top = $t.offset().top + 100,
			_bottom = _top + $t.height(),
			compareTop = partial === true ? _bottom : _top,
			compareBottom = partial === true ? _top : _bottom;

		return ((compareBottom <= viewBottom) && (compareTop >= viewTop));
	};

	if (!/Mobi/.test(navigator.userAgent)) {
		window.$animatedElements = $(".slideinleft, .slideinright, .slideinup");
		if (window.$animatedElements.length) {
			window.addEventListener('scroll', animateImgs, { passive: true });
			animateImgs();
		}
	}

	function animateImgs() {
		window.$animatedElements.each(function (i, el) {
			var el = $(el);
			if (el.visible(true)) {
				el.addClass("come-in");
			}
			else {
				el.removeClass("come-in");
			}
		});
	}

	if (getCookie("hdurl") && !getCookie("tobarhidden")) {
		$("#topbar").show();
		$('#loginHere').attr("href", decodeURIComponent(getCookie("hdurl")));
	}
});