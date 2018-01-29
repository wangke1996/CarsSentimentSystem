function force_aspect(links_opinion_pair,links_entity,links_entity_attr,links_entity_synonym,links_attr_synonym){
	var links_opinion_pair_backup=deepCopy(links_opinion_pair);
    var links_entity_backup=deepCopy(links_entity);
	var links_entity_attr_backup=deepCopy(links_entity_attr);
	var links_entity_synonym_backup=deepCopy(links_entity_synonym);
	var links_attr_synonym_backup=deepCopy(links_attr_synonym);
	var nodes = {};                                                   
																	  
	//(2)从链接中分离出不同的节点
	links_entity.forEach(function(link) {  //在连接中遍历链接，节点数组有了这个链接的源节点就把链接指向这个节点。没有的话把链接上的节点加到链接数组指定名称name属性，并把链接指向这个节点
	//console.log(nodes);                                  
	  link.source = nodes[link.source] //link.sourc就是节点值比如Apple
	  || (nodes[link.source] = {name: link.source,level:link.level});//(填加节点数据)
	  
	  link.target = nodes[link.target] || (nodes[link.target] = {name: link.target,level:link.level+1});
	});

	var width = 2000,
		height = 1000;

	var force = d3.layout.force()
		.nodes(d3.values(nodes))
		.links(links_entity)
		.size([width, height])
		.linkDistance(60)
		.charge(-800)
		.on("tick", tick)
		.start();

	var svg = d3.select("body").append("svg")
		.attr("id","svg1")
		.attr("width", width)
		.attr("height", height);
	//添加描述文字
	var title="汽车组成结构";
	var fontsize=50;
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
		return colors(d.color);  
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
	function  radius (d){ 
	if(!d.weight){//节点weight属性没有值初始化为1（一般就是叶子了）
	d.weight=2;
	}                                              
		return (5-d.level)*10;                                   
	}                                                                   
	node.append("circle")
		.attr("r",function(d){  //设置圆点半径                      
		return radius (d);                          
	 })                                           
	.style("fill",function(d){ //设置圆点的颜色          
		return colors(d.level*d.level*d.level);
	})
	.on("dblclick",function(d){
	//var svg1=document.getElementById("svg1");
	//svg1.parentNode.removeChild(svg1);
		var entity_backup2=deepCopy(links_entity_backup);
		var entity_attr_backup2=deepCopy(links_entity_attr_backup);
		var entity_attr_backup3=deepCopy(links_entity_attr_backup);
		var entity_synonym_backup2=deepCopy(links_entity_synonym_backup);
		var attr_synonym_backup2=deepCopy(links_attr_synonym_backup);
		var opinion_pair_backup2=deepCopy(links_opinion_pair_backup);
		aspect_detail(entity_backup2,d.name,d.level,Math.floor(10000*Math.random()))
		entity_detail(entity_attr_backup2,d.name,Math.floor(10000*Math.random()),"ent_attr");
		entity_detail(entity_synonym_backup2,d.name,Math.floor(10000*Math.random()),"ent_syn");
		entity_detail(attr_synonym_backup2,d.name,Math.floor(10000*Math.random()),"attr_syn");
		aspect_opinion_polarity(opinion_pair_backup2,entity_attr_backup3,d.name,Math.floor(10000*Math.random()));
	}) ;

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