/**
 * Created by 王颗 on 2018/11/29.
 */
function reviewAnalysis() {
    var targetFreqSentence = getValue('/results');
    targetFreqSentence = JSON.parse(targetFreqSentence);

    var freqData = countFreq();

    var showTop = 10;
    var commonList = mostCommonList(showTop);
    // console.log(targetFreq);
    abstractInfo();
    // summaryPie();
    // mostCommon();
    function abstractInfo() {
        d3.select("#batchResult").append("header").append("h3").html("解析摘要");
        var abstract = d3.select("#batchResult").append("p");
        addText(abstract, "从评论整体来看，这款车");
        var posPercent = freqData[0] / sum(freqData);
        if (posPercent > 0.9)
            addText(abstract, "堪称完美", "level1");
        else if (posPercent > 0.8)
            addText(abstract, "令人满意", "level2");
        else if (posPercent > 0.7)
            addText(abstract, "还不错", "level3");
        else if (posPercent > 0.5)
            addText(abstract, "一般般", "level4");
        else if (posPercent > 0.3)
            addText(abstract, "不怎么样", "level5");
        else
            addText(abstract, "糟透了", "level6");
        addText(abstract, "。</br>");
        addText(abstract, "在给出的");
        addText(abstract, sum(freqData), "number");
        addText(abstract, "个评论片段中，大家对这款车各方面都进行了评价。其中：</br>正向的评价片段约");
        addText(abstract, freqData[0], "numberPos");
        addText(abstract, "句；</br>中性的评价片段约");
        addText(abstract, freqData[1], "numberNeu");
        addText(abstract, "句；</br>负向的评价片段约");
        addText(abstract, freqData[2], "numberNeg");
        addText(abstract, "句。");
        summaryPie();

        d3.select("#batchResult").append("h3").html("评价最多");
        abstract = d3.select("#batchResult").append("p");
        addText(abstract, "大家似乎对");
        var i;
        for (i = 0; i < Math.min(commonList.length - 1, 2); i++) {
            addText(abstract, commonList[i][0], "targetName");
            addText(abstract, '、');
        }
        addText(abstract, commonList[i][0], "targetName");
        addText(abstract, "格外关心，涉及的评论片段最多：</br>");
        mostCommon();

        // var div = d3.select("#batchResult").append("div").attr("class", "row collapse-at-2");
        // var divBest = div.append("div").attr("class", "6u");
        // var divWorst = div.append("div").attr("class", "6u");
        var div = d3.select("#batchResult").append("div").attr("class","bestAndWorst").append("section").attr("class", "box special features").append("div").attr("class", "features-row");
        var divBest = div.append("section");
        var divWorst = div.append("section");
        var bestTarget = bestList(showTop);
        var worstTarget = worstList(showTop);
        divBest.append("h3").html("好评率最高</br>");
        divWorst.append("h3").html("差评率最高</br>");
        abstract = divBest.append("p");
        for (i = 0; i < Math.min(bestTarget.length - 1, 2); i++) {
            addText(abstract, bestTarget[i][0], "targetName");
            addText(abstract, '、');
        }
        addText(abstract, bestTarget[i][0], "targetName");
        addText(abstract, "等是人们最欣赏的，好评率很高！</br>");
        abstract = divWorst.append("p");
        for (i = 0; i < Math.min(worstTarget.length - 1, 2); i++) {
            addText(abstract, worstTarget[i][0], "targetName");
            addText(abstract, '、');
        }
        addText(abstract, worstTarget[i][0], "targetName");
        addText(abstract, "等普遍遭到诟病，几乎清一色差评！</br>");
        drawList(divBest, bestTarget, [0]);
        drawList(divWorst, worstTarget, [2]);
        function drawList(divElement, list, tags = [0, 1, 2]) {
            var ul = divElement.append("ul");
            showTop = list.length;
            var targets = ul.selectAll("li")
                .data(list)
                .enter()
                .append("li");
            targets
                .append("span")
                .attr("class", "targetName")
                .html(d => d[0]);
            var svg = targets
                .append("span")
                .attr("class", "targetPie")
                .append("svg")
                .attr("width", 100)
                .attr("height", 100)
                .each(function (d) {
                    drawPie(d3.select(this), d[1], tags,40);
                });
            targets.append("a")
                .attr("class", "freq")
                .attr("href", "#")
                .text(d => '共' + sum(d[1]) + '句相关评论');

            function totalWidth(d) {
                var freq = sum(d[1]);
                var width = rectWidthMin + (freq - freqMin) / (freqMax - freqMin) * (rectWidthMax - rectWidthMin);
                return width;
            }

            function posWidths(d) {
                var freq = sum(d[1]);
                var width = rectWidthMin + (freq - freqMin) / (freqMax - freqMin) * (rectWidthMax - rectWidthMin);
                return d[1][0] / freq * width;
            }

            function neuWidths(d) {
                var freq = sum(d[1]);
                var width = rectWidthMin + (freq - freqMin) / (freqMax - freqMin) * (rectWidthMax - rectWidthMin);
                return d[1][1] / freq * width;
            }

            function negWidths(d) {
                var freq = sum(d[1]);
                var width = rectWidthMin + (freq - freqMin) / (freqMax - freqMin) * (rectWidthMax - rectWidthMin);
                return d[1][2] / freq * width;
            }

        }

        function addText(element, text, textType = "normal") {
            element.append("span").attr("class", textType).html(text);
        }
    }

    function summaryPie() {
        var pieRadius = 100, svgWidth = 500, svgHeight = 300;
        var svg = d3.select("#batchResult")
            .append("div")
            .attr("class", "12u")
            .attr("name", "summaryPie")
            .append("svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight);
        drawPie(svg, freqData);

    }

    function drawPie(svgElement, datas, showTag = [0, 1, 2], pieRadius = 100, classes = ['piePos', 'pieNeu', 'pieNeg']) {
        var svgWidth = parseInt(svgElement.style("width"));
        var svgHeight = parseInt(svgElement.style("Height"));
        var radius = Math.min(pieRadius, svgWidth / 2, svgHeight / 2);
        var arc_generator = d3.arc().innerRadius(0).outerRadius(radius);
        var pie = d3.pie().value(d => d);
        var pieData = pie(datas);
        var gs = svgElement.selectAll(".g")
            .data(pieData)
            .enter()
            .append("g")
            .attr("transform", "translate(" + svgWidth / 2 + "," + svgHeight / 2 + ")");
        gs.append("path")
            .attr("class", (d, i) => classes[i])
            .attr("d", arc_generator)
            .each(function () {
                var animationHandler = onVisibilityChange(this, d => d3.select(this).transition().duration(2000).attrTween("d", tweenPie));
                addHandler(animationHandler);
            });
        gs.append("text")
            .attr("transform", function (d) {
                return "translate(" + arc_generator.centroid(d) + ")";
            })
            .attr("text-anchor", "middle")
            .text(function (d, i) {
                if (d.data == 0)
                    return "";
                if (showTag.indexOf(i) != -1)
                    return (100 * d.data / sum(datas)).toFixed(2) + '%';
                else
                    return "";
            });
        function tweenPie(b) {
            b.innerRadius = 0;
            var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
            return function (t) {
                return arc_generator(i(t));
            };
        }
    }

    function countFreq() {
        var pos_freq = 0, neu_freq = 0, neg_freq = 0;
        var i;
        for (i in targetFreqSentence) {
            var freqs = targetFreqSentence[i]['freq'];
            pos_freq += freqs[0];
            neu_freq += freqs[1];
            neg_freq += freqs[2];
        }
        return [pos_freq, neu_freq, neg_freq];
    }

    function mostCommon() {
        var rectWidthMax = 500;
        var rectWidthMin = 50;
        var ul = d3.select("#batchResult")
            .append("div")
            .attr("class", "12u")
            .attr("name", "mostCommon")
            .append("ul")
            .classed("commonList", true);
        showTop = commonList.length;
        var freqMax = sum(commonList[0][1]);
        var freqMin = sum(commonList[showTop - 1][1]);
        if (freqMin == freqMax) {
            freqMax += 1;
            rectWidthMin = rectWidthMax;
        }
        var freqTarget = ul.selectAll("li.freqTarget")
            .data(commonList)
            .enter()
            .append("li")
            .classed("freqTarget", true);
        //
        freqTarget
            .append("span")
            .attr("class", "targetName")
            .html(d => d[0]);
        var rect = freqTarget
            .append("span")
            .attr("class", "targetRect");
        rect.append("svg")
            .style("background", 'lime')
            .each(function () {
                var animationHandler = onVisibilityChange(this, d => d3.select(this).attr("width", 0).transition().duration(2000).attr("width", posWidths));
                addHandler(animationHandler);
            })
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("dy", "0.4em")
            .text(d => d[1][0]);
        rect.append("svg")
            .style("background", 'yellow')
            .each(function () {
                var animationHandler = onVisibilityChange(this, d => d3.select(this).attr("width", 0).transition().duration(2000).attr("width", neuWidths));
                addHandler(animationHandler);
            })
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("dy", "0.4em")
            .text(d => d[1][1]);
        rect.append("svg")
            .style("background", 'red')
            .each(function () {
                var animationHandler = onVisibilityChange(this, d => d3.select(this).attr("width", 0).transition().duration(2000).attr("width", negWidths));
                addHandler(animationHandler);
            })
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("dy", "0.4em")
            .text(d => d[1][2]);
        freqTarget.append("a")
            .attr("class", "freq")
            .attr("href", "#")
            .text(d => '共' + sum(d[1]) + '句相关评论');

        function totalWidth(d) {
            var freq = sum(d[1]);
            var width = rectWidthMin + (freq - freqMin) / (freqMax - freqMin) * (rectWidthMax - rectWidthMin);
            return width;
        }

        function posWidths(d) {
            var freq = sum(d[1]);
            var width = rectWidthMin + (freq - freqMin) / (freqMax - freqMin) * (rectWidthMax - rectWidthMin);
            return d[1][0] / freq * width;
        }

        function neuWidths(d) {
            var freq = sum(d[1]);
            var width = rectWidthMin + (freq - freqMin) / (freqMax - freqMin) * (rectWidthMax - rectWidthMin);
            return d[1][1] / freq * width;
        }

        function negWidths(d) {
            var freq = sum(d[1]);
            var width = rectWidthMin + (freq - freqMin) / (freqMax - freqMin) * (rectWidthMax - rectWidthMin);
            return d[1][2] / freq * width;
        }

    }

    function mostCommonList(maxCount = 10) {
        var targetFreqItems = Object.keys(targetFreqSentence).map(d => [d, targetFreqSentence[d]['freq']]);
        targetFreqItems.sort(function (first, second) {
            return sum(second[1]) - sum(first[1]);
        });
        return targetFreqItems.slice(0, maxCount);
    }

    function bestList(maxCount = 10) {
        var targetFreqItems = Object.keys(targetFreqSentence).map(d => [d, targetFreqSentence[d]['freq']]);
        targetFreqItems.sort(function (first, second) {
            var sum1 = sum(first[1]), sum2 = sum(second[1]);
            if (sum1 == 0 || sum2 == 0)
                return 1;
            var p1 = first[1][0] / sum1, p2 = second[1][0] / sum2;
            if (p2 != p1)
                return p2 - p1;
            else
                return sum2 - sum1;
        });
        return targetFreqItems.slice(0, maxCount);
    }

    function worstList(maxCount = 10) {
        var targetFreqItems = Object.keys(targetFreqSentence).map(d => [d, targetFreqSentence[d]['freq']]);
        targetFreqItems.sort(function (first, second) {
            var sum1 = sum(first[1]), sum2 = sum(second[1]);
            if (sum1 == 0 || sum2 == 0)
                return sum2 - sum1;
            var p1 = first[1][2] / sum1, p2 = second[1][2] / sum2;
            if (p2 != p1)
                return p2 - p1;
            else
                return sum2 - sum1;
        });
        return targetFreqItems.slice(0, maxCount);
    }

    // var handler = onVisibilityChange(el, function () {
    //     /* your code go here */
    // });

    function addHandler(handler) {
        if (window.addEventListener) {
            addEventListener('DOMContentLoaded', handler, false);
            addEventListener('load', handler, false);
            addEventListener('scroll', handler, false);
            addEventListener('resize', handler, false);
        }
        else if (window.attachEvent) {
            attachEvent('onDOMContentLoaded', handler); // IE9+ :(
            attachEvent('onload', handler);
            attachEvent('onscroll', handler);
            attachEvent('onresize', handler);
        }
    }
}