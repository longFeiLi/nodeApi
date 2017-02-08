var co = require('co');
var RES_CLS = 'r';
// Node 运行环境
var googleUrl = 'https://www.google.com/';
co(function* () {
    var url = yield nightmare
        // 打开 Google
        .goto(googleUrl)
        // 在输入框中填写内容 'csbun npm'
        .type('input[name="q"]', 'csbun npm')
        // 点击搜索
        .click('input[type="submit"]')
        // 等待页面返回
        .wait('.' + RES_CLS)
        // 页面操作
        .evaluate(function (RES_CLS) {
            // 这里是浏览器的运行环境
            var resHref = '';
            var resH3 = document.getElementsByClassName(RES_CLS)[0];
            if (resH3) {
              console.log(resH3);
                var resA = resH3.getElementsByTagName('A')[0];
                if (resA) {
                    resHref = resA.href;
                }
            }
            // 返回给 Node
            return resHref;
        }, RES_CLS); // 传参
    // 关闭
    yield nightmare.end();
    return url;
}).then(function (res) {
    // 输出结果
    console.log('res: ' + res);
});