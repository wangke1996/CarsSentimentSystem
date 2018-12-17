/**
 * Created by 王颗 on 2018/11/21.
 */
function unescapeHTML(a) {
    return a.replace(/&lt;|&#60;/g, "<").replace(/&gt;|&#62;/g, ">").replace(/&amp;|&#38;/g, "&").replace(/*/&quot;|*//&#34;/g, '"').replace(/&apos;|&#39;/g, "'");
}
function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}
function loadJS(url) {
    var response = getValue(url);
    if (response == null)
        return false;
    var myHead = document.getElementsByTagName("HEAD").item(0);
    var myScript = document.createElement("script");
    myScript.language = "javascript";
    myScript.type = "text/javascript";
    myScript.charset = "utf-8";
    try {
        //IE8以及以下不支持这种方式，需要通过text属性来设置
        myScript.appendChild(document.createTextNode(response));
    }
    catch (ex) {
        myScript.text = response;
    }
    myHead.appendChild(myScript);
    return true;
}

function getValue(url) {
    var xmlHttp = null;
    var val = null;
    if (window.ActiveXObject)//IE
    {
        try {
            //IE6以及以后版本中可以使用
            xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");
        }
        catch (e) {
            //IE5.5以及以后版本可以使用
            xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
    }
    else if (window.XMLHttpRequest)//Firefox，Opera 8.0+，Safari，Chrome
    {
        xmlHttp = new XMLHttpRequest();
    }
    //加上随机请求序号，避免访问缓存
    if (url.indexOf('?') == -1)
        url += '?t=' + Math.random();
    else
        url += '&t=' + Math.random();
    //采用同步加载
    xmlHttp.open("GET", url, false);
    //发送同步请求，如果浏览器为Chrome或Opera，必须发布后才能运行，不然会报错
    xmlHttp.send(null);
    //4代表数据发送完毕

    if (xmlHttp.readyState == 4) {
        //0为访问的本地，200到300代表访问服务器成功，304代表没做修改访问的是缓存
        if ((xmlHttp.status >= 200 && xmlHttp.status < 300) || xmlHttp.status == 0 || xmlHttp.status == 304) {
            val = xmlHttp.responseText;
        }
    }
    return val;
}

function isElementInViewport(el) {

    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();
    // return (rect.bottom >= 0 && rect.right >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight) && rect.left <= (window.innerWidth || document.documentElement.clientWidth));

    // //完全可见
    // return (
    //     rect.top >= 0 &&
    //     rect.left >= 0 &&
    //     rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
    //     rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    // );
    //部分可见
    return (
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.left <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
}
function onVisibilityChange(el, callback) {
    var old_visible;
    return function () {
        var visible = isElementInViewport(el);
        // // 每次出现均调用callback
        // if (visible != old_visible) {
        //     old_visible = visible;
        //     if (visible && typeof callback == 'function') {
        //         callback();
        //     }
        // }
        // 首次出现调用callback
        if (visible && visible != old_visible) {
            old_visible = visible;
            if (typeof callback == 'function') {
                callback();
            }
        }
    }
}