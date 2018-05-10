function force_opinion(links){                                      
	var nodes = {};                                                   
	var links_backup=deepCopy(links);														  
	//(2)从链接中分离出不同的节点      
	//一个小问题：节点的weight属性怎么产生的？               
	links.forEach(function(link) {  //思路就是：在连接中遍历链接，节点数组有了这个链接的源节点就把链接指向这个节点。没有的话把链接上的节点加到链接数组指定名称name属性，并把链接指向这个节点
	//console.log(nodes);                                  
	  link.source = nodes[link.source] //link.sourc就是节点值比如Apple
	  || (nodes[link.source] = {name: link.source});//(填加节点数据)
	  
	  link.target = nodes[link.target] || (nodes[link.target] = {name: link.target, polar: link.polar});
	});

	var width = 1500,
		height = 1500;

	var force1 = d3.layout.force()
		.nodes(d3.values(nodes))
		.links(links)
		.size([width, height])
		.linkDistance(30)
		.charge(-1500)
		.on("tick", tick)
		.start();

	var svg = d3.select("body").append("svg")
		.attr("width", width)
		.attr("height", height);
	//(3)为链接添加线
	var link = svg.selectAll(".link")
		.data(force1.links())
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
			return d3.rgb(0,191,255);//属性词用蓝色
		}  
	//	return colors(d.color);  
	})  
	.style("stroke-width",function(d,i){//设置线的宽度  
		return d.weight;  
	});
	//(4)为链接添加节点
	var node = svg.selectAll(".node")
		.data(force1.nodes())
	  .enter().append("g")
		.attr("class", "node")
		.on("mouseover", mouseover)
		.on("mouseout", mouseout)
		.call(force1.drag);

											   
											   
	//设置圆点的半径，圆点的度越大weight属性值越大，可以对其做一点数学变换                             
	function  radius (d){ 
	if(!d.weight){//节点weight属性没有值初始化为1（一般就是叶子了）
	d.weight=10;
	}                                              
		return 20;//Math.log(d.weight)*20;                                   
	}                                                                   
	node.append("circle")
		.attr("r",function(d){  //设置圆点半径                      
		return radius (d);                          
	 })                                           
	.style("fill",function(d){ //设置圆点的颜色   
		if ("polar" in d){
			return d3.rgb(205,193,197);//描述词用淡紫红色
		}
		else{
			return d3.rgb(0,191,255);//属性词用蓝色
		}
	}) 
	.on("dblclick",function(d){
		var backup2=deepCopy(links_backup);
		opinion_pair_detail(backup2,d.name,Math.floor(10000*Math.random()))
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