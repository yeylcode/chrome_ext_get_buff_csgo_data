function MyFetch(url, method, data, headers, callback) {
  if (method === "get") {
    const params = new URLSearchParams(data);
    fetch(`${url}?${params}`, {
      headers: headers,
    })
      .then(function (response) {
        return response.text();
      })
      .then(function (myJson) {
        callback(JSON.parse(myJson));
      });
  } else {
    fetch(url, {
      method: method,
      body: JSON.stringify(data),
      // mode: "no-cors",
      headers: headers,
    })
      .then(function (response) {
        return response.text();
      })
      .then(function (myJson) {
        callback(JSON.parse(myJson));
      });
  }
}
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
