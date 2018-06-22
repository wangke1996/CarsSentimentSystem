/**
 * Created by 王颗 on 2018/6/22.
 */
function changePolar(obj) {
    var td = obj.parentElement.parentElement;
    var attribute=td.previousElementSibling.innerText.trim();
    var description=td.nextElementSibling.firstChild.innerText.trim();
    if (obj.value == "1") {
        obj.style = "color: green";
        td.nextElementSibling.firstElementChild.style.color = "green";
        td.nextElementSibling.nextElementSibling.firstElementChild.style.color = "green";
    }
    else if (obj.value == "0") {
        obj.style = "color: orange";
        td.nextElementSibling.firstElementChild.style.color = "orange";
        td.nextElementSibling.nextElementSibling.firstElementChild.style.color = "orange";
    }
    else {
        obj.style = "color: red";
        td.nextElementSibling.firstElementChild.style.color = "red";
        td.nextElementSibling.nextElementSibling.firstElementChild.style.color = "red";
    }
    url='/changePolar?attribute='+attribute+'&description='+description+'&polar='+obj.value;
    var result=getValue(url);
    alert(result)
}