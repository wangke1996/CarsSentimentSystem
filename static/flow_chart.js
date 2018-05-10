/**
 * Created by 王颗 on 2018/4/25.
 */
function flow_chart(string_list,div_id,rec_width,rec_height,marker_length) {
//输入string_list,添加流图的div的id,每个矩形框的宽、高，流图中普通箭头的长度
    var svg_width = 1000, svg_height = 500;
    var svg = d3.select('#' + div_id).append("svg")
        .attr("id", div_id + "svg")
        .attr("width", svg_width)//svg画布宽高
        .attr("height", svg_height);
    var i;
    var Horizontal_margin = 10, Vertical_margin = 10;
    var left_x = Horizontal_margin, top_y = Vertical_margin, center_x = left_x + rec_width / 2,
        center_y = top_y + rec_height / 2;
    var out_of_boundary = false;
    for (i = 0; i < string_list.length; i++) {
        // 下一个矩形是否会超出画布
        if (left_x + 2 * rec_width + marker_length + Horizontal_margin + 10 > parseInt(svg.attr("width")))
            out_of_boundary = true;

        //append rectangle
        svg.append('rect')
            .attr({
                'width': rec_width,
                'height': rec_height,
                'x': left_x,
                'y': top_y
            })
            .style({'fill': '#FFFFFF', 'stroke': '#000000', 'stroke-width': 0.5});
        //矩形填充颜色、边框颜色、边框宽度

        //append text
        var text_array = string_list[i].split('\n');
        var font_size = text_analysis(text_array);//计算矩形可容纳该string条件下的最大字号
        var line_number = text_array.length;
        svg.append('text').attr({
            "dy": 0.2 * font_size + "px",
            "text-anchor": "middle",
            "font-weight": "normal",
            "font-size": font_size + "px"
        })
            .attr('x', function () {
                if (line_number <= 1) {
                    d3.select(this).append('tspan')
                        .attr('x', center_x)
                        .attr('y', center_y)
                        .append('a').attr('href','www.baidu.com')
                        .text(text_array[0]);
                }
                else {
                    var j;
                    for (j = 0; j < text_array.length; j++) {
                        d3.select(this).append('tspan').attr('x', center_x).attr('y', center_y+1.2*font_size*(j-(text_array.length-1)/2)).text(text_array[j]);
                    }
                }
            }).style({'fill': '#000000'});//字体颜色
        if (i == string_list.length - 1)
            break;

        //append marker
        var path_d;
        if(out_of_boundary){
            out_of_boundary=false;
            var new_width=parseInt(svg.attr("width"))+marker_length+10+rec_width;
            svg.attr("width",new_width);
        }
        // if (out_of_boundary) {
        //     path_d = "M" + (left_x + rec_width / 2) + "," + (top_y + rec_height) + "L" + (left_x + rec_width / 2) + "," + (top_y + rec_height + rec_height / 2) + "L" + (rec_width / 2) + "," + (top_y + rec_height + rec_height / 2) + "L" + (rec_width / 2) + "," + (top_y + 2 * rec_height - 10);
        //     left_x = Horizontal_margin;
        //     out_of_boundary = false;
        //     top_y = top_y + 2 * rec_height;
        //     center_y = top_y + rec_height / 2;
        //     center_x = left_x + rec_width / 2;
        // }
        // else {
            left_x = left_x + rec_width;
            path_d = "M" + left_x + "," + center_y + "L" + (left_x + marker_length) + "," + center_y;
            left_x = left_x + marker_length + 10;
            center_x = left_x + rec_width / 2;
        // }
        svg.append('marker')
            .attr({
                "id": "marker" + i,
                //"markerUnits": "strokeWidth",//设置为strokeWidth箭头会随着线的粗细发生变化
                "markerUnits": "userSpaceOnUse",
                "refX": 2,//箭头坐标
                "refY": 6,
                "markerWidth": 13,//标识的大小
                "markerHeight": 13,
                "orient": "auto",//绘制方向，可设定为：auto（自动确认方向）和 角度值
                "stroke-width": 0.5
            })//箭头宽度
            .append("path")
            .attr({
                "d": "M2,2 L2,11 L10,6 L2,2",//箭头三角形的路径
                'fill': '#000000'
            });//箭头颜色
        svg.append('path')
            .attr({
                "d": path_d,//箭杆路径
                "marker-end": "url(#marker" + i + ")",
                "fill": "#FFFFFF"
            })
            .style({
                'stroke': '#000000',//箭杆颜色
                'stroke-width': 1,//箭杆粗细
            });
    }
    function text_analysis(text_array) {
        var i;
        var max_width = 0, max_height = 0;
        var line_number = text_array.length;
        d3.select('#' + div_id + 'svg').append('text').attr('font-size', "20px").attr('id', 'text_temp');
        for (i = 0; i < text_array.length; i++) {
            d3.select('#text_temp').append('tspan').attr('id', 'span_temp').text(text_array[i]);
            var span = document.documentElement.querySelector('#span_temp');
            var rect = span.getBoundingClientRect();
            var width = rect.right - rect.left;
            var height = rect.bottom - rect.top;
            if (width > max_width)
                max_width = width;
            if (height > max_height)
                max_height = height;
            d3.select('#span_temp').remove();
        }

        d3.select('#text_temp').remove();
        //如有换行，假设行距为1/5 fontsize，水平边距、垂直边距均为1/5 fontsize，计算最大可容纳的fontsize
        var fontsize1 = 20 * rec_height / (0.2 * (line_number + 1) * 20 + line_number * max_height);
        var fontsize2 = 20 * rec_width / (max_width + 20 * 0.2 * 2);
        var fontsize = fontsize1
        if (fontsize2 < fontsize1)
            fontsize = fontsize2;
        return fontsize;
    }
}