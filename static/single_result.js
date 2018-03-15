function single_result(links_single_result){
	var links_single_result_backup=deepCopy(links_single_result);
	var nodes = {};                                                   
																	  
	//(2)从链接中分离出不同的节点
	links_single_result.forEach(function(link) {
		if(link.type=="ent_ent"){
			link.source = nodes[link.source] //link.sourc就是节点值比如Apple
				|| (nodes[link.source] = {name: link.source,level:link.level,type:"entity"});
			link.target = nodes[link.target]
				|| (nodes[link.target] = {name: link.target,level:link.level+1,type:"entity"});//(填加节点数据)
		}
		else if(link.type=="ent_attr"){
			link.source = nodes[link.source] //link.sourc就是节点值比如Apple
				|| (nodes[link.source] = {name: link.source,level:link.level,type:"entity"});
			link.target = nodes[link.target]
				|| (nodes[link.target] = {name: link.target,level:link.level+1,type:"attr"});//(填加节点数据)
		}
		else{
			link.source = nodes[link.source] //link.sourc就是节点值比如Apple
				|| (nodes[link.source] = {name: link.source,level:link.level,type:"attr"});
			link.target = nodes[link.target]
				||(nodes[link.target] = {name: link.target, level:link.level+1,type:"opinion",polar:link.polar})
		}

	});

	var width = 1000,
		height = 750;

	var force = d3.layout.force()
		.nodes(d3.values(nodes))
		.links(links_single_result)
		.size([width, height])
		.linkDistance(60)
		.charge(-800)
		.on("tick", tick)
		.start();

	var svg = d3.select("#single_box")//.select("body")
		.append("svg")
		.attr("id","svg1")
		.attr("width", width)
		.attr("height", height);
	//添加描述文字
	var title="评论涉及属性及评价";
	var fontsize=30;
	svg.append("text").text(title)
		.attr("class","title")
		.attr("x",width/2-title.length*fontsize/2)
		.attr("y",fontsize+10)
		.attr("font-size",fontsize)
		.attr("font-family","sans-serif")
		.attr("fill","gray");
	//(3)为链接添加线
	var link = svg.selectAll(".link")
		.data(force.links())
		.enter().append("line")
		.attr("class", "link");

	var colors=d3.scale.category20(); 
	   
	link.style("stroke",function(d){//  设置线的颜色
		if ("polar" in d){
			if(d.polar>0){
				return d3.rgb(144,238,144); //正向描述用绿色
			}
			else if(d.polar<0){
				return d3.rgb(220,20,60);//负向描述用红色
			}
			else{
				return d3.rgb(255,165,0);//中性描述用黄色
			}
		}
		else{
			return d3.rgb(0,191,255);//实体-属性连线用蓝色
		}
	})  
	.style("stroke-width",function(d,i){//设置线的宽度  
		return d.weight;  
	});
	//(4)为链接添加节点
	var node = svg.selectAll(".node")
		.data(force.nodes())
	  .enter().append("g")
		.attr("class", "node")
		.on("mouseover", mouseover)
		.on("mouseout", mouseout)
		.call(force.drag)
		;

											   
											   
	//设置圆点的半径，根据属性的level决定                          
	function  radius (d) {
        if (!d.weight) {//节点weight属性没有值初始化为1（一般就是叶子了）
            d.weight = 2;
        }
        if (d.type == "opinion") {
            return 40;
        }
        else {
            return (5 - d.level) * 10;
        }
    }
	node.append("circle")
		.attr("r",function(d){  //设置圆点半径                      
		return radius (d);                          
	 })                                           
	.style("fill",function(d){ //设置圆点的颜色
		if (d.type=="opinion") {
			if(d.polar>0){
				return d3.rgb(144,238,144); //正向描述用绿色
			}
			else if(d.polar<0){
				return d3.rgb(220,20,60);//负向描述用红色
			}
			else{
				return d3.rgb(255,165,0);//中性描述用黄色
			}
			// return d3.rgb(205, 193, 197);//描述词用淡紫红色
		}
		else if (d.type=="entity") {
			return colors(d.level * d.level * d.level);//实体颜色与实体关系图一致
		}
		else {
			return d3.rgb(0, 191, 255);//属性词用蓝色
		}
	});

	node.append("text")
		.attr("x", 0)
		.attr("dy", ".35em")
		.attr("text-anchor","middle")
		.text(function(d) { return d.name; });
		
	function deepCopy(source) {
    	var sourceCopy = source instanceof Array ? [] : {};
   		for (var item in source) {
        	sourceCopy[item] = typeof source[item] === 'object' ? deepCopy(source[item]) : source[item];
    	}
    	return sourceCopy;
	}

		
	function tick() {//打点更新坐标
	  link
		  .attr("x1", function(d) { return d.source.x; })
		  .attr("y1", function(d) { return d.source.y; })
		  .attr("x2", function(d) { return d.target.x; })
		  .attr("y2", function(d) { return d.target.y; });

	  node
		  .attr("transform", function(d) { 
				return "translate(" + d.x + "," + d.y + ")"; 
		  });
	}

	function mouseover() {
	  d3.select(this).select("circle").transition()
		  .duration(750)
		  .attr("r", function(d){  //设置圆点半径                      
		return radius (d)+10;                          
	 }) ;
	}

	function mouseout() {
	  d3.select(this).select("circle").transition()
		  .duration(750)
		  .attr("r", function(d){  //恢复圆点半径                      
		return radius (d);                          
	 }) ;
	}
}