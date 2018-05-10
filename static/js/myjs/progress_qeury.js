
    var sitv = setInterval(function(){
        var pg=document.getElementById('pg');
        var prog_url ='/get_progress';                   // prog_url指请求进度的url
        var xmlhttp;
        if (window.XMLHttpRequest)
        {
            xmlhttp=new XMLHttpRequest();
        }
        else
        {
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.open('GET',prog_url+'?t='+Math.random()+'&opt=ready',true);
        xmlhttp.send();
        xmlhttp.onreadystatechange=function()
        {
            if (xmlhttp.readyState==4 && xmlhttp.status==200)
            {
                var response=xmlhttp.responseText.split('-');
                var state=response[0];
                var progress=response[1];
                if(state=='busy'){
                    document.getElementById("pg").setAttribute('value',progress);
                    if(progress==100){
                        xmlhttp.open('GET',prog_url+'?t='+Math.random()+'&opt=reset',true);
                        xmlhttp.send();
                    }
                }
            }
        }
    }, 500);                                 // 每0.5秒查询一次后台进度

