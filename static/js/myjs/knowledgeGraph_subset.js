function knowledgeGraph_subset() {
    var product=getValue('/getProduct');
    loadJS('static/kb_json/'+product+'/part_of_knowledgebase.js');
    loadJS('static/kb_json/'+product+'/subset.js');
    var links_all=JSON.parse(unescapeHTML(links_kb_subset));
    var nodes=JSON.parse(unescapeHTML(nodes_kb_subset));
    var subset_legend=JSON.parse(unescapeHTML(subset));
    var links=links_all['entity_entity'].concat(links_all['entity_attribute']).concat(links_all['entity_synonym']).concat(links_all['attribute_synonym']).concat(links_all['attribute_opinion']);

    var colors_circle={'entity':'#FF8C00','attribute':'#1E90FF','description':'#00CCCC'};
    var colors_text={'entity':'#FFFFFF','attribute':'#000000','description':'#330099'};
    	//(2)从链接中分离出不同的节点
	links.forEach(function(link) {
	  link.source = nodes[link.source];
	  link.target = nodes[link.target];
	});

	var width = 1500,
		height = 1500;

	var force = d3.layout.force()
		.nodes(d3.values(nodes))
		.links(links)
		.size([width, height])
		.linkDistance(600)
		.charge(-1200)
		.on("tick", tick)
		.start();

	var svg = d3.select('#Knowledge_Graph_Demo').append("svg")
		.attr("id","svg1")
		.attr("width", width)
		.attr("height", height);
	//添加描述文字
	var title=product+"产品知识图谱示意图";
	var fontsize=50;
	svg.append("text").text(title)
		.attr("class","title")
		.attr("x",width/2-title.length*fontsize/2)
		.attr("y",fontsize+10)
		.attr("font-size",fontsize)
		.attr("font-family","sans-serif")
		.attr("fill","gray");
	//(3)为链接添加箭头和路径
    var marker=svg.append("marker")
    //.attr("id", function(d) { return d; })
    .attr("id", "resolved")
    .attr("markerUnits","strokeWidth")//设置为strokeWidth箭头会随着线的粗细发生变化
    //.attr("markerUnits","userSpaceOnUse")
    .attr("viewBox", "0 -5 10 10")//坐标系的区域
    .attr("refX",32)//箭头坐标
    .attr("refY", 0)
    .attr("markerWidth", 12)//标识的大小
    .attr("markerHeight", 6)
    .attr("orient", "auto")//绘制方向，可设定为：auto（自动确认方向）和 角度值
    .attr("stroke-width",0.5)//箭头宽度
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")//箭头的路径
    .attr('fill','#aaa');//箭头颜色

    var edges_line = svg.selectAll(".edgepath")
    .data(force.links())
    .enter()
    .append("path")
    .attr({
          'd': function(d) {return 'M '+d.target.x+' '+d.target.y+' L '+ d.source.x +' '+d.source.y},
          'class':'edgepath',
          //'fill-opacity':0,
          //'stroke-opacity':0,
          //'fill':'blue',
          //'stroke':'red',
          'id':function(d,i) {return 'edgepath'+i;}})
    .style("stroke",function(d){
         var lineColor;
         //根据关系的不同设置线条颜色
         if(d.type=="is part of"){
             lineColor="#000000";
         }
         else if(d.type=="is an attribute of"){
             lineColor="#708090";
         }
         else if(d.type=="is the same as"){
             lineColor="#4b0082";
         }
         else if(d.type=="is a positive description of"){
             lineColor="#228b22";
         }
         else if(d.type=="is a negative description of"){
             lineColor="#8b0000";
         }
         else{
             lineColor="#ffd700";
         }
         return lineColor;
     })
    .style("pointer-events", "none")
    .style("stroke-width",0.5)//线条粗细
    .attr("marker-end", "url(#resolved)" );//根据箭头标记的id号标记箭头

    var edges_text = svg.append("g").selectAll(".edgelabel")
    .data(force.links())
    .enter()
    .append("text")
    .style("pointer-events", "none")
    //.attr("class","linetext")
    .attr({  'class':'edgelabel',
                   'id':function(d,i){return 'edgepath'+i;},
                    //"text-anchor": "middle",
                    'dx':200,
                   'dy':0,
                   'font-size':15,
                   'fill':'#aaa'
                   });

    //设置线条上的文字
    edges_text.append('textPath')
    .attr('xlink:href',function(d,i) {return '#edgepath'+i})
    .style("pointer-events", "none")
    .text(function(d){
         if(d.type=="is part of"){
             return "part of";
         }
         else if(d.type=="is an attribute of"){
             return "attribute";
         }
         else if(d.type=="is the same as"){
             return "same as";
         }
         else if(d.type=="is a positive description of"){
             return "positive description";
         }
         else if(d.type=="is a negative description of"){
             return "negative description";
         }
         else{
             return "neutral description";
         }})

	// var link = svg.selectAll(".link")
	// 	.data(force.links())
	// 	.enter().append("line")
	// 	.attr("class", "link");

	var colors=d3.scale.category20();

	// link.style("stroke",function(d){//  设置线的颜色
	// 	return colors(d.color);
	// })
	// .style("stroke-width",function(d,i){//设置线的宽度
	// 	return d.weight;
	// });
	//(4)为链接添加节点
    var circle = svg.append("g").selectAll("circle")
    .data(force.nodes())//表示使用force.nodes数据
    .enter().append("circle")
		.attr("r",function(d){  //设置圆点半径
		    return radius(d);
	    })
	    .style("fill",function(d){ //设置圆点的颜色
            return circle_color(d);
        })
        .on("click",function(node){
        //单击时让连接线加粗，关系文字变黑、字体变大
        edges_line.style("stroke-width",function(line){
            //console.log(line);
            if(line.source.name==node.name || line.target.name==node.name){
                return 4;
            }else{
                return 0.5;
            }
        });
        edges_text.attr("fill",function(line){
            if(line.source.name==node.name||line.target.name==node.name){
                return "#000";
            }
            else{
                return "#aaa";
            }
        }).attr("font-size",function(line){
            if(line.source.name==node.name||line.target.name==node.name){
                return 25;
            }
            else{
                return 15;
            }
        });
        var related_node=new Array();
        var i=0;
        for(var x=0;x<edges_line[0].length;x++){
            if(edges_line[0][x].__data__.source.name==node.name)
                related_node[i++]=edges_line[0][x].__data__.target.name;
            else if(edges_line[0][x].__data__.target.name==node.name)
                related_node[i++]=edges_line[0][x].__data__.source.name;
        }
        related_node[i]=node.name;
        text.attr("font-weight",function(d){
            if(related_node.indexOf(d.name)!=-1){
                return "bold";
            }
            else{
                return "normal";
            }
        })
        .attr("font-size",function (d) {
            if(related_node.indexOf(d.name)!=-1){
                return font_size(d)+10;
            }
            else{
                return font_size(d);
            }

        });
        //d3.select(this).style('stroke-width',2);
    })
		.on("mouseover", mouseover)
		.on("mouseout", mouseout)
        .call(force.drag);//将当前选中的元素传到drag函数中，使顶点可以被拖动
	// .on("dblclick",function(d){
	// //var svg1=document.getElementById("svg1");
	// //svg1.parentNode.removeChild(svg1);
	// 	var entity_backup2=deepCopy(links_entity_backup);
	// 	var entity_attr_backup2=deepCopy(links_entity_attr_backup);
	// 	var entity_attr_backup3=deepCopy(links_entity_attr_backup);
	// 	var entity_synonym_backup2=deepCopy(links_entity_synonym_backup);
	// 	var attr_synonym_backup2=deepCopy(links_attr_synonym_backup);
	// 	var opinion_pair_backup2=deepCopy(links_opinion_pair_backup);
	// 	aspect_detail(entity_backup2,d.name,d.level,Math.floor(10000*Math.random()))
	// 	entity_detail(entity_attr_backup2,d.name,Math.floor(10000*Math.random()),"ent_attr");
	// 	entity_detail(entity_synonym_backup2,d.name,Math.floor(10000*Math.random()),"ent_syn");
	// 	entity_detail(attr_synonym_backup2,d.name,Math.floor(10000*Math.random()),"attr_syn");
	// 	aspect_opinion_polarity(opinion_pair_backup2,entity_attr_backup3,d.name,Math.floor(10000*Math.random()));
	// }) ;

    var text = svg.append("g").selectAll("text")
        .data(force.nodes())
        //返回缺失元素的占位对象（placeholder），指向绑定的数据中比选定元素集多出的一部分元素。
        .enter()
        .append("text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")//在圆圈中加上数据
        .attr("font-weight","normal")
        .attr("font-size",function(d){
            return font_size(d);
        })
        .style('fill',function(d){return text_color(d);})
        .attr('x',function(d){
            // console.log(d.name+"---"+ d.name.length);
            var re_en = /[a-zA-Z]+/g;
            //如果是全英文，不换行
            if(d.name.match(re_en)){
                 d3.select(this).append('tspan')
                 .attr('x',0)
                 .attr('y',2)
                 .text(function(){return d.name;});
            }
            //如果小于四个字符，不换行
            else if(d.name.length<=4){
                 d3.select(this).append('tspan')
                .attr('x',0)
                .attr('y',2)
                .text(function(){return d.name;});
            }else{
                var top=d.name.substring(0,4);
                var bot=d.name.substring(4,d.name.length);

                d3.select(this).text(function(){return '';});

                d3.select(this).append('tspan')
                    .attr('x',0)
                    .attr('y',-15)
                    .text(function(){return top;});

                d3.select(this).append('tspan')
                    .attr('x',0)
                    .attr('y',25)
                    .text(function(){return bot;});
            }
            //直接显示文字
            /*.text(function(d) {
            return d.name; */
        });
    // add legend
    var cx=0,cy=10;
    for(var type in subset_legend) {
        if(!type.startsWith('legend'))
            continue;
        for(var j=0,l=subset_legend[type].length;j<l;j++){
            if(j==0){
                cx = font_size1(1);
                cy = cy + 2 * radius1(0);
                svg.append("text").attr({"dy":".35em","text-anchor":"middle","font-weight":"normal","font-size":font_size1(1),'x':cx,'y':cy}).style('fill','#000000').text(subset_legend[type][j]);
                cx=cx+2*font_size1(1);
                continue;
            }
            var node=nodes[subset_legend[type][j]];
            var r = radius(node);
            cx = cx + r;
            svg.append("circle").attr({"r": r, "cx": cx, "cy": cy}).style("fill", circle_color(node));
            svg.append("text").attr({
                "dy": ".35em",
                "text-anchor": "middle",
                "font-weight": "normal",
                "font-size": font_size(node),
                'x': cx,
                'y': cy
            })
                .style('fill', text_color(node))
                .text(node.name);
            cx = cx + r + 10;
        }
    }
    // var legend_node=[nodes["汽车"],nodes["发动机"],nodes["进气系统"],nodes["整体"],nodes["质量"],nodes["性能"],nodes["好"],nodes["适中"],nodes["高"]];
    // var legend_name=["实体","属性","描述"]
    // var cx=0,cy=10;
    // for(var i=0;i<legend_node.length;i++) {
    //     var node = legend_node[i];
    //     var r = radius(node);
    //     if (i % 3 == 0) {
    //         cx = font_size1(1);
    //         cy = cy + 2 * radius1(0);
    //         svg.append("text").attr({"dy":".35em","text-anchor":"middle","font-weight":"normal","font-size":font_size1(1),'x':cx,'y':cy}).style('fill','#000000').text(legend_name[i/3]);
    //         cx=cx+2*font_size1(1);
    //     }
    //     cx = cx + r;
    //     svg.append("circle").attr({"r": r, "cx": cx, "cy": cy}).style("fill", circle_color(node));
    //     svg.append("text").attr({
    //         "dy": ".35em",
    //         "text-anchor": "middle",
    //         "font-weight": "normal",
    //         "font-size": font_size(node),
    //         'x': cx,
    //         'y': cy
    //     })
    //         .style('fill', text_color(node))
    //         .text(node.name);
    //     cx = cx + r + 10;
    // }

    function radius(d){
        return radius1(d.level);
    }
    function radius1(level){
        return (12-level)*5;
    }
    function font_size(d){
        return font_size1(d.level);
    }
    function font_size1(level){
        return 30-10*Math.log(level);
    }
    function circle_color(d){
        if(d.type=="entity"||d.type=="entity_synonym")
            return colors_circle["entity"];
        else if(d.type=="attribute"||d.type=="attribute_synonym")
            return colors_circle["attribute"];
        else
            return colors_circle["description"];
    }
    function text_color(d){
        if(d.type=="entity"||d.type=="entity_synonym")
            return colors_text["entity"];
        else if(d.type=="attribute"||d.type=="attribute_synonym")
            return colors_text["attribute"];
        else
            return colors_text["description"];
    }
	function deepCopy(source) {
    	var sourceCopy = source instanceof Array ? [] : {};
   		for (var item in source) {
        	sourceCopy[item] = typeof source[item] === 'object' ? deepCopy(source[item]) : source[item];
    	}
    	return sourceCopy;
	}



function tick() {
  //path.attr("d", linkArc);//连接线
  circle.attr("transform", transform1);//圆圈
  text.attr("transform", transform2);//顶点文字
  //edges_text.attr("transform", transform3);
  //text2.attr("d", linkArc);//连接线文字
  //console.log("text2...................");
  //console.log(text2);
  //edges_line.attr("x1",function(d){ return d.source.x; });
  //edges_line.attr("y1",function(d){ return d.source.y; });
  //edges_line.attr("x2",function(d){ return d.target.x; });
  //edges_line.attr("y2",function(d){ return d.target.y; });

  //edges_line.attr("x",function(d){ return (d.source.x + d.target.x) / 2 ; });
  //edges_line.attr("y",function(d){ return (d.source.y + d.target.y) / 2 ; });


  edges_line.attr('d', function(d) {
      var path='M '+d.target.x+' '+d.target.y+' L '+ d.source.x +' '+d.source.y;
      return path;
  });

  edges_text.attr('transform',function(d,i){
        if (d.source.x<d.target.x){
            bbox = this.getBBox();
            rx = bbox.x+bbox.width/2;
            ry = bbox.y+bbox.height/2;
            return 'rotate(180 '+rx+' '+ry+')';
        }
        else {
            return 'rotate(0)';
        }
   });
}

//设置连接线的坐标,使用椭圆弧路径段双向编码
function linkArc(d) {
    //var dx = d.target.x - d.source.x,
  // dy = d.target.y - d.source.y,
     // dr = Math.sqrt(dx * dx + dy * dy);
  //return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
  //打点path格式是：Msource.x,source.yArr00,1target.x,target.y

  return 'M '+d.target.x+' '+d.target.y+' L '+ d.source.x +' '+d.source.y
}
//设置圆圈和文字的坐标
function transform1(d) {
  return "translate(" + d.x + "," + d.y + ")";
}
function transform2(d) {
      return "translate(" + (d.x) + "," + d.y + ")";
}


	function mouseover() {
	  d3.select(this).select("circle").transition()
		  .duration(750)
		  .attr("r", function(d){  //设置圆点半径
		return radius(d)+10;
	 }) ;
	}

	function mouseout() {
	  d3.select(this).select("circle").transition()
		  .duration(750)
		  .attr("r", function(d){  //恢复圆点半径
		return radius(d);
	 }) ;
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
    function unescapeHTML (a){
        return a.replace(/&lt;|&#60;/g, "<").replace(/&gt;|&#62;/g, ">").replace(/&amp;|&#38;/g, "&").replace(/*/&quot;|*//&#34;/g, '"').replace(/&apos;|&#39;/g, "'");
    }

}
