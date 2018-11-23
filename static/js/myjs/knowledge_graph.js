function knowledge_graph(product, path) {
    var center_trans_duration_time = 1000;
    var mouse_hold_time_befor_center_trans = 2000;
    var node_zoom_duration_time = 500;
    var TimeOut;
    var index = 0;//记录结点编号
    var blink_time = 1000;//应等于css中Link类动画时间的两倍
    var blink_count = 2;//闪烁次数
    var default_children_num = 5;//展开结点时默认最大结点数


    //数据

    loadJS(path + "/" + product + ".js");
    var children_nodes = JSON.parse(unescapeHTML(partial_graph));
    var root = {
        name: product,
        children: children_nodes,
        type: "root"
    };

//----------svg 树形图----------//
    //定义边界W
    var width = 600;
    var height = 600;
    var line_color = "#778899";
    var line_blink_color = "#00008B";
    var marge = {top: 0, bottom: 0, left: 0, right: 0};
    var center = {x: (width - marge.left - marge.right) / 2, y: (height - marge.top - marge.bottom) / 2};
    var valid_size = Math.min(height - marge.top - marge.bottom, width - marge.left - marge.right);
    var zoom_factor = 1;
    var max_zoom_factor = 5;
    var min_zoom_factor = 0.01;
    var animation_start = [0, 0, valid_size / zoom_factor];
    var animation_end = [0, 0, valid_size / zoom_factor];

    var nodeHeight = 20, childIndent = 20;
    var collapse_duration = 250;

    d3.selectAll(".svg_graph").data([]).exit().remove();
    d3.selectAll(".treelist").data([]).exit().remove();
    var svg = d3.select("#svg_div").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class","svg_graph")
        .on("mousewheel DOMMouseScroll", svgZoom)
        // .attr("pointer-events","bounding-box")
        .on("mouseenter", LockBodyScroll)
        .on("mouseleave", UnlockBodyScroll)
        .append("g")
        .attr("transform", "translate(" + center.x + "," + center.y + ")")
        .call(zoom_transition, animation_start, animation_end);
    var ul = d3.select("#ul_div").append("ul").classed("treelist", "true").style("position", "relative");
    //创建一个hierarchy layout
    var hierarchyData = d3.hierarchy(root)
        .sum(function (d) {
            return d.value;
        });
    //创建一个树状图
    var tree = d3.tree()
    //        .size([width - 400, height - 200]) //水平树
        .size([2 * Math.PI, valid_size / 2])//径向树
        // .nodeSize([2,200])
        .separation(function (a, b) {
            return (a.parent == b.parent ? 1 : 2) / a.depth;
        });
    //初始化树状图，也就是传入数据,并得到绘制树基本数据
    var treeData = tree(hierarchyData);
    hideChildren(treeData, default_children_num);
    setLayout();//自定义布局
    //创建一个贝塞尔生成曲线生成器
    var Bezier_curve_generator = d3.linkHorizontal()
        .x(function (d) {
            return d.y;
        })
        .y(function (d) {
            return d.x;
        });
    //绘制边
    var links = treeData.links();
    svg
        .selectAll(".link")
        .data(links, function (d) {
            return d.target.idNo;
        })
        .enter()
        .append("path")
        // .attr("class", "link")
        .classed("link", linkCssClass)
        .attr("d", draw_path);
    // .attr("fill", "none")
    // .attr("stroke", line_color)
    // .attr("stroke-width", 1);
    //得到节点
    var nodes = treeData.descendants();
    // node.x0,y0 记录原来的位置（for animation）
    nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
        // d.top0 = d.top;
        // d.left0 = d.left;
    });
    //绘制节点和文字
    var gs = svg//.append("g")
        .selectAll(".node")
        //添加id是为了区分是否冗余的节点
        .data(nodes, function (d) {
            return d.idNo || (d.idNo = ++index);
        })
        //        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", node_transform)
        .on("click", nodeClick)
        .on("mouseover", nodeMouseOver)
        .on("mouseenter", nodeMouseEnter)
        .on("mouseleave", nodeMouseLeave);
    //绘制节点
    // gs.append("circle")
    //     .attr("r", radius)
    //     .attr("fill", "none")
    //     .attr("stroke", "blue")
    //     .attr("stroke-width", 1);
    gs.append("path")
        .attr("d", d3.symbol().size(nodeShapeSize).type(nodeShape))
        .classed("shape", shapeCssClass);
    // .style("fill", "steelblue")
    // .style("stroke", "white")
    // .style("stroke-width", "1.5px")

    //文字
    gs.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", text_transform)
        // .attr("x", text_x)
        // .attr("y", text_y)
        .text(function (d) {
            return d.data.name;
        })
        .attr("dx", text_dx)
        .attr("dy", text_dy)
        .style("font-size", font_size);

    var ul_nodes = ul.selectAll("li.node_list").data(nodes).enter().append("li").classed("node_list", true)
    // .style("padding-top", padding_top)
    // .style("padding-left", padding_left)
        .style("top", padding_top)
        .style("left", padding_left)
        .style("opacity", 1)
        .style("height", nodeHeight + "px")
        .on("click", nodeClick)
        .on("mouseenter", nodeMouseEnter)
        .on("mouseleave", nodeMouseLeave);
    // icon for the '>' at left
    ul_nodes
        .append("span")
        .attr("class", caret_icon);
    // icon for the figures at left
    ul_nodes
        .append("span").attr("class", figure_icon);
    //texts in the ul
    ul_nodes
        .append("span").attr("class", "filename")
        .html(function (d) {
            return d.data.name;
        });

