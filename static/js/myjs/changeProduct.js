/**
 * Created by 王颗 on 2018/5/10.
 */
function changeProduct(product) {
    if(product=="")
        return;
    var product_pre=getValue('/getProduct');
    if(product==product_pre)
        return;
    getValue('/changeProduct?product='+product);
    // refresh the page with new product
    var this_url = document.location.toString();
    var arrUrl = this_url.split("//");
    var start = arrUrl[1].indexOf("/");
    var relUrl = arrUrl[1].substring(start);
    if(relUrl.indexOf("?") != -1){
        relUrl = relUrl.split("?")[0];
　　}
    window.location.href=relUrl;
}
