/**
 * Created by 王颗 on 2018/11/29.
 */
function reviewAnalysis(batchResult, path = 'static/kb_json/汽车') {
    // var targetFreqSentence = getValue('/results');
    if (!batchResult)
        return;
    var targetFreqSentence = JSON.parse(unescapeHTML(batchResult));

    var freqData = countFreq();

    var showTop = 10;
    var commonList = mostCommonList(showTop);
    // console.log(targetFreq);
    abstractInfo();
    detailInfo();
    // summaryPie();
    // mostCommon();
    function abstractInfo() {
        d3.select("#batchResult").append("header").append("h2").attr('class', 'title').html("解析摘要");
        var abstract = d3.select("#batchResult").append("p");
        addText(abstract, "从评论整体来看，这款车");
        var posPercent = freqData[0] / sum(freqData);
        if (posPercent > 0.9)
            addText(abstract, "堪称完美", "level1");
        else if (posPercent > 0.8)
            addText(abstract, "令人满意", "level2");
        else if (posPercent > 0.65)
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


        d3.select("#batchResult").append("h3").attr('class', 'title').html("评价最多");
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


        var div = d3.select("#batchResult").append("div").attr("class", "bestAndWorst").append("section").attr("class", "box special features").append("div").attr("class", "features-row");
        var divBest = div.append("section");
        var divWorst = div.append("section");
        var bestTarget = bestList(showTop);
        var worstTarget = worstList(showTop);
        divBest.append("h3").attr('class', 'title').html("好评率最高");
        divWorst.append("h3").attr('class', 'title').html("差评率最高");
        abstract = divBest.append("p");
        for (i = 0; i < Math.min(bestTarget.length - 1, 2); i++) {
            addText(abstract, bestTarget[i][0], "targetName");
            addText(abstract, '、');
        }
        addText(abstract, bestTarget[i][0], "targetName");
        addText(abstract, "等是人们最欣赏的，几乎清一色好评！");
        abstract = divWorst.append("p");
        for (i = 0; i < Math.min(worstTarget.length - 1, 2); i++) {
            addText(abstract, worstTarget[i][0], "targetName");
            addText(abstract, '、');
        }
        addText(abstract, worstTarget[i][0], "targetName");
        addText(abstract, "等普遍遭到诟病，差评率很高！");
        drawList(divBest, bestTarget, [0]);
        drawList(divWorst, worstTarget, [2]);


        function drawList(divElement, list, tags = [0, 1, 2]) {
            var type = '';
            if (tags.length == 1) {
                if (tags[0] == 0)
                    type = 'bestTarget';
                else
                    type = 'worstTarget';
            }
            var ul = divElement.append("ul");
            showTop = list.length;
            var targets = ul.selectAll("li")
                .data(list)
                .enter()
                .append("li")
                .attr("class", type);
            targets
                .append("span")
                .attr("class", "targetName")
                .html(d => d[0]);
            var svg = targets
                .append("span")
                .attr("class", "targetPie")
                .append("svg")
                .each(function (d) {
                    drawPie(d3.select(this), d[1], tags, 40);
                });
            targets.append("a")
                .attr("class", "freq")
                .attr("href", "#")
                .each(showReview)
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
        var order = Object.values([0, 1, 2]).map(d => [d, datas[d], classes[d]]);
        order.sort(function (first, second) {
            if (showTag.indexOf(first[0]) == -1 && showTag.indexOf(second[0]) != -1)
                return -1;
            else if (showTag.indexOf(first[0]) != -1 && showTag.indexOf(second[0]) == -1)
                return 1;
            else
                return second[1] - first[1];
        });
        var svgWidth = parseInt(svgElement.style("width"));
        var svgHeight = parseInt(svgElement.style("Height"));
        var radius = Math.min(pieRadius, svgWidth / 2, svgHeight / 2);
        var arc_generator = d3.arc().innerRadius(0).outerRadius(radius);
        var pie = d3.pie().value(d => d[1]);
        var pieData = pie(order);
        var gs = svgElement.selectAll(".g")
            .data(pieData)
            .enter()
            .append("g")
            .attr("transform", "translate(" + svgWidth / 2 + "," + svgHeight / 2 + ")");
        gs.append("path")
            .attr("class", (d, i) => order[i][2])
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
                if (d.data[1] == 0)
                    return "";
                if (showTag.indexOf(d.data[0]) != -1)
                    return (100 * d.value / sum(datas)).toFixed(2) + '%';
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
            .each(showReview)
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
        var freqFilter = 10;
        var targetFreqItems = Object.keys(targetFreqSentence).map(d => [d, targetFreqSentence[d]['freq']]);
        targetFreqItems.sort(function (first, second) {
            var sum1 = sum(first[1]), sum2 = sum(second[1]);
            if (sum1 < freqFilter || sum2 < freqFilter)
                return sum2 - sum1;
            var p1 = first[1][0] / sum1, p2 = second[1][0] / sum2;
            if (p2 != p1)
                return p2 - p1;
            else
                return sum2 - sum1;
        });
        return targetFreqItems.slice(0, maxCount);
    }

    function worstList(maxCount = 10) {
        var freqFilter = 10;
        var targetFreqItems = Object.keys(targetFreqSentence).map(d => [d, targetFreqSentence[d]['freq']]);
        targetFreqItems.sort(function (first, second) {
            var sum1 = sum(first[1]), sum2 = sum(second[1]);
            if (sum1 < freqFilter || sum2 < freqFilter)
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
    function showReview(d) {
        d3.select(this).on("click", function () {
            d3.event.preventDefault();
            var li = d3.select(this.parentNode);
            var listType = li.attr('class');
            var ul = li.select('ul');
            if (ul.size() > 0) {
                ul.remove();
                li.selectAll('div').remove();
                return false;
            }
            ul = li.append('ul');
            generateReviewList(ul, d[0], listType);
            li.append('div')
                .append('a')
                .attr('href','#')
                .on('click',function(){
                    d3.event.preventDefault();
                    targetQuery(d[0]);
                    document.getElementById("targetDetail").scrollIntoView();
                    // window.location.hash="#targetDetail";
                    return false;
                })
                .text('查看更多详情');
            return false;
        });
    }

    function generateReviewList(ul, targetName, listType = 'general') {
        var freqs = targetFreqSentence[targetName]['freq'];
        var reviews = targetFreqSentence[targetName]['review'];
        var omitted = [[], [], []];
        for (i = 0; i < 3; i++) {
            if (freqs[i] > reviews[i].length)
                omitted[i].push('......省略其余' + (freqs[i] - reviews[i].length).toString() + '条');
        }
        var posReviews = ul.append('li')
            .append('a')
            .attr('href', '#')
            .on("click", function () {
                return clickOnLi(this, reviews[0].concat(omitted[0]), 'posReview');
            })
            .text('正面评价（' + freqs[0] + '条，占比' + (100 * freqs[0] / sum(freqs)).toFixed(2) + '%）');
        var neuReviews = ul.append('li')
            .append('a')
            .attr('href', '#')
            .on("click", function () {
                return clickOnLi(this, reviews[1].concat(omitted[1]), 'neuReview');
            })
            .text('中性评价（' + freqs[1] + '条，占比' + (100 * freqs[1] / sum(freqs)).toFixed(2) + '%）');
        var negReviews = ul.append('li')
            .append('a')
            .attr('href', '#')
            .on("click", function () {
                return clickOnLi(this, reviews[2].concat(omitted[2]), 'negReview');
            })
            .text('负面评价（' + freqs[2] + '条，占比' + (100 * freqs[2] / sum(freqs)).toFixed(2) + '%）');
        if (listType == 'bestTarget')
            clickOnLi(posReviews.node(), reviews[0].concat(omitted[0]), 'posReview');
        else if (listType == 'worstTarget')
            clickOnLi(negReviews.node(), reviews[2].concat(omitted[2]), 'negReview');
        else {
            clickOnLi(posReviews.node(), reviews[0].concat(omitted[0]), 'posReview');
            clickOnLi(neuReviews.node(), reviews[1].concat(omitted[1]), 'neuReview');
            clickOnLi(negReviews.node(), reviews[2].concat(omitted[2]), 'negReview');
        }

    }

    function clickOnLi(thisElement, subListDatas, subListType) {
        d3.event.preventDefault();
        var li = d3.select(thisElement.parentNode);
        var ul = li.select('ul');
        if (ul.size() > 0) {
            ul.remove();
            return false;
        }
        li.append('ul').selectAll('li').data(subListDatas).enter().append('li').attr('class', subListType).html(d => d.replace(/\s/g, ''));
        return false;
    }

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

    function detailInfo() {
        var queryBar = d3.select('#batchResult').append('div').attr('class', "row uniform half collapse-at-2").attr('name', 'queryBar');
        queryBar.append('div').attr('class', '9u').append('input').attr('id', 'query').attr('type', 'text').attr('placeholder', '查询实体、属性的评价情况');
        queryBar.append('div').attr('class', '3u').append('input').attr('class', 'fit').attr('type', 'submit').attr('value', '查看详情').on('click', targetQuery);
        d3.select("#batchResult").append('div').attr('id', 'targetDetail');
        loadJS(path + '/allWords.js');
        allEntity = JSON.parse(unescapeHTML(allEntity));
        allEntitySynonym = JSON.parse(unescapeHTML(allEntitySynonym));
        allAttribute = JSON.parse(unescapeHTML(allAttribute));
        allAttributeSynonym = JSON.parse(unescapeHTML(allAttributeSynonym));
        allDescription = JSON.parse(unescapeHTML(allDescription));
        var candidateList = [];
        candidateList.push(...allEntity.filter(d => d in targetFreqSentence).map(function (d) {
            return {'name': d, 'type': '实体', 'freq': targetFreqSentence[d]['freq'], 'origin': d};
        }));
        candidateList.push(...Object.entries(allEntitySynonym).filter(([synonym, origin]) => origin in targetFreqSentence).map(function ([synonym, origin]) {
            var type = '实体' + origin + '的同义词';
            return {'name': synonym, 'type': type, 'freq': targetFreqSentence[origin]['freq'], 'origin': origin};
        }));
        candidateList.push(...allAttribute.filter(d => d in targetFreqSentence).map(function (d) {
            return {'name': d, 'type': '属性', 'freq': targetFreqSentence[d]['freq'], 'origin': d};
        }));
        candidateList.push(...Object.entries(allAttributeSynonym).filter(([synonym, origin]) => origin in targetFreqSentence).map(function ([synonym, origin]) {
            var type = '属性' + origin + '的同义词';
            return {'name': synonym, 'type': type, 'freq': targetFreqSentence[origin]['freq'], 'origin': origin};
        }));
        candidateList.sort((d1, d2) => sum(d2['freq']) - sum(d1['freq']));

        var currentFocus;
        var Query = d3.select("#query").on("input", inputChange).on("keydown", chooseCandidate);
        var inputBox = document.getElementById("query");
        document.addEventListener("click", function (e) {
            closeAllLists(e.target);
        });

        function inputChange() {
            var a, i, val = this.value;
            /*close any already open lists of autocompleted values*/
            closeAllLists();
            if (!val) {
                return false;
            }
            currentFocus = -1;
            /*create a DIV element that will contain the items (values):*/
            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            /*append the DIV element as a child of the autocomplete container:*/
            this.parentNode.appendChild(a);
            /*for each item in the array...*/
            candidateList.forEach(function (d) {
                var b = creatAutoCompleteChild(d['name'], val, d['type'], d['origin'], d['freq']);
                if (b != null)
                    a.appendChild(b);
            });
        }

        function chooseCandidate() {
            var x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (d3.event.keyCode == 40) {
                /*If the arrow DOWN key is pressed,
                 increase the currentFocus variable:*/
                currentFocus++;
                /*and and make the current item more visible:*/
                addActive(x);
            }
            else if (d3.event.keyCode == 38) { //up
                /*If the arrow UP key is pressed,
                 decrease the currentFocus variable:*/
                currentFocus--;
                /*and and make the current item more visible:*/
                addActive(x);
            } else if (d3.event.keyCode == 13) {
                /*If the ENTER key is pressed, prevent the form from being submitted,*/
                d3.event.preventDefault();
                if (currentFocus > -1) {
                    /*and simulate a click on the "active" item:*/
                    if (x) x[currentFocus].click();
                }
            }
        }

        function addActive(x) {
            /*a function to classify an item as "active":*/
            if (!x) return false;
            /*start by removing the "active" class on all items:*/
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            /*add class "autocomplete-active":*/
            x[currentFocus].classList.add("autocomplete-active");
        }

        function removeActive(x) {
            /*a function to remove the "active" class from all autocomplete items:*/
            for (var i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
        }

        function closeAllLists(element) {
            /*close all autocomplete lists in the document,
             except the one passed as an argument:*/
            var x = document.getElementsByClassName("autocomplete-items");
            for (var i = 0; i < x.length; i++) {
                if (element != x[i] && element != Query) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }

        function getIndexOfEachCharacter(word, chars) {
            var flag = true;
            var indexes = [];
            for (j in chars) {
                var index = word.toUpperCase().indexOf(chars[j].toUpperCase());
                if (index == -1) {
                    flag = false;
                    break;
                }
                indexes[j] = index;
            }
            if (flag) {
                indexes = indexes.filter((v, k, a) => a.indexOf(v) === k);
                indexes.sort();
                return indexes;
            }
            else
                return null;
        }

        function creatAutoCompleteChild(word, chars, type, origin = null, freq = null) {
            var j;
            var indexes = getIndexOfEachCharacter(word, chars);
            if (indexes == null)
                return null;
            /*create a DIV element for each matching element:*/
            b = document.createElement("DIV");
            /*make the matching letters bold:*/
            indexes[indexes.length] = word.length;
            b.innerHTML = word.substr(0, indexes[0]);
            for (j = 0; j < indexes.length - 1; j++) {
                b.innerHTML += '<strong>' + word[indexes[j]] + '</strong>';
                b.innerHTML += word.substr(indexes[j] + 1, indexes[j + 1] - indexes[j] - 1);
            }
            if (freq)
                b.innerHTML += "<span>" + sum(freq) + "条相关评价</span>";
            b.innerHTML += "<span>" + type + "</span>";
            /*insert a input field that will hold the current array item's value:*/
            b.innerHTML += "<input type='hidden' value='" + word + "'>";
            b.addEventListener("click", function (e) {
                /*insert the value for the autocomplete text field:*/
                if (origin == null)
                    inputBox.value = this.getElementsByTagName("input")[0].value;
                else
                    inputBox.value = origin;
                /*close the list of autocompleted values,
                 (or any other open lists of autocompleted values:*/
                closeAllLists();
            });
            return b;
        }
    }

    function targetQuery(target) {
        if (!target)
            target = d3.select("#query").node().value;
        if(!(target in targetFreqSentence))
            return;
        var parent = d3.select("#targetDetail");
        parent.selectAll('div').remove();
        parent.append('div').append('h3').attr('class', 'title').html('评论详情——' + target);
        var rowCollapse = parent.append('div').attr('class', '12u').append('div').attr('class', 'row collapse-at-2');
        var reviewList = rowCollapse.append('div').attr('class', '6u');
        reviewList.append('h4').html('关于' + target + '，大家这么说：');
        var ul = reviewList.append('ul');
        generateReviewList(ul, target);
        var relatedTarget = rowCollapse.append('div').attr('class', '6u');
        relatedTarget.append('h4').html('你可能还想了解：');
        relatedTargettList = getRelatedTarget(target);
        // relatedTarget.append('ul').selectAll('li').data(relatedTargettList).enter().append('li').html(d => d);
        simpleForce(target, relatedTargettList, relatedTarget);
    }

    function simpleForce(target, relatedTargetList, parentNode, width = 500, height = 500) {
        var svg = parentNode.append('svg')
            .attr('width', width)
            .attr('height', height);
        var nodes = [{'index': 0, 'name': target}];
        nodes.push(...relatedTargetList.map((d, i) => {
            return {'index': i + 1, 'name': d};
        }));
        var edges = relatedTargetList.map((d, i) => {
            return {'source': 0, 'target': i + 1};
        });
        var forceSimulation = d3.forceSimulation()
            .force("link", d3.forceLink())
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter());
        forceSimulation.nodes(nodes)
            .on("tick", ticked);
        forceSimulation.force("link")
            .links(edges)
            .distance(120);
        forceSimulation.force("center")
            .x(width / 2)
            .y(height / 2);
        var forceLinks = svg.selectAll("line")
            .data(edges)
            .enter()
            .append("line");
        var color = d3.scaleOrdinal(d3.schemeBlues[9]);
        var gs = svg.selectAll(".circleText")
            .data(nodes)
            .enter()
            .append("g")
            .append("g")
            .attr("transform", function (d, i) {
                var cirX = d.x;
                var cirY = d.y;
                return "translate(" + cirX + "," + cirY + ")";
            })
            .call(d3.drag()
                .on("start", started)
                .on("drag", dragged)
                .on("end", ended)
            );
        //绘制节点
        gs.append("circle")
            .attr("r", 30)
            .attr("fill", (d, i) => color(i));
        //文字
        gs.append("a")
            .attr('href',"#")
            .on("click",function(d){
                d3.event.preventDefault();
                targetQuery(d.name);
                return false;
            })
            .append('text')
            .text(d => d.name);
        function ticked() {
            forceLinks
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            gs.attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
        }

        function started(d) {
            if (!d3.event.active) {
                forceSimulation.alphaTarget(0.8).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function ended(d) {
            if (!d3.event.active) {
                forceSimulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
        }

    }

    function getRelatedTarget(target, maxCount = 6) {
        loadJS(path + "/" + target + ".js");
        var relatedNodes = JSON.parse(unescapeHTML(partial_graph));
        var relatedTarget = [];
        for (let i in relatedNodes) {
            var group = relatedNodes[i];
            var type = group['name'];
            if (type == 'entities' || type == 'attributes' || type == 'fathers' || type == 'children') {
                relatedTarget.push(...group.children.filter(d => (d.name in targetFreqSentence) && (sum(targetFreqSentence[d.name]['freq']) > 0)).map(d => d.name));
            }
        }
        relatedTarget = [...new Set(relatedTarget)];
        relatedTarget.sort(function (first, second) {
            sum(targetFreqSentence[second]['freq']) - sum(targetFreqSentence[first]['freq']);
        });
        return relatedTarget.slice(0, maxCount);
    }
}