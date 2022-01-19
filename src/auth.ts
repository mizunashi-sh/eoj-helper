import * as vscode from 'vscode';
import fetch from "node-fetch";
import { getCaptchaView } from "./webview/captchaView";
import { getCookieByName } from './utils';

const cheerio = require('cheerio');
const forge = require("node-forge");
const FormData = require('form-data');
const shared = require("./shared");

export async function login() {
    if(shared.loginInfo.isLogin) {
        logout();
    }

    const context = await vscode.commands.executeCommand('eoj-helper.get-context') as vscode.ExtensionContext;
    const loginFormResponse = await fetch("https://acm.ecnu.edu.cn/login/?next=/", {
        method: 'GET',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
            'Connection': 'keep-alive',
            'Host': 'acm.ecnu.edu.cn',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
        }
    });

    const loginFormCookie = await loginFormResponse.headers.raw()['set-cookie'];
    const csrfCookie = getCookieByName('csrftoken',loginFormCookie[0]);
    const page = await loginFormResponse.text();
    const $ = cheerio.load(page);
    const csrfToken = $("[name='csrfmiddlewaretoken']").val();
    const captchaName = $("[name='captcha_0']").val();
    const publicKey = $("[name='public_key']").val();

    const panel = vscode.window.createWebviewPanel(
        "captchaView",
        "EOJ登录-验证码",
        vscode.ViewColumn.One,
        {
            enableScripts: true,
        }
    );

    panel.webview.html = getCaptchaView(captchaName);

    const username = await vscode.window.showInputBox({
        prompt: "输入用户名或电子邮件地址：",
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (value === '') return '用户名或电子邮件地址不能为空';
            return null;
        }
    });
    const password = await vscode.window.showInputBox({
        prompt: "输入密码：",
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (value === '') return '密码不能为空';
            return null;
        }
    });
    const captchaValue = await vscode.window.showInputBox({
        prompt: "输入验证码算式的计算结果：",
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (value === '') return '验证码不能为空';
            return null;
        }
    });

    let forgePublicKey = forge.pki.publicKeyFromPem(publicKey);
    let passwordBuffer = forge.util.createBuffer(password, 'utf8');
    let binaryString = passwordBuffer.getBytes();
    let encryptedPassword = forgePublicKey.encrypt(binaryString, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
            md: forge.md.sha256.create()
        }
    });

    const formData = new FormData();
    formData.append("csrfmiddlewaretoken", csrfToken);
    formData.append("next", "/login/?next=/");
    formData.append("username", username===undefined?'username':username);
    formData.append("password", forge.util.encode64(encryptedPassword));
    formData.append("captcha_0", captchaName);
    formData.append("captcha_1", captchaValue===undefined?'captcha':captchaValue);
    formData.append("public_key", publicKey);

    let postHeaders = formData.getHeaders();
    postHeaders["Origin"] = "https://acm.ecnu.edu.cn";
    postHeaders["Referer"] = "https://acm.ecnu.edu.cn/login/?next=/";
    postHeaders["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9";
    postHeaders["Host"] = "acm.ecnu.edu.cn";
    postHeaders["Sec-Fetch-Site"] = "same-origin";
    postHeaders["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36";
    postHeaders["X-CSRFToken"] = csrfCookie;
    postHeaders["Cookie"] = "csrftoken="+csrfCookie;

    const loginPostResponse = await fetch("https://acm.ecnu.edu.cn/login/?next=/", {
        method: "POST",
        headers: postHeaders,
        redirect: 'manual',
        body: formData
    });

    if(await loginPostResponse.status === 302) {
        vscode.window.showInformationMessage("登录成功！");
        const loginPostCookie = loginPostResponse.headers.raw()['set-cookie'];

        const homeResponse = await fetch('https://acm.ecnu.edu.cn/', {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
                'Cookie': 'csrftoken='+getCookieByName('csrftoken',loginPostCookie[0])+'; sessionid='+getCookieByName('sessionid',loginPostCookie[1]),
                'Connection': 'keep-alive',
                'Host': 'acm.ecnu.edu.cn',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
            }
        });

        const home = await homeResponse.text();
        const $ = cheerio.load(home);
        let info = $(".ui.dropdown.simple.item").text();
        info = info.replaceAll('\n',' ');
        info = info.trim();
        info = info.split(/\s+/) ;
        shared.loginInfo = {
            isLogin: true,
            username: info[0],
            csrftoken: getCookieByName('csrftoken',loginPostCookie[0]),
            sessionid: getCookieByName('sessionid',loginPostCookie[1]),
            emb: info[2]
        };
        vscode.commands.executeCommand('eoj-helper.refresh-userinfo');
        vscode.commands.executeCommand('eoj-helper.refresh-problems');
        vscode.commands.executeCommand('eoj-helper.refresh-contests');
        context.secrets.store('csrftoken', getCookieByName('csrftoken',loginPostCookie[0]));
        context.secrets.store('sessionid', getCookieByName('sessionid',loginPostCookie[1]));
    }
    else {
        vscode.window.showErrorMessage("登录失败！请确保用户名、密码和验证码均正确。");
    }
}

export async function logout() {
    const context = await vscode.commands.executeCommand('eoj-helper.get-context') as vscode.ExtensionContext;

    const logoutResponse = await fetch("https://acm.ecnu.edu.cn/logout", {
        method: 'GET',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
            'Connection': 'keep-alive',
            'Host': 'acm.ecnu.edu.cn',
            "Cookie": "csrftoken:"+shared.loginInfo.csrftoken+' ;sessionid='+shared.loginInfo.sessionid,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
        },
        redirect: 'manual',
    });

    shared.loginInfo = {
        isLogin: false,
        username: null,
        csrftoken: null,
        sessionid: null,
        emb: null
    };
    vscode.commands.executeCommand('eoj-helper.refresh-userinfo');
    vscode.commands.executeCommand('eoj-helper.refresh-problems');
    vscode.commands.executeCommand('eoj-helper.refresh-contests');
    context.secrets.delete('csrftoken');
    context.secrets.delete('sessionid');
    vscode.window.showInformationMessage("已登出！");
}