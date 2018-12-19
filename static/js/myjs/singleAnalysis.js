/**
 * Created by 王颗 on 2018/12/19.
 */
function singleAnalysis(singleResult) {
    if (!singleResult)
        return;
    var sentimentList = JSON.parse(unescapeHTML(singleResult));
    var table = d3.select("#singleResult").append('div').classed('table-wrapper', true).append('table');
    var titles = ['实体', '属性', '描述', '情感', '评论片段'];
    var sentimentDict = {'POS': '正面', 'NEU': '中性', 'NEG': '负面'};
    var typeDict = {'正面': 'POS', '中性': 'NEU', '负面': 'NEG'};
    sentimentList.sort(compareSentiment);
    function compareSentiment(first, second) {
        if (first.sentiment != second.sentiment)
            return second.sentiment.localeCompare(first.sentiment);
        if (first.attribute != second.attribute)
            return second.attribute.localeCompare(first.attribute);
        if (first.entity != second.entity)
            return second.entity.localeCompare(first.entity);
        if (first.description != second.description)
            return second.description.localeCompare(first.description);
        return second.sentence.localeCompare(first.sentence);
    }
    for(let i=0,j=sentimentList.length-1;i<j;i++){
        if(compareSentiment(sentimentList[i],sentimentList[i+1])==0)
        {
            sentimentList.splice(i,1);
            i--;
            j--;
        }
    }

    var datas = Object.values(sentimentList).map(d => [d['entity'], d['attribute'], d['description'], sentimentDict[d['sentiment']], d['sentence'].replace(/\s/g, '')]);
    table.append('thead')
        .append('tr')
        .selectAll('td')
        .data(titles)
        .enter()
        .append('td')
        .html(d => d);
    table.append('tbody')
        .selectAll('tr')
        .data(datas)
        .enter()
        .append('tr')
        .attr('class', d => 'tr' + typeDict[d[3]])
        .selectAll('td')
        .data(d => d)
        .enter()
        .append('td')
        .html(d => d);
    // trs.each(function (d) {
    //     d3.select(this).selectAll('td').data(d).enter().append('td').html(e => e);
    // });
}
function initExample() {
    var examples = '外形相当有个性，线条流畅性能操控好，很舒适，外观很时尚。首先声明一点‚在我开过的车里面这个车的噪音是较小的。首次深刻体会CVT变速箱，赞叹，1500转就上100KM/H，我的老蒙100km/h超过2100转。动力很充足，但不线性，起步时如果不踩油门几乎不动。踩油门深了突然爆发，好像脾气不好的孩子，不容易管。我车库有个小坡‚也就是30厘米的高差‚1.5米长‚这个小4就不行了‚松刹车就溜‚油门踩深了就窜‚踩浅了还溜‚ 我算彻底服了‚以后准备雇人推车入库今天沈阳下雨了‚查看了发动机仓‚确实进水。总体说来提车后的感受是‚既不喜欢也不讨厌.外形招风‚问的人很多‚ 油耗低‚市内拥堵路况‚倒车油门不好控制。车辆运行1小时以上时停车后会听到哒。。。。哒。。。。哒的声响。从底盘位置传出。等做首保时再解这个迷。内部外部配置较为简陋。像是20万左右的车。定速巡航10万左右的车就有。自动雨刮，自动大灯在20多万的车上基本都有。门的铰链感觉很水。单薄的我关门都害怕他会断。真皮座椅也不在标准版上配置。34万感觉只是买了奥迪先进的发动机和变速箱。在今后车市竞争激烈的情况下希望奥迪会考虑加装些舒适性或者技术性的装备！也谈谈缺点吧‚保养周期让我难以接受‚郴州市居然没有奥迪4S店‚我了个去.每次保养还要开车去长沙‚来回700公里‚ 说5000公里一个周期‚我表示很无语.再一个后排空间感觉不是很宽‚打转向灯操作不好‚经常会难以回位.车的性能很不错，对于价位来说我能接受。外观看来很大气，年轻活力的动感！内部空间不是很大(和帕萨特比)总体还可以，车型我是很喜欢的，牌子也有名的，好过常的。车的性能很不错，对于价位来说我能接受。'.split('\n');
    d3.select('#singleExampleButton')
        .on('click', function () {
            d3.event.preventDefault();
            var randomIndex = Math.floor(Math.random() * examples.length);
            d3.select("#message").node().value = examples[randomIndex];
            return false;
        });
}