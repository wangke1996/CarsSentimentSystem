function knowledgeBaseInit(menu_id){
    var tree;
    var entity_name=window.location.search.substr(1).match(new RegExp("(^|&)"+ "entity" +"=([^&]*)(&|$)"));
    var attribute_name=window.location.search.substr(1).match(new RegExp("(^|&)"+ "attribute" +"=([^&]*)(&|$)"));
    if (entity_name!=null) {
        entity_name = entity_name[2];
    }
    else {
        entity_name='0';
    }
    if(attribute_name!=null) {
        attribute_name = attribute_name[2];
    }
    else {
        attribute_name='0';
    }
    if(menu_id=='menu_entity'){
        tree = JSON.parse(unescapeHTML(whole_part));
    }
    if(menu_id=='menu_entity_synonym'){
        tree = JSON.parse(unescapeHTML(ent_synonym));
    }
    if(menu_id=='menu_entity_attribute'){
        tree=JSON.parse(unescapeHTML(ent_attr));
    }
    if(menu_id=='menu_attribute_opinion'){
        tree = JSON.parse(unescapeHTML(attr_opinion));
    }
    if(menu_id=='menu_attribute_synonym'){
        tree=JSON.parse(unescapeHTML(attr_synonym));
    }
    document.getElementById(menu_id+'_0').innerHTML='';
    addElements_innerhtml_attr(tree,"0");
    function addElements_innerhtml_attr(node,id){
        var ul_parent = document.getElementById(menu_id+'_'+id);
        var html=[];
        html.push(ul_parent.innerHTML);
        html.push('<li>');
        if(node.child.length){
            html.push('<em></em>');
        }
        if(node.type=='entity'){
            entity_name=node.name;
            html.push( '<a href="/knowledge_base?attribute='+attribute_name+'&entity='+node.name+'#ent_kb">'+node.name+'</a>\n<ul id="'+menu_id+'_'+node.id+'"></ul>\n</li>');
        }
        else if(node.type=='attribute'){
            attribute_name=node.name;
            html.push('<a href="/knowledge_base?entity='+entity_name+'&attribute='+node.name+'#attr_kb">'+node.name+'</a>\n<ul id="'+menu_id+'_'+node.id+'"></ul>\n</li>');
        }
        else{
            html.push('<a href="javascript:void(0);">'+node.name+'</a>\n<ul id="'+menu_id+'_'+node.id+'"></ul>\n</li>');
        }
        ul_parent.innerHTML=html.join('');
        var i;
        for(i=0;i<node.child.length;i++){
            addElements_innerhtml_attr(node.child[i],node.id);
        }
    }
    function unescapeHTML (a){
        return a.replace(/&lt;|&#60;/g, "<").replace(/&gt;|&#62;/g, ">").replace(/&amp;|&#38;/g, "&").replace(/*/&quot;|*//&#34;/g, '"').replace(/&apos;|&#39;/g, "'");
    }
}