//----------ul 层次列表----------//


    function nodeClick(d) {
        if (d.data.type == "group" || d.data.type == "root") {
            // 可展开结点或根结点，单击进行折叠/展开操作
            if (d.children) {
                d._children = d.children;
                d.children = null;
                update(d);
                animationToCenter(d.parent);
            }
            else {
                d.children = d._children;
                d._children = null;
                update(d);
                animationToCenter(d);
            }
        }
        else if (d.data.type == "expand") {
            expandHiddenChildren(d.parent, default_children_num);
            update(d.parent);
            animationToCenter(d.parent);
        }
        else if (d.data.type == "entity_synonym" || d.data.type == "attribute_synonym") {
            // 点击synonym结点不进行任何操作
            return;
        }
        else {
            // 叶子结点点击切换到该结点详细信息
            d.x = 0;
            d.y = 0;
            loadJS(path + "/" + d.data.name + '.js');
            children_nodes = JSON.parse(unescapeHTML(partial_graph));
            root = {name: d.data.name, children: children_nodes, type: "root"};
//            root.children.push({name: "test"});
            var hierarchyData = d3.hierarchy(root)
                .sum(function (d) {
                    return d.value;
                });
            treeData = tree(hierarchyData);
            hideChildren(treeData);
            setLayout();
            var nodes = treeData.descendants();
            // node.x0,y0 记录原来的位置（for animation）
            nodes.forEach(function (d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
            update(d);
            animationToCenter(treeData);
        }
    }

    function nodeMouseOver(d) {
    }

    function nodeMouseEnter(node) {
        TimeOut = setTimeout(function () {
            animationToCenter(node);
            if (node.children) {
                // related link blinking
                svg.selectAll("path.link").filter(function (d) {
                    return d.source.idNo == node.idNo;
                }).call(LinkBlinking);
                //children blinking
                // if(node.children[0].data.type=="group")
                d3.selectAll("g.node").filter(function (d) {
                    // if(d.data.type!="group")
                    //     return 0;
                    return d.parent && d.parent.idNo == node.idNo;
                }).call(NodeBlinking);
            }
        }, mouse_hold_time_befor_center_trans);
        d3.selectAll("g.node").filter(function (d) {
            return d.idNo == node.idNo;
        }).call(NodeZoomIn, node_zoom_duration_time);
        ul.selectAll("li.node_list").filter(function (d) {
            return d.idNo == node.idNo;
        }).classed("selected", true);
    }

    function nodeMouseLeave(node) {
        clearTimeout(TimeOut);
        d3.selectAll("g.node").filter(function (d) {
            return d.idNo == node.idNo;
        }).call(NodeZoomOut, node_zoom_duration_time);
        ul.selectAll("li.node_list").filter(function (d) {
            return d.idNo == node.idNo;
        }).classed("selected", false);
    }

    function animationToCenter(node) {
        // animations to center at the node
        // animation_end[2] = valid_size / zoom_factor / (node.depth + 1);
        zoom_factor = 1;
        var visualSize;
        if (node.data.type != "group" && node.data.type != "root")
            visualSize = node.space * 10;
        else {
            var extra_space = 0;
            for (i in node.children) {
                if (/*node.children[i].data.type == "group" && */node.children[i].space > extra_space)
                    extra_space = node.children[i].space;
            }
            visualSize = node.space + extra_space;
        }
        animation_end[2] = visualSize / zoom_factor;
        animation_end[1] = node.y * Math.cos(node.x);
        animation_end[0] = node.y * Math.sin(node.x);
        if (animation_start[0] != animation_end[0] || animation_start[1] != animation_end[1] || animation_start[2] != animation_end[2]) {
            zoom_transition(svg, animation_start, animation_end, 0, center_trans_duration_time);
            // animation_start[2] = valid_size / zoom_factor / (node.depth + 1);
            animation_start[2] = visualSize / zoom_factor;
            animation_start[1] = node.y * Math.cos(node.x);
            animation_start[0] = node.y * Math.sin(node.x);
        }
    }

    function LockBodyScroll() {
        document.body.style.overflow = 'hidden';
    }

    function UnlockBodyScroll() {
        document.body.style.overflow = 'visible';
    }

    //更新显示

    function update(source) {

//取得现有的节点数据,因为设置了Children属性，没有Children的节点将被删除
        setLayout();
        var nodes = treeData.descendants().reverse();
        var links = treeData.links();

//        var nodes = tree.nodes(root).reverse();
//
//        var links = tree.links(nodes);
        //为链接更新数据

        var link = svg.selectAll("path.link").data(links, function (d) {
            return d.target.idNo;
        });

//更新链接
        linkEnter = link.enter()
            .append("path")
            // .attr("class", "link")
            .classed("link", linkCssClass)
            .attr("d", function (d) {
                var o = {x: source.x, y: source.y}
                return draw_path({source: o, target: o})
            });
        // .attr("fill", "none")
        // .attr("stroke", line_color)
        // .attr("stroke-width", 1);

        link.transition()
            .duration(center_trans_duration_time)
            .attr("d", draw_path);
        linkEnter.transition()
            .duration(center_trans_duration_time)
            .attr("d", draw_path);

//移除无用的链接
        link.exit()
            .transition()
            .duration(center_trans_duration_time)
            .attr("d", function (d) {
                var o = {x: source.x, y: source.y}
                return draw_path({source: o, target: o})
            })
            .remove();


//为节点更新数据
        var graph_nodes = svg.selectAll("g.node")
            .data(nodes, function (d) {
                return d.idNo || (d.idNo = ++index);
            });
        graph_nodes.selectAll("text")
            .attr("transform", text_transform)
            .text(function (d) {
                return d.data.name;
            })
            .attr("dx", text_dx)
            .attr("dy", text_dy)
            .style("font-size", font_size);
        // graph_nodes.selectAll("circle")
        //     .attr("r", radius);
        graph_nodes.selectAll("path")
            .attr("d", d3.symbol().size(nodeShapeSize).type(nodeShape));

        var nodeEnter = graph_nodes
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return node_origin_transform(source);
            })
            .on("click", nodeClick)
            .on("mouseover", nodeMouseOver)
            .on("mouseenter", nodeMouseEnter)
            .on("mouseleave", nodeMouseLeave);

        //绘制节点
        // nodeEnter.append("circle")
        //     .attr("r", radius)
        //     .attr("fill", "none")
        //     .attr("stroke", "blue")
        //     .attr("stroke-width", 1);
        nodeEnter.append("path")
            .attr("d", d3.symbol().size(nodeShapeSize).type(nodeShape))
            .classed("shape", shapeCssClass);
        //文字
        nodeEnter.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", text_transform)
            // .attr("x", text_x)
            // .attr("y", text_y)
            .text(function (d) {
                return d.data.name;
            })
            .attr("dx", text_dx)
            .attr("dy", text_dy)
            .style("font-size", font_size);
        //节点动画
        var nodeUpdate = graph_nodes.transition()
            .duration(center_trans_duration_time)
            .attr("transform", node_transform);
        nodeEnter.transition()
            .duration(center_trans_duration_time)
            .attr("transform", node_transform);
        //将无用的子节点删除
        var nodeExit = graph_nodes.exit()
            .transition()
            .duration(center_trans_duration_time)
            .attr("transform", function (d) {
                return node_transform(source);
            })
            .remove();

// 更新列表
        function isChildOfSource(child) {
            var c = child;
            while (c.parent) {
                if (c.parent.id == source.id)
                    return true;
                else
                    c = c.parent;
            }
            return false;
        }

        var ul_nodes = ul.selectAll("li.node_list").data(nodes, function (d) {
            return d.idNo || (d.idNo = ++index);
        });
        ul_nodes.selectAll("span.filename")
            .html(function (d) {
                return d.data.name;
            });
        var ul_enter = ul_nodes.enter().append("li").classed("node_list", true)
            .style("top", function (d) {
                if (isChildOfSource(d))
                    return padding_top(source);
                else
                    return padding_top(d);
            })
            .style("left", padding_left)
            .style("opacity", function (d) {
                return opacity(d, source);
            })
            .style("height", nodeHeight + "px")
            .on("click", nodeClick)
            .on("mouseenter", nodeMouseEnter)
            .on("mouseleave", nodeMouseLeave);
        // icon for the '>' at left
        ul_enter
            .append("span")
            .attr("class", caret_icon);
        // icon for the figures at left
        ul_enter
            .append("span").attr("class", figure_icon);
        //texts in the ul
        ul_enter
            .append("span").attr("class", "filename")
            .html(function (d) {
                return d.data.name;
            });
        //update position with transition
        ul_nodes.transition().duration(collapse_duration)
            .style("top", padding_top)
            .style("left", padding_left)
            .style("opacity", 1);
        ul_enter
            .transition().duration(collapse_duration)
            .style("top", padding_top)
            .style("left", padding_left)
            .style("opacity", 1);
        ul_nodes.exit().remove();

//记录下当前位置,为下次动画记录初始值
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
            // d.top0 = d.top;
            // d.left0 = d.left;
        });

    }

    function draw_path(d) {
        var start = {x: d.source.y * Math.cos(d.source.x), y: d.source.y * Math.sin(d.source.x)}
        var end = {x: d.target.y * Math.cos(d.target.x), y: d.target.y * Math.sin(d.target.x)}
//            var start = {x: d.source.x, y: d.source.y};
//            var end = {x: d.target.x, y: d.target.y};
        return Bezier_curve_generator({source: start, target: end});
    }

    function node_transform(d) {
        var cx = d.y * Math.cos(d.x);
        var cy = d.y * Math.sin(d.x);
//            var cx = d.x;
//            var cy = d.y;
        return "translate(" + cy + "," + cx + ")";
    }

    function node_origin_transform(d) {
        var cx = d.y0 * Math.cos(d.x0)
        var cy = d.y0 * Math.sin(d.x0)
//            var cx = d.x0;
//            var cy = d.y0;
        return "translate(" + cy + "," + cx + ")";
    }

    function font_size(d) {
        return text_size(d).toString() + "px";
    }

    function font_size_focus(d) {
        return (2 * text_size(d)).toString() + "px";
    }

    function text_size(d) {
        // if (d.data.type == "group" || d.data.type == "root")
        //     return radius(d) / 2;
        // else
        var text_len = d.data.name.length;
        if (text_len > 3)
            return radius(d);
        else
            return radius(d) * 2;
    }

    function radius(d) {
        if (d.data.type != "group" && d.data.type != "root") {
            var cousinNum = d.parent.children.length
            if (cousinNum > default_children_num + 1)
                return 50 * (default_children_num + 1) / cousinNum;
            return 50;
        }
        else
            return 120 - 5 * d.depth;
    }

    function text_transform(d) {
        var angel;
        if (d.data.type == "group" || d.data.type == "root")
            angel = 0;
        else {
            var related_angel = angel_ralated_to_parent(d);
            if (Math.abs(related_angel) < Math.PI / 2)
                angel = -related_angel / Math.PI * 180;//-90;
            else
                angel = 180 - related_angel / Math.PI * 180;//+90;
            // if (d.x > Math.PI / 2 && d.x < Math.PI * 3 / 2)
            //     angel = 180 - d.x / Math.PI * 180;
            // else
            //     angel = -d.x / Math.PI * 180;
        }
        return "translate(" + text_x(d) + "," + text_y(d) + ") rotate(" + angel + ")";
    }

    function angel_ralated_to_parent(d) {
        if (!d.parent)
            return 0;
        var related_orgin = {x: d.parent.y * Math.cos(d.parent.x), y: d.parent.y * Math.sin(d.parent.x)};
        var absolute_axis = {x: d.y * Math.cos(d.x), y: d.y * Math.sin(d.x)};
        var related_axis = {x: absolute_axis.x - related_orgin.x, y: absolute_axis.y - related_orgin.y};
        var angel = Math.atan2(related_axis.y, related_axis.x);
        return angel;
    }

    function text_x(d) {
        // if (d.data.type == "group" || d.data.type == "root")
        return 0;
        // var related_angel = angel_ralated_to_parent(d);
        // if (Math.abs(related_angel) > Math.PI / 2)
        //     return 2 * radius(d) * Math.sin(related_angel);
        // else
        //     return (text_size(d) / 2 + 2 * radius(d)) * Math.sin(related_angel);
    }

    function text_y(d) {
        // if (d.data.type == "group" || d.data.type == "root")
        return 0;
        // var related_angel = angel_ralated_to_parent(d);
        // if (Math.abs(related_angel) > Math.PI / 2)
        //     return 2 * radius(d) * Math.cos(related_angel);
        // else
        //     return (text_size(d) / 2 + 2 * radius(d)) * Math.cos(related_angel);
    }

    function text_dy(d) {
        // if (d.data.type == "group" || d.data.type == "root")
        return text_size(d) / 2;
        // else {
        //     return 0;
        //     var related_angel = angel_ralated_to_parent(d);
        //     return text_size(d) / 2 * Math.sin(related_angel);
        // }
    }

    function text_dx(d) {
        // if (d.data.type == "group" || d.data.type == "root")
        return 0;
        // else {
        //     return 0;
        //     var related_angel = angel_ralated_to_parent(d);
        //     return text_size(d) / 2 * Math.cos(related_angel);
        // }

    }

    function padding_top(d) {
        // return "20px";
        return d.top + "px";
    }

    function padding_left(d) {
        return d.left + "px";
    }

    function zoom_transition(svg, start, end, time_delay=0, time_duration=null) {
        var i = d3.interpolateZoom(start, end);
        if (time_duration == null)
            time_duration = 2 * i.duration;
        svg
            .attr("transform", transform(start))
            .transition()
            .delay(time_delay)
            .duration(time_duration)
            .attrTween("transform", function () {
                return function (t) {
                    return transform(i(t));
                };
            })
        ;//.on("end", function() { d3.select(this).call(transition, end, start); });
        function transform(p) {
            var k = valid_size / p[2];
            return "translate(" + (center.x - p[0] * k) + "," + (center.y - p[1] * k) + ")scale(" + k + ")";
        }
    }

    function svgZoom() {
        var delta = (d3.event.wheelDelta && (d3.event.wheelDelta > 0 ? 1 : -1)) ||  // chrome & ie
            (d3.event.detail && (d3.event.detail > 0 ? -1 : 1));              // firefox
        if (delta > 0 && zoom_factor < max_zoom_factor) {
            // 前滚 放大
            var new_zoom_factor = Math.min(max_zoom_factor, zoom_factor * 1.5);
            animation_end[2] = animation_end[2] * zoom_factor / new_zoom_factor;
            zoom_transition(svg, animation_start, animation_end, 0, 0);
            animation_start[2] = animation_end[2];
            zoom_factor = new_zoom_factor;
        } else if (delta < 0 && zoom_factor > min_zoom_factor) {
            // 后滚 缩小
            var new_zoom_factor = Math.max(min_zoom_factor, zoom_factor / 1.5);
            animation_end[2] = animation_end[2] * zoom_factor / new_zoom_factor;
            zoom_transition(svg, animation_start, animation_end, 0, 0);
            animation_start[2] = animation_end[2];
            zoom_factor = new_zoom_factor;
        }
    }

    function LinkBlinking(d) {
        d.classed("link", function () {
            this.classList.toggle("blink");
            return true;
        });
        var blinkInterval;
        blinkInterval = setInterval(function () {
            d.classed("link", function () {
                this.classList.toggle("blink");
                return true;
            });
        }, blink_time / 2);
        var blinkTimeOut = setTimeout(function () {
            clearInterval(blinkInterval)
        }, (blink_count - 0.5) * blink_time + 50);
    }


    function NodeZoomIn(d, durationTime) {
        // var circle = d.select("circle");
        // circle
        //     .transition()
        //     .duration(durationTime)
        //     .attr("r", function (d) {
        //         return 2 * radius(d);
        //     })
        //     .attr("fill", circle.attr("stroke"));
        d.select("path")
            .classed("shape", function () {
                this.classList.toggle("selectedNode");
                return true;
            })
            .transition(durationTime)
            .attr("d", d3.symbol().size(function (d) {
                return 4 * nodeShapeSize(d);
            }).type(nodeShape));

        d.select("text")
            .transition()
            .duration(durationTime)
            .attr("dx", function (d) {
                return 2 * text_dx(d);
            })
            .attr("dy", function (d) {
                return 2 * text_dy(d);
            })
            .style("font-size", font_size_focus)
            .style("font-style", "bold");
    }

    function NodeZoomOut(d, durationTime) {
        // var circle = d.select("circle")
        //     .transition()
        //     .duration(durationTime)
        //     .attr("r", radius)
        //     .transition()
        //     // .duration(0)
        //     .attr("fill", "none");
        d.select("path")
            .classed("shape", function () {
                this.classList.toggle("selectedNode");
                return true;
            })
            .transition(durationTime)
            .attr("d", d3.symbol().size(nodeShapeSize).type(nodeShape));

        d.select("text")
            .transition()
            .duration(durationTime)
            .attr("dx", text_dx)
            .attr("dy", text_dy)
            .style("font-size", font_size)
            .style("font-style", "normal");
    }

    function NodeBlinking(d) {
        NodeZoomIn(d, blink_time / 2);
        var i = 0;
        var interval = setInterval(function () {
            if (i % 2 == 1)
                NodeZoomIn(d, blink_time / 2);
            else
                NodeZoomOut(d, blink_time / 2);
            i++;
        }, blink_time / 2);
        setTimeout(function () {
            clearInterval(interval);
        }, (blink_count - 0.5) * blink_time + 50);
        // var circle = d.select("circle");
        // circle
        //     .transition()
        //     .duration(blink_time)
        //     .attr("r", function (d) {
        //         return 2 * radius(d);
        //     })
        //     .attr("fill", circle.attr("stroke"))
        //     .transition()
        //     .duration(blink_time)
        //     .attr("r", function (d) {
        //         return radius(d);
        //     })
        //     .transition()
        //     .duration(0)
        //     .attr("fill", "none");
        // d.select("text")
        //     .transition()
        //     .duration(blink_time)
        //     .attr("dx", function (d) {
        //         return 2 * text_dx(d);
        //     })
        //     .attr("dy", function (d) {
        //         return 2 * text_dy(d);
        //     })
        //     .style("font-size", font_size_focus)
        //     .style("font-style", "bold")
        //     .transition()
        //     .duration(blink_time)
        //     .attr("dx", text_dx)
        //     .attr("dy", text_dy)
        //     .style("font-size", font_size)
        //     .style("font-style", "normal");
    }


    function setLayout() {
        // 更改布局结构
        spaceOfNode(treeData);
        setChildrenAxis(treeData);
        setListAxis(treeData);
    }

    function hideChildren(root, maxChildNum) {
        if (!maxChildNum)
            maxChildNum = default_children_num
        var children = root.children;
        if (!children)
            children = root._children;
        if (!children)
            return;
        for (i in children)
            hideChildren(children[i], maxChildNum)
        var hiddenChildNum = children.length - maxChildNum;
        if (hiddenChildNum <= 1)
            return;
        var expandNode = {
            data: {name: "show " + hiddenChildNum + " more", type: "expand"},
            height: 0,
            depth: root.depth + 1,
            value: 0,
            parent: root
        };
        root.hiddenChildren = children.splice(maxChildNum, hiddenChildNum);
        children.splice(0, 0, expandNode);
        return;
    }

    function expandHiddenChildren(root, maxChildNum) {
        if (!root.children || !root.children[0].data.type == "expand")
            return;
        if (!maxChildNum)
            maxChildNum = default_children_num;
        var children = root.children;
        if (root.hiddenChildren) {
            children[0].data.name = "remain only " + maxChildNum;
            root.children = children.concat(root.hiddenChildren);
            root.hiddenChildren = null;
        }
        else {
            var hiddenChildNum = children.length - maxChildNum - 1;
            root.children[0].data.name = "show" + hiddenChildNum + "more";
            root.hiddenChildren = children.splice(maxChildNum + 1, hiddenChildNum)
        }
    }

    /*  紧凑型布局使用这两个函数 */
    function spaceOfNode(d) {
        var space;
        if (!d.children)
            space = 4 * radius(d);
        else {
            var i;
            space = 0;
            var extra_space = 0;
            for (i in d.children) {
                space = space + spaceOfNode(d.children[i]);
                // if (d.children[i].data.type == "group")
                //     space = space + 8 *
                if (d.children[i].space > extra_space)
                    extra_space = d.children[i].space;
            }
            space = space / Math.PI + extra_space;
            var space_min = 10 * radius(d);
            if (space < space_min)
                space = space_min;
        }
        d.space = space;
        return space;
    }

    function setChildrenAxis(d) {
        if (!d.children)
            return;
        var i;
        var related_origin = {x: d.y * Math.cos(d.x), y: d.y * Math.sin(d.x)};
        var angel = 0;
        var total_children_space = 0;
        for (i in d.children) {
            total_children_space = total_children_space + d.children[i].space;
        }

        for (i in d.children) {

            angel = angel + d.children[i].space / total_children_space * Math.PI;

            var related_axis = {
                x: d.space / 2 * Math.cos(angel),
                y: d.space / 2 * Math.sin(angel)
            };
            var absolute_axis = {x: related_origin.x + related_axis.x, y: related_origin.y + related_axis.y};
            var r = Math.sqrt(absolute_axis.x * absolute_axis.x + absolute_axis.y * absolute_axis.y);
            d.children[i].x = Math.atan2(absolute_axis.y, absolute_axis.x);
            d.children[i].y = r;
            angel = angel + d.children[i].space / total_children_space * Math.PI;
            setChildrenAxis(d.children[i]);
        }
    }

    /* 开放型布局使用这两个函数*/
    // function spaceOfNode(d) {
    //     var space;
    //     if (!d.children)
    //         space = 4 * radius(d);
    //     else {
    //         var i;
    //         var max_child_space = 0;
    //         for (i in d.children) {
    //             var child_space = spaceOfNode(d.children[i]);
    //             if (child_space > max_child_space)
    //                 max_child_space = child_space;
    //         }
    //         space = max_child_space * d.children.length / Math.PI;
    //         var space_min = 10 * radius(d);
    //         if (space < space_min)
    //             space = space_min;
    //     }
    //     d.space = space;
    //     return space;
    // }
    //
    // function setChildrenAxis(d) {
    //     if (!d.children)
    //         return;
    //     var i;
    //     var related_origin = {x: d.y * Math.cos(d.x), y: d.y * Math.sin(d.x)};
    //     var angel = 0;
    //     var child_space = d.space * Math.PI / d.children.length;
    //     for (i in d.children) {
    //         angel = angel + child_space / d.space;
    //         var extra_space = 0;
    //         if (d.children[i].data.type == "group")
    //             extra_space = 2 * radius(d);
    //         var related_axis = {
    //             x: (extra_space + d.space / 2) * Math.cos(angel),
    //             y: (extra_space + d.space / 2) * Math.sin(angel)
    //         };
    //         var absolute_axis = {x: related_origin.x + related_axis.x, y: related_origin.y + related_axis.y};
    //         var r = Math.sqrt(absolute_axis.x * absolute_axis.x + absolute_axis.y * absolute_axis.y);
    //         d.children[i].x = Math.atan2(absolute_axis.y, absolute_axis.x);
    //         d.children[i].y = r;
    //         angel = angel + child_space / d.space;
    //         setChildrenAxis(d.children[i]);
    //     }
    // }

    function setListAxis(d, top=0) {
        // 设置用于tree list的top、left属性
        top = top + nodeHeight;
        d.top = top;
        d.left = d.parent ? d.parent.left + childIndent : 0;
        for (i in d.children) {
            top = setListAxis(d.children[i], top)
        }
        return top;
    }

    function nodeShape(node) {
        switch (node.data.type) {
            case "entity":
                ;
            case "entity_synonym":
                return d3.symbols[3];//square
            case "attribute":
                ;
            case "attribute_synonym":
                return d3.symbols[0];//circle
            case "expand":
                return d3.symbols[1];//cross
            case "group":
                return d3.symbols[6];// Y shape
            case "root":
                return d3.symbols[4];//star
            default:
                // descriptions
                return d3.symbols[2];//diamond
        }
    }

    function nodeShapeSize(node) {
        return 10 * Math.pow(radius(node), 2);
    }

    function shapeCssClass(node) {
        var nodeType = node.data.type;
        if (nodeType == "root" || nodeType == "group") {
            this.classList.add(nodeType + "Node")
            return true;
        }
        var parentName = node.parent.data.name;
        if (parentName.indexOf("positive") != -1 || parentName.indexOf("neutral") != -1 || parentName.indexOf("negative") != -1) {
            //sentiment nodes
            this.classList.add(parentName + "Node");
            return true;
        }
        if (parentName.indexOf("synonym") != -1) {
            // synonym nodes
            this.classList.add("synonymNode");
            return true;
        }
        if (parentName.indexOf("father") != -1 || parentName.indexOf("child") != -1) {
            // whole-part relationship node
            this.classList.add("wholePartNode");
            return true;
        }
        if (parentName.indexOf("entit") != -1 || parentName.indexOf("attribute") != -1) {
            // entity-attribute relationship node
            this.classList.add("entityAttributeNode");
            return true;
        }
    }

    function linkCssClass(link) {
        if (link.target.data.type == "group") {
            //normal links
            this.classList.add("trivialLink");
            return true;
        }
        var sourceName = link.source.data.name;
        if (sourceName.indexOf("positive") != -1 || sourceName.indexOf("neutral") != -1 || sourceName.indexOf("negative") != -1) {
            //sentiment links
            this.classList.add(sourceName + "Link");
            return true;
        }
        if (sourceName.indexOf("synonym") != -1) {
            // synonym links
            this.classList.add("synonymLink");
            return true;
        }
        if (sourceName.indexOf("father") != -1 || sourceName.indexOf("child") != -1) {
            // whole-part links
            this.classList.add("wholePartLink");
            return true;
        }
        if (sourceName.indexOf("entit") != -1 || sourceName.indexOf("attribute") != -1) {
            // entity-attribute links
            this.classList.add("entityAttributeLink");
            return true;
        }
        return true;
    }

    function caret_icon(d) {
        var icon = d.children ? " glyphicon-chevron-down"
            : d._children ? "glyphicon-chevron-right" : "";
        return "caret glyphicon " + icon;
    }

    function figure_icon(d) {
        var icon = d.data.children || d.data._children ? "glyphicon-folder-close"
            : "glyphicon-file";
        return "glyphicon " + icon;
    }

    function opacity(d, source) {
        if (!source || !d.parent)
            return 1;
        var p = d.parent;
        while (p) {
            if (p.idNo == source.idNo)
                return 0;
            else
                p = p.parent;
        }
        return 1;
    }
}