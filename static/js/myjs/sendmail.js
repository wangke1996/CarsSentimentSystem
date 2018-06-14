/**
 * Created by 王颗 on 2018/5/21.
 */
function sendmail(){
    var name=document.getElementById('name').value;
    var email=document.getElementById('email').value;
    var subject=document.getElementById('subject').value;
    var message=document.getElementById('message').value;
    if(subject=="" && message=="") {
        alert("主题和问题描述不能都为空！");
        return;
    }
    url='/send_mail?name='+name+'&sender='+email+'&subject='+subject+'&text='+message;
    var response=getValue(url);
    if(response=='1')
        alert("您的反馈我们已收到，感谢您的来信！");
    else
        alert("反馈提交失败，请稍后重试。");
}
