/**
 * Created by 王颗 on 2018/5/10.
 */
    function getValue(url){
        var  xmlHttp = null;
        var val = null;
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
                val = xmlHttp.responseText;
            }
        }
        return val;
    }