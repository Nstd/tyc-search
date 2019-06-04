// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const btn = document.querySelector('#btn');
const clear = document.querySelector("#clear");
const content = document.querySelector("#content");
const cookieTxt = document.querySelector("#cookie");
const companyTxt = document.querySelector("#companys");
const logTxt = document.querySelector("#log");
const resultTxt = document.querySelector("#result-body");
const openDev = document.querySelector("#openDev");

const shell = require('electron').shell
const cheerio = require("cheerio");
const http = require("http");
const https = require("https");
const request = require("request");
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const BrowerWindow = require('electron').remote.BrowserWindow;
const {remote, ipcRenderer} = require('electron');

var searchUrl = "https://www.tianyancha.com";
var searchPath = "/search?checkFrom=searchBox&key=";
var companyPath = "/company/";
var cookies = "";

var isDebug = false;

var comps = [];
var result = [];

clear.onclick = () => {
    resultTxt.innerHTML = ""
}

openDev.onclick = () => {
    ipcRenderer.send("toggleDev", null);
}

if(isDebug) {
    var comp = fs.readFileSync("com.txt");
    companyTxt.innerHTML = comp;
}

btn.onclick = () => {

    var comp = companyTxt.value;
    var cookie = cookieTxt.value;


    if(comp == null || comp.length == 0) {
        alertError("请输入要查询的企业名称");
        return ;
    }

    if(cookie == null || cookie.length == 0) {
        alertError("请输入cookies");
        return ;
    }

    cookies = cookie;
    var data = comp.replace(/\r/gi, "");
    comps = data.split("\n");
    handleNext(0);
}

function handleNext(i) {
    if(i < 0) {
        showError("数据异常，index=" + i);
        return ;
    }

    if(i == comps.length) {
        show("查询结束!", 'green');
        return ;
    }

    showLog("check:" + comps[i]);
    loadData(searchPath + encodeURI(comps[i]), function (data) {
        if(data == null) {
            showLog("异常")
            return ;
        }
        handleHtml(data, i, searchPath + encodeURI(comps[i]));
    });
}

function loadData(url, callback) {
    // options.url = searchUrl + url;
    console.log("url: " + url);
    var axiosReq = axios.create({
        baseURL: searchUrl,
        headers: {
            'Cookie': cookies
        }
    });

    axiosReq.get(url).then(function (data) {
       // console.log(data.data);
       callback(data.data);
    });
}

function handleHtml(data, i, url) {
    console.log(data);
    if(checkNeedLogin(data) || checkVerifyCode(data, url)) {
       return ;
    }
    var $ = cheerio.load(data);
    var num = $("div.result-tips span.tips-num").text()
    showLog("search count: " + num);
    if(num > 0) {
        var companyId = $(".result-list").children().first().children().first().attr("data-id");
        // console.log("compayId:" + companyId);
        showLog("company id: " + companyId);
        loadData(companyPath + companyId, function(data) {
            handleCompany(data, i, companyPath + companyId);
        });
    }
}

function handleCompany(data, i, url) {
    if(checkNeedLogin(data) || checkVerifyCode(data, url)) {
        return ;
    }
    var $ = cheerio.load(data);
    var name = $(".company-header-block .box.-company-box .content .name").text();
    var $table = $("#_container_baseInfo").children("table").eq(1);
    // console.log("table:", $table);
    var taxNum = $table.find("tbody").find("tr").eq(3).find("td").eq(1).text();
    // console.log("name=" + name + ", taxNum=" + taxNum);
    showLog("name=" + name + ", taxNum=" + taxNum);

    result.push({
        name: name,
        taxNum: taxNum
    });
    var tr = document.createElement("tr");
    // p.text(name + "\t" + taxNum);
    tr.innerHTML = "<td>" + name + "</td><td>" + taxNum + "</td>"
    resultTxt.appendChild(tr);
    console.log(result);
    handleNext(i + 1);
}

function checkNeedLogin(data) {
    var needLogin = data.indexOf("请输入登录密码") > 0;
    if(needLogin) {
        showError("查询失败!");
        alertError("cookie 失效，请重新登录并粘贴cookie");
    }
    return needLogin;
}

function checkVerifyCode(data, url) {
    var needVerify = data.indexOf("确认一下你不是机器人") > 0;
    if(needVerify) {
        // const BrowserWindow = require('electron').BrowserWindow;
        // var win = new BrowerWindow({
        //     width: 800,
        //     height: 600
        // })
        var returnUrl = encodeURI(searchUrl + url);
        // win.loadURL("https://antirobot.tianyancha.com/captcha/verify?return_url=" + returnUrl + "&rnd=")
        shell.openExternal("https://antirobot.tianyancha.com/captcha/verify?return_url=" + returnUrl + "&rnd=")
    }
    return needVerify;
}

function showLog(log) {
    show(log, 'blue');
}

function showError(log) {
    show(log, 'red');
}

function show(log, color) {
    logTxt.innerHTML = logTxt.innerHTML + "<label class='" + color + "'>" + log + "</label><br/>";
    logTxt.scrollTop = logTxt.scrollHeight;
    console.log(log);
}

function alertError(msg) {
    remote.dialog.showErrorBox('警告', msg)
}

