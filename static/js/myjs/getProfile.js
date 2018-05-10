function getProfile(menu_id, ent,upload_file_name) {
    var request_url = '/getProfile';
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    }
    else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.open('GET', request_url + '?ent=' + ent + '&t=' + Math.random(), true);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var response = xmlhttp.responseText;
            if (response == 'succeed') {
                var title = document.getElementById(menu_id + '_title');
                if (menu_id == "menu_all")
                    title.innerHTML = "产品画像";
                else
                    title.innerHTML = "细节画像——" + ent;
                loadJS('static/result_json/'+upload_file_name+'.js');
                loadJS('static/result_json/'+upload_file_name+'_'+ ent +'.js');
                productProfileInit(menu_id, ent,upload_file_name);
            }
            else {
                alert('服务器响应错误！\n'+response);
            }
        }
    }
    function loadJS(url){
    var  xmlHttp = null;
    if(window.ActiveXObject)//IE
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
    else if(window.XMLHttpRequest)//Firefox，Opera 8.0+，Safari，Chrome
    {
        xmlHttp = new XMLHttpRequest();
    }
    //采用同步加载
    xmlHttp.open("GET",url,false);
    //发送同步请求，如果浏览器为Chrome或Opera，必须发布后才能运行，不然会报错
    xmlHttp.send(null);
    //4代表数据发送完毕
    if ( xmlHttp.readyState == 4 )
    {
        //0为访问的本地，200到300代表访问服务器成功，304代表没做修改访问的是缓存
        if((xmlHttp.status >= 200 && xmlHttp.status <300) || xmlHttp.status == 0 || xmlHttp.status == 304)
        {
            var myHead = document.getElementsByTagName("HEAD").item(0);
            var myScript = document.createElement( "script" );
            myScript.language = "javascript";
            myScript.type = "text/javascript";
            myScript.charset="utf-8";
            try{
                //IE8以及以下不支持这种方式，需要通过text属性来设置
                myScript.appendChild(document.createTextNode(xmlHttp.responseText));
            }
            catch (ex){
                myScript.text = xmlHttp.responseText;
            }
            myHead.appendChild( myScript );
            return true;
        }
        else
        {
            return false;
        }
    }
    else
    {
        return false;
    }
}
}

