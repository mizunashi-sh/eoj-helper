import * as vscode from 'vscode';
import fetch from "node-fetch";
import { ContestInfo } from './contestProvider';

const shared = require('./shared');

export async function addContest() {
    if (!shared.loginInfo.isLogin) {
        vscode.window.showErrorMessage('请登录之后再添加比赛/作业');
        return;
    }
    let contestConfig = await vscode.workspace.getConfiguration('eoj-helper');
    let contestList = await contestConfig.get<Array<string>>('contestList');

    const validator = /^https:\/\/acm.ecnu.edu.cn\/contest\/[0-9a-zA-Z]+(\/)?/;
    const contestURL = await vscode.window.showInputBox({
        prompt: "输入比赛/作业的URL：",
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (validator.test(value)) {
                return null;
            }
            else {
                return "请输入合法的URL";
            }
        }
    });

    if (contestURL !== undefined) {
        if(contestList?.includes(contestURL)) {
            vscode.window.showErrorMessage('已经添加过该比赛/作业');
            return;
        }

        const contestInfoResponse = await fetch(contestURL + '/', {
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
        if (await contestInfoResponse.status !== 200) {
            vscode.window.showErrorMessage('添加失败，比赛/作业不存在！');
        }
        else {
            contestList?.push(contestURL);
            await contestConfig.update('contestList',contestList, true);
            vscode.commands.executeCommand('eoj-helper.refresh-contests');
        }
    }
}

export async function removeContest(info: ContestInfo) {
    let contestConfig = await vscode.workspace.getConfiguration('eoj-helper');
    let contestList = contestConfig.get<Array<string>>('contestList');

    contestList?.forEach((item,index,contestList)=>{
        if(item === info.contestURL) {
            contestList.splice(index,1);
        }
    });
    await contestConfig.update('contestList',contestList, true);
    vscode.commands.executeCommand('eoj-helper.refresh-contests');
}