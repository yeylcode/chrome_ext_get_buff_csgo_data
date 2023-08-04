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
