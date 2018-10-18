function productProfileInit(menu_id,ent,upload_file_name,include_children){
    var tree;
    tree = JSON.parse(unescapeHTML(data[ent]));
    var polars_include_children;
    if(include_children)
        polars_include_children=JSON.parse(unescapeHTML(data['polars_include_children']));
    document.getElementById(menu_id+'_0').innerHTML='';
    addElements_innerhtml_attr(tree,"0");
    function addElements_innerhtml_attr(node,id){
        var ul_parent = document.getElementById(menu_id+'_'+id);
        var html=[];
        html.push(ul_parent.innerHTML);

        total=node.pos+node.neu+node.neg;

        if(total==0){
            total=1;
        }
        var width=100;
        var sentence_num=-1;
        if(node.name=='正向评价'){
            width=node.pos*width/total;
            sentence_num=node.pos;
            node.pos=total;
            node.neu=0;
            node.neg=0;
        }
        else if(node.name=='中性评价'){
            width=node.neu*width/total;
            sentence_num=node.neu;
            node.pos=0;
            node.neu=total;
            node.neg=0;
        }
        else if(node.name=='负向评价'){
            width=node.neg*width/total;
            sentence_num=node.neg;
            node.pos=0;
            node.neu=0;
            node.neg=total;
        }
        var off_class="";
        if(include_children && (polars_include_children[node.name][0]+polars_include_children[node.name][1]+polars_include_children[node.name][2])>(node.pos+node.neu+node.neg))
            off_class="off";
        html.push('<li>')
        if(node.child.length){
            html.push('<em class="'+off_class+'"></em>');
        }
        html.push('<a href="#'+menu_id+'"');
        if(node.type=='entity'){
            html.push( ' onclick=getProfile("menu_detail","'+node.name+'","'+upload_file_name+'");');
        }
        html.push('>'+node.name+'\n<svg width="'+width+'" height="20" version="1.1">\n<rect width="'+width*(node.pos+node.neu+node.neg)/total+'" height="20" style="fill:rgb(255,0,0);"></rect><rect width="'+(node.pos+node.neu)*width/total+'" height="20" style="fill:rgb(255,255,0);"></rect><rect width="'+node.pos*width/total+'" height="20" style="fill:rgb(0,255,0);"></rect>\n</svg>');
        if(node.type!='sentence') {
            if (node.type == 'sentiment_node') {
                html.push(sentence_num);
            }
            else {
                html.push(node.pos + '/' + node.neu + '/' + node.neg);
            }
        }
        html.push('</a>\n<ul id="'+menu_id+'_'+node.id+'" class="'+off_class+'"></ul>\n</li>');
        ul_parent.innerHTML=html.join('');
        var i;
        for(i=0;i<node.child.length;i++){
            addElements_innerhtml_attr(node.child[i],node.id);
        }
    }
    function unescapeHTML (a){
        return a.replace(/&lt;|&#60;/g, "<").replace(/&gt;|&#62;/g, ">").replace(/&amp;|&#38;/g, "&").replace(/*/&quot;|*//&#34;/g, '"').replace(/&apos;|&#39;/g, "'");
    }
    (function (e) {
        for (var _obj = document.getElementById(e.id).getElementsByTagName(e.tag), i = -1,
                 em; em = _obj[++i];) {
            em.onclick = function () { //onmouseover
                var ul = this.nextSibling;
                if (!ul) {
                    return false;
                }
                ul = ul.nextSibling;
                if (!ul) {
                    return false;
                }
                if (e.tag != 'a') {
                    ul = ul.nextSibling;
                    if (!ul) {
                        return false;
                    }
                } //a 标签控制 隐藏或删除该行
                for (var _li = this.parentNode.parentNode.childNodes, n = -1,
                         li; li = _li[++n];) {
                    if (li.tagName == "LI") {
                        for (var _ul = li.childNodes, t = -1, $ul; $ul = _ul[++t];) {
                            switch ($ul.tagName) {
                                case "UL":
                                    // $ul.className = $ul != ul ? "" : ul.className ? "" : "off";
                                    if($ul!=ul)
                                        break;
                                    ul.className = ul.className ? "" : "off";
                                    break;
                                case "EM":
                                    // $ul.className = $ul != this ? "" : this.className ? "" : "off";
                                    if($ul!=this)
                                        break;
                                    $ul.className = this.className ? "" : "off";
                                    break;
                            }
                        }
                    }
                }
            }
        }
    })({id: menu_id, tag: 'em'});
    
}
