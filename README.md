# chrome_ext_get_buff_csgo_data
通过chrome扩展程序在自己的页面无视跨域获取网易buff中csgo饰品数据


>前两篇文章分享了两点
>1.  如何利用chrome扩展程序获取第三方网站的cookie
>2.  如何通过chrome扩展程序拦截，修改网络请求，还可以在请求头中加入自定义信息



# 本篇目标

**无视跨域从第三方接口获取数据**

第三方api地址：`https://buff.163.com/api/market/goods?game=csgo&page_num=2&use_suggestion=0&_=1686229473285`

这里只是个例子，实际可以是任何接口地址，如果接口需要登录认证，可以用到前两篇文章的方案解决

# 实现效果

在本地 127.0.0.0:8000页面内点击‘获取’按钮，将第三方接口的数据渲染到当前页面的额表格中

# 核心原理

通过浏览器的跨源通信 `window.postMessage(message, targetOrigin, [transfer])`,将请求信息发送给常驻内容的chrome扩展程序(service.js,v2版本中是background.js),service.js内可以拿到第三方的cookie，然后后发起网络请求(这里就是无视跨域)将第三方接口的数据返回给页面


![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/60965de05d8a44caadae1adeb5388349~tplv-k3u1fbpfcp-watermark.image?)

# 具体实现

以下是关键代码，完整程序在github中

自己的程序，这里简单写一个网页，调试时用http-server启动一个web服务
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Document</title>
</head>

<body>
    <!-- 本页面是测试用，和扩展程序无关 -->
    <button id="btn_get">获取饰品数据</button>
    <ul class="csgo" id="buff_list"> </ul>
 
    <script>
        function initHtml(result) {... }
        //流程6 结束 接受消息，获取到需要的数据
        window.addEventListener("message", (event) => {
            if (event.data.code == '获取的结果数据') {
                //将返回的结果渲染成html
                initHtml(event.data.data.response.data)
            }
        });
        let btn_get = document.getElementById('btn_get')
        btn_get.onclick = function () {
            //流程1 开始 发生消息，要获取什么数据
            let message = { params1: "自定义参数", action: "去获取buff列表数据" }//消息体，可以是一个字符串、数字、对象或数组，表示要传递的数据。
            let targetOrigin = "http://172.16.0.161:8080" //只向这个域名:端口发送消息
            window.postMessage(message, targetOrigin)
        }
    </script>
</body>

</html>
 
```

扩展程序的content-script.js
```js
//扩展程序的content-script.js
window.addEventListener("message", (event) => {
  //流程2
  //如果是指定源来的消息就去处理
  if (event.origin === "http://172.16.0.161:8080") {
    if (event.data.action == "去获取buff列表数据") {
      getBuffList();
    }
  }
});

function getBuffList() {
  //流程3
  //向扩展程序的service发送消息，并获取返回的数据
  chrome.runtime.sendMessage({ action: "get_buff_list" }, (res) => {
    //流程5
    //回调中有了list 数据，向http://172.16.0.161:8080这个窗口发送消息，
    window.postMessage(
      { data: res, code: "获取的结果数据" },
      "http://172.16.0.161:8080"
    );
  });
}

```

background.js
```js
//background.js
//流程4 无视跨域问题请求第三方接口 ，获取数据后执行回调
//第三方接口如果需要cookie这里也可以获取到
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action == "get_buff_list") {
    chrome.cookies.getAll({ domain: request.domain }, function (cookies) {
      let url = "https://buff.163.com/api/market/goods";
      let params = {
        game: "csgo",
        page_num: 1,
        use_suggestion: 0,
        _: new Date().getTime(),
      };
      let ck = cookies.filter((e) => e.domain.indexOf("buff.163.com") != -1);
      let headers = {};
      MyFetch(url, "get", params, headers, (res) => {
        sendResponse({ cookies: ck, response: res });
      });
    });
  }
  return true; //这里要返回true,不然会报错：Unchecked runtime.lastError: The message port closed before a response was received
});
```

# 源码下载

https://github.com/hanpanapn/chrome_ext_get_buff_csgo_data

# 易犯错误

在使用window.postMessage（data,'*'）时，发送数据和接收数据要用不同的参数区分，在监听时也可以通过参数区分，不然容易造成死循环： 页面发送 ==》  扩展接收后，在发送给页面，页面收到消息又发给扩展。。。。

# 总结归纳

通过chrome扩展程序，可以获取到第三方网站的cookie, 还可以拦截网络请求，添加、修改header，无视跨域问题，获取第三方接口的数据 ，有了这些基础条件，想想，你都能实现什么功能？在一个系统中模拟多个系统的登录，分别获取各个系统的数据，还可以对数据做一些合并，统计，对比等功能。

但是也存在一些问题：如：数据的控制权完全在接口，都是经过分页后返回的数据，前端无法做到对全部数据的总体分析。

# 风险提示
1.  隐私和法律问题：通过获取其他网站的数据，可能会接触到用户的个人信息。确保您遵守适用的隐私法规，并获取用户明确的授权或同意，以确保合法使用和处理数据。
2.  授权和API限制：许多网站提供API用于数据访问，但可能有一些限制和要求。请确保阅读并理解目标网站的API文档，了解其使用条款、许可要求、配额限制等。违反这些限制可能导致您的访问被封禁或法律纠纷。
3.  安全性风险：从其他网站获取数据时，存在一定的安全风险。确保您的代码和服务器具有适当的安全措施，以防止恶意攻击、数据泄露或其他安全漏洞。
4.  数据准确性和稳定性：其他网站的数据可能不始终准确或完整。请考虑数据的来源和质量，并采取相应的验证和错误处理机制来处理可能的问题。
5.  法律责任：在使用其他网站的数据时，您可能需要承担法律责任，特别是涉及版权、商标或知识产权问题。确保您不侵犯他人的权利，并在需要时获得必要的许可或授权。



