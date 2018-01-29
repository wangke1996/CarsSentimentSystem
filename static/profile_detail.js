function profile_detail(links_entity_attr,nodes_entity,name,id_no) {
    var nodes={};
    var new_links=new Array();
    var i=0;
    var entity;
    for(n in nodes_entity){
        if(n==name){
            entity=deepCopy(nodes_entity[n]);
            break;
        }
    }
    nodes[name]=entity;
    links_entity_attr.forEach(function(link){
        if (link.source == name) {
            new_links[i] = deepCopy(link);
            var attr={name:link.target,level:link.level,positive:link.positive,negative:link.negative,ordinary:link.ordinary};
            nodes[attr.name]=attr;
            new_links[i].source=entity;
            new_links[i].target=nodes[attr.name];
            i++;
        }
    });

    var width = 500,
        height = 500;

    var force = d3.layout.force()
        .nodes(d3.values(nodes))
        .links(new_links)
        .size([width, height])
        .linkDistance(100)
        .charge(-800)
        .on("tick", tick)
        .start();

    var svg = d3.select("body").append("svg")
        .attr("id","svg"+id_no.toString())
        .attr("width", width)
        .attr("height", height);
    //添加描述文字
    var title = name+"详细信息";
    var fontsize = 30;
    svg.append("text").text(title)
        .attr("class", "title")
        .attr("x", width / 2 - title.length * fontsize / 2)
        .attr("y", fontsize + 10)
        .attr("font-size", fontsize)
        .attr("font-family", "sans-serif")
        .attr("fill", "gray");
    //(3)为链接添加线
    var link = svg.selectAll(".link")
        .data(force.links())
        .enter().append("line")
        .attr("class", "link");

    var colors = d3.scale.category20();

    link.style("stroke", d3.rgb(0, 191, 255))
        .style("stroke-width", 3);
    //(4)为链接添加节点
    var node = svg.selectAll(".node")
        .data(force.nodes())
        .enter().append("g")
        .attr("class", "node")
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .call(force.drag)
        .on("dblclick",function(d) {
            if (d.name == name) {
                var svg_id = document.getElementById("svg" + id_no.toString());
                svg_id.parentNode.removeChild(svg_id);
            }
        });
    var arc = node.selectAll("g.arc").data(function (d) {
        return d3.layout.pie([d.positive, d.negative, d.ordinary])([d.positive, d.negative, d.ordinary])
    }).enter()
        .append("g").attr("class", "arc")
        .append("path").attr("fill", function (d, i) {
            if (i == 0) {
                return d3.rgb(144, 238, 144); //正向描述用绿色
            }
            else if (i == 1) {
                return d3.rgb(220, 20, 60);//负向描述用红色
            }
            else {
                return d3.rgb(255, 165, 0);//中性描述用黄色
            }
        }).attr("d", d3.svg.arc().outerRadius(40).innerRadius(20));


    //设置圆点的半径
    function radius(d) {
        if(d.name==name) {
            return (5 - d.level) * 10;
        }
        else {
            return (4 - d.level) * 10;
        }
    }

    // node.append("circle")
    // 	.attr("r",function(d){  //设置圆点半径
    // 	return radius (d);
    //  })
    // .style("fill",function(d){
    // 	return colors(d.level*d.level*d.level)
    // })
    // .on("dblclick",function(d){
    // 	profile_detail(links_entity,links_entity_attr,nodes_entity,Math.floor(10000*Math.random()))
    // }) ;

    node.append("text")
        .attr("x", 0)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d.name;
        });

    function deepCopy(source) {
        var sourceCopy = source instanceof Array ? [] : {};
        for (var item in source) {
            sourceCopy[item] = typeof source[item] === 'object' ? deepCopy(source[item]) : source[item];
        }
        return sourceCopy;
    }

    function tick() {//打点更新坐标
        link
            .attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });

        node
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
        arc
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
    }

    function mouseover() {
        var debbbbug = "WTF";
        d3.select(this).select("circle").transition()
            .duration(750)
            .attr("r", function (d) {  //设置圆点半径
                return radius(d) + 10;
            });
    }

    function mouseout() {
        d3.select(this).select("circle").transition()
            .duration(750)
            .attr("r", function (d) {  //恢复圆点半径
                return radius(d);
            });
    }
}