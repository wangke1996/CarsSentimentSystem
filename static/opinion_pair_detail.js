function opinion_pair_detail(links,name,id_no){
    var links_backup=deepCopy(links);                                    
	var nodes = {};    
	var new_links=new Array();                                               
	var i=0;														  
	//(2)从链接中分离出不同的节点               
	links.forEach(function(link) { 
	//console.log(nodes);      
	if(link.source == name||link.target == name){
		new_links[i] = link;
		i=i+1;
		link.source = nodes[link.source] ||         
		(nodes[link.source] = {name: link.source});//(填加节点数据) 
		link.target = nodes[link.target] || (nodes[link.target] = {name: link.target,polar:link.polar});
	}
	});
	if(new_links.length===0){
		return;
	}
	//var new_links_backup=deepCopy(new_links);
	var width = 500,
		height = 500;

	var force = d3.layout.force()
		.nodes(d3.values(nodes))
		.links(new_links)
		.size([width, height])
		.linkDistance(60)
		.charge(-800)
		.on("tick", tick)
		.start();

	var svg = d3.select("body").append("svg")
		.attr("id","svg"+id_no.toString())
		.attr("width", width)
		.attr("height", height);
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
			return d3.rgb(0,191,255);//属性词用蓝色
		}  
	//	return colors(d.color);  
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

											   
											   
	//设置圆点的半径                    
	function  radius (d){ 
	if(!d.weight){//节点weight属性没有值初始化为1（一般就是叶子了）
	d.weight=1;
	}                                              
		return 20+d.weight*5;                                   
	}                                                                   
	node.append("circle")
		.attr("r",function(d){  //设置圆点半径                      
		return radius (d);                          
	 })                                           
	.style("fill",function(d){ //设置圆点的颜色     
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
	})
	.on("dblclick",function(d){
	if(d.name==name){
		var svg_id=document.getElementById("svg"+id_no.toString());
			svg_id.parentNode.removeChild(svg_id);
	}
	else{
		var backup2=deepCopy(links_backup);
		opinion_pair_detail(backup2,d.name,Math.floor(10000*Math.random()))
	}
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
		var debbbbug="WTF";
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