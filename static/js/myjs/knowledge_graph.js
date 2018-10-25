function knowledge_graph(product, path) {
    var center_trans_duration_time = 1000;
    var mouse_hold_time_befor_center_trans = 1000;
    var node_zoom_duration_time = 500;
    var TimeOut;
    var index = 0;//记录结点编号
    var blink_time = 1000;


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
    var marge = {top: 10, bottom: 10, left: 10, right: 10};
    var center = {x: (width - marge.left - marge.right) / 2, y: (height - marge.top - marge.bottom) / 2};
    var valid_size = Math.min(height - marge.top - marge.bottom, width - marge.left - marge.right);
    var zoom_factor = 1;
    var max_zoom_factor = 5;
    var min_zoom_factor = 0.01;
    var animation_start = [0, 0, valid_size / zoom_factor];
    var animation_end = [0, 0, valid_size / zoom_factor];
    var svg = d3.select("#svg_div").append("svg")
        .attr("width", width)
        .attr("height", height)
        .on("mousewheel DOMMouseScroll", svgZoom)
        // .attr("pointer-events","bounding-box")
        .on("mouseenter", LockBodyScroll)
        .on("mouseleave", UnlockBodyScroll)
        .append("g")
        .attr("transform", "translate(" + center.x + "," + center.y + ")")
        .call(zoom_transition, animation_start, animation_end);
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
        .attr("class", "link")
        .attr("d", draw_path)
        .attr("fill", "none")
        .attr("stroke", line_color)
        .attr("stroke-width", 1);
    //得到节点
    var nodes = treeData.descendants();
    // node.x0,y0 记录原来的位置（for animation）
    nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
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
    gs.append("circle")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 1);
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

//----------ul 层次列表----------//



    function nodeClick(d) {
        if (d.data.type == "group" || d.data.type == "root") {
            // 可展开结点或根结点，单击进行折叠/展开操作
            if (d.children) {
                d._children = d.children;
                d.children = null;
            }
            else {
                d.children = d._children;
                d._children = null;
            }
            update(d);
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
                }).call(NodeBlinking)
            }
        }, mouse_hold_time_befor_center_trans);
        d3.selectAll("g.node").filter(function (d) {
            return d.idNo == node.idNo;
        }).call(NodeZoomIn, node_zoom_duration_time);
    }

    function nodeMouseLeave(node) {
        clearTimeout(TimeOut);
        d3.selectAll("g.node").filter(function (d) {
            return d.idNo == node.idNo;
        }).call(NodeZoomOut, node_zoom_duration_time);
    }

    function animationToCenter(node) {
        // animations to center at the node
        // animation_end[2] = valid_size / zoom_factor / (node.depth + 1);
        var visualSize;
        if (node.data.type != "group" && node.data.type != "root")
            visualSize = node.space * 10;
        else {
            var extra_space = 0;
            for (i in node.children) {
                if (node.children[i].data.type == "group" && node.children[i].space > extra_space)
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
            .attr("class", "link")
            .attr("d", function (d) {
                var o = {x: source.x, y: source.y}
                return draw_path({source: o, target: o})
            })
            .attr("fill", "none")
            .attr("stroke", line_color)
            .attr("stroke-width", 1);

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
        var node = svg.selectAll("g.node")
            .data(nodes, function (d) {
                return d.idNo || (d.idNo = ++index);
            });
        var nodeEnter = node
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
        nodeEnter.append("circle")
            .attr("r", radius)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 1);
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
        var nodeUpdate = nodeEnter.transition()
            .duration(center_trans_duration_time)
            .attr("transform", node_transform);
        //将无用的子节点删除
        var nodeExit = node.exit()
            .transition()
            .duration(center_trans_duration_time)
            .attr("transform", function (d) {
                return node_transform(source);
            })
            .remove();
//记录下当前位置,为下次动画记录初始值
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
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
        if (d.data.type == "group" || d.data.type == "root")
            return radius(d) / 2;
        else
            return radius(d) * 2;
    }

    function radius(d) {
        if (d.data.type != "group" && d.data.type != "root")
            return 6;
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
        if (d.data.type == "group" || d.data.type == "root")
            return 0;
        var related_angel = angel_ralated_to_parent(d);
        if (Math.abs(related_angel) > Math.PI / 2)
            return 2 * radius(d) * Math.sin(related_angel);
        else
            return (text_size(d) / 2 + 2 * radius(d)) * Math.sin(related_angel);
        // if (d.x > Math.PI)
        //     return d.children ? 8 : -10;
        // else
        //     return d.children ? -10 : 8;
    }

    function text_y(d) {
        if (d.data.type == "group" || d.data.type == "root")
            return 0;
        var related_angel = angel_ralated_to_parent(d);
        if (Math.abs(related_angel) > Math.PI / 2)
            return 2 * radius(d) * Math.cos(related_angel);
        else
            return (text_size(d) / 2 + 2 * radius(d)) * Math.cos(related_angel);
        // if (d.x > Math.PI / 2 && d.x < Math.PI * 3 / 2)
        //     return d.children ? 20 : -10;
        // else
        //     return d.children ? -10 : 20;
    }

    function text_dy(d) {
        if (d.data.type == "group" || d.data.type == "root")
            return text_size(d) / 2;
        else {
            return 0;
            var related_angel = angel_ralated_to_parent(d);
            return text_size(d) / 2 * Math.sin(related_angel);
        }
    }

    function text_dx(d) {
        if (d.data.type == "group" || d.data.type == "root")
            return 0;
        else {
            return 0;
            var related_angel = angel_ralated_to_parent(d);
            return text_size(d) / 2 * Math.cos(related_angel);
        }

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
        d.transition()
            .duration(blink_time / 2)
            .attr("stroke", line_blink_color)
            .attr("stroke-width", 2)
            .transition()
            .duration(blink_time / 2)
            .attr("stroke", line_color)
            .attr("stroke-width", 1)
            .transition()
            .duration(blink_time / 2)
            .attr("stroke", line_blink_color)
            .attr("stroke-width", 2)
            .transition()
            .duration(blink_time / 2)
            .attr("stroke", line_color)
            .attr("stroke-width", 1);
    }

    function NodeZoomIn(d, durationTime) {
        var circle = d.select("circle");
        circle
            .transition()
            .duration(durationTime)
            .attr("r", function (d) {
                return 2 * radius(d);
            })
            .attr("fill", circle.attr("stroke"));
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
        var circle = d.select("circle")
            .transition()
            .duration(durationTime)
            .attr("r", radius)
            .transition()
            // .duration(0)
            .attr("fill", "none");
        d.select("text")
            .transition()
            .duration(durationTime)
            .attr("dx", text_dx)
            .attr("dy", text_dy)
            .style("font-size", font_size)
            .style("font-style", "normal");
    }

    function NodeBlinking(d) {
        var circle = d.select("circle");
        circle
            .transition()
            .duration(blink_time)
            .attr("r", function (d) {
                return 2 * radius(d);
            })
            .attr("fill", circle.attr("stroke"))
            .transition()
            .duration(blink_time)
            .attr("r", function (d) {
                return radius(d);
            })
            .transition()
            .duration(0)
            .attr("fill", "none");
        d.select("text")
            .transition()
            .duration(blink_time)
            .attr("dx", function (d) {
                return 2 * text_dx(d);
            })
            .attr("dy", function (d) {
                return 2 * text_dy(d);
            })
            .style("font-size", font_size_focus)
            .style("font-style", "bold")
            .transition()
            .duration(blink_time)
            .attr("dx", text_dx)
            .attr("dy", text_dy)
            .style("font-size", font_size)
            .style("font-style", "normal");
    }

    function setLayout() {
        // 更改布局结构
        spaceOfNode(treeData);
        setChildrenAxis(treeData);
    }


    /*  紧凑型布局使用这两个函数 */
    function spaceOfNode(d) {
        var space;
        if (!d.children)
            space = 4 * radius(d);
        else {
            var i;
            space = 0;
            for (i in d.children)
                space = space + spaceOfNode(d.children[i]);
            space = space / Math.PI;
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
            var extra_space = 0;
            if (d.children[i].data.type == "group")
                extra_space = 2 * radius(d);
            var related_axis = {
                x: (extra_space + d.space / 2) * Math.cos(angel),
                y: (extra_space + d.space / 2) * Math.sin(angel)
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

    function loadJS(url) {
        var xmlHttp = null;
        if (window.ActiveXObject)//IE
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
        else if (window.XMLHttpRequest)//Firefox，Opera 8.0+，Safari，Chrome
        {
            xmlHttp = new XMLHttpRequest();
        }
        //采用同步加载
        xmlHttp.open("GET", url, false);
        //发送同步请求，如果浏览器为Chrome或Opera，必须发布后才能运行，不然会报错
        xmlHttp.send(null);
        //4代表数据发送完毕
        if (xmlHttp.readyState == 4) {
            //0为访问的本地，200到300代表访问服务器成功，304代表没做修改访问的是缓存
            if ((xmlHttp.status >= 200 && xmlHttp.status < 300) || xmlHttp.status == 0 || xmlHttp.status == 304) {
                var myHead = document.getElementsByTagName("HEAD").item(0);
                var myScript = document.createElement("script");
                myScript.language = "javascript";
                myScript.type = "text/javascript";
                myScript.charset = "utf-8";
                try {
                    //IE8以及以下不支持这种方式，需要通过text属性来设置
                    myScript.appendChild(document.createTextNode(xmlHttp.responseText));
                }
                catch (ex) {
                    myScript.text = xmlHttp.responseText;
                }
                myHead.appendChild(myScript);
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    function unescapeHTML(a) {
        return a.replace(/&lt;|&#60;/g, "<").replace(/&gt;|&#62;/g, ">").replace(/&amp;|&#38;/g, "&").replace(/*/&quot;|*//&#34;/g, '"').replace(/&apos;|&#39;/g, "'");
    }
}