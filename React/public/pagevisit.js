// Syncfusion Analytics
var today = null;
var uuid = '';
var pagecount = 1;
var url='';
var sid = '';

//used to create cookie with expiry
function createCookie(cookieName, cookieValue) {
    var d = new Date();
    var expires = '';

    // set expiry for non-_pagecount cookies
    if (cookieName !== '_pagecount') {
        d.setMonth(d.getMonth() + 24);
        expires = ";expires=" + d.toUTCString();
    }

    // domain: only set .syncfusion.com for cookies other than _pagecount
    var domainAttr = '';
    if (cookieName !== '_pagecount') {
        domainAttr = ";domain=.syncfusion.com";
    }

    var secureAttr = (location.protocol === 'https:') ? ";Secure" : '';
    var sameSite = ";SameSite=None";

    var value = encodeURIComponent(String(cookieValue));
    document.cookie = cookieName + "=" + value + expires + ";path=/" + domainAttr + secureAttr + sameSite;
}

//used to check the given cookie is available or not
function getCookie(cookieName) {
    var name = cookieName + "=";
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        while (cookie.charAt(0) == ' ')
            cookie = cookie.substring(1);
        if (cookie.indexOf(name) == 0)
            return cookie.substring(name.length, cookie.length);
    }
    return "";
}

// Encode Unicode-safe base64
function base64EncodeUnicode(str) {
    try {
        // Preferred: TextEncoder -> binary -> btoa
        if (typeof TextEncoder !== 'undefined') {
            var uint8 = new TextEncoder().encode(String(str));
            var binary = '';
            for (var i = 0; i < uint8.length; i++) {
                binary += String.fromCharCode(uint8[i]);
            }
            return btoa(binary);
        }
    } catch (e) { }
    try {
        return btoa(unescape(encodeURIComponent(String(str))));
    } catch (e) {
        return '';
    }
}

function analytics() {
    pageDetails();
    //creates the key value pair to be sent for analytics api
    var model = {
        UUID: uuid,
        PageUrl: url,
        CurrentTS:  Date.now().toString(),
        PageCount: pagecount,
        SID: sid,
		ReferrerUrl: document.referrer,
		Queue: "showcaseappspagevisit"
    }
    postRequest(model);
}


//used to change the client offset to est offset
function ESTTimeOffset() {
    var jan = new Date(today.getFullYear(), 0, 1);
    var jul = new Date(today.getFullYear(), 6, 1);
    return (Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) <= today.getTimezoneOffset() ? -4 : -5) * 3600000;
}

function pageDetails() {
    today = new Date();
    url = window.location.href;

    //for creating new uuid if the client has no uuid cookies
    var loadTimeOffset = today.getTimezoneOffset() * 60000;
    var estTimeOffset = ESTTimeOffset();
    var timeUTC = today.getTime() + loadTimeOffset;
    var timeEST = new Date(timeUTC + estTimeOffset) / 1;

    //check uuid in browser cookie
    if (getCookie('_uid') != '') {
        uuid = getCookie('_uid');
    } else {
        uuid = Math.floor(Math.random() * 1000) + 1 + timeEST.toString();
        createCookie('_uid', uuid);
    }

    //check sid in browser cookie
    if (getCookie('_sid') != '') {
        sid = getCookie('_sid');
    }

    //count and stores the number of pages user is visited
    if (getCookie('_pagecount') != '') {
        pagecount += parseInt(getCookie('_pagecount'));
        createCookie('_pagecount', pagecount);
    } else {
        createCookie('_pagecount', pagecount);
    }

}

//post ajax request to be sent to analytics api
function postRequest(dataModel) {
  var apiUrl = "https://analytics.syncfusion.com/log/syncfusionsubdomainpagevisit";

  // build form-encoded body
  var params = new URLSearchParams();
  for (var k in dataModel) {
    if (!dataModel.hasOwnProperty(k)) continue;
    var v = dataModel[k];
    if (v === null || typeof v === 'undefined') v = '';
    if (typeof v === 'object') v = JSON.stringify(v);
    params.append(k, String(v));
  }

  fetch(apiUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: params.toString()
  }).catch(function (err) {
    console.error('Analytics post failed:', err);
  });
}

analytics();