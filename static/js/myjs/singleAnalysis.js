/**
 * Created by 王颗 on 2018/12/19.
 */
function singleAnalysis(singleResult) {
    if (!singleResult)
        return;
    var sentimentList = JSON.parse(unescapeHTML(singleResult));
    var table = d3.select("#singleResult").append('div').classed('table-wrapper',true).append('table');
    var titles = ['实体', '属性', '描述', '情感', '评论片段'];
    var sentimentDict={'POS':'正面','NEU':'中性','NEG':'负面'};
    var typeDict={'正面':'POS','中性':'NEU','负面':'NEG'};
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
        .attr('class',d=>'tr'+typeDict[d[3]])
        .selectAll('td')
        .data(d => d)
        .enter()
        .append('td')
        .html(d => d);
    // trs.each(function (d) {
    //     d3.select(this).selectAll('td').data(d).enter().append('td').html(e => e);
    // });
}