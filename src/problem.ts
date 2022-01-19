import * as vscode from 'vscode';
import fetch from "node-fetch";
import { getJudgeView } from './webview/judgeView';
import { sleep } from './utils';

const shared = require('./shared');
const cheerio = require('cheerio');

const langs = [
    {
        label: 'C',
        value: 'c'
    },
    {
        label: 'C++ 11',
        value: 'cpp'
    },
    {
        label: 'C++ 14',
        value: 'cc14'
    },
    {
        label: 'C++ 17',
        value: 'cc17'
    },
    {
        label: 'Python 2',
        value: 'py2'
    },
    {
        label: 'Python 3',
        value: 'python'
    },
    {
        label: 'PyPy',
        value: 'pypy'
    },
    {
        label: 'PyPy 3',
        value: 'pypy3'
    },
    {
        label: 'Java 8',
        value: 'java'
    },
    {
        label: 'Pascal',
        value: 'pas'
    },
    {
        label: 'Text',
        value: 'text'
    },
];

export class ExtensionPickItem<T> implements vscode.QuickPickItem {
    label: string;
    value: T;
    description?: string | undefined;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;
    buttons?: readonly vscode.QuickInputButton[] | undefined;
    
    constructor(label: string, value:T) {
        this.label = label;
        this.value = value;
    }
}

export class ProblemNode {
    name: string;
    url: string;
    id: string;
    type: string;
    contestURL: string;

    constructor(name: string, url: string, id: string, type: string, contest: string) {
        this.name = name;
        this.url = url;
        this.id = id;
        this.type = type;
        this.contestURL = contest;
    }
};

export async function searchProblem() {
    const quickPick = await vscode.window.createQuickPick();

    quickPick.items = [];
    quickPick.placeholder = '搜索题目';
    quickPick.onDidChangeValue(async function(value:string) {
        if(value.trim() !== '') {
            var result: vscode.QuickPickItem[] = [];
            const searchResponse = await fetch('https://acm.ecnu.edu.cn/api/search/problem/?kw='+encodeURI(value), {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
                    'Connection': 'keep-alive',
                    'Host': 'acm.ecnu.edu.cn',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
                }
            });

            const responseBody:any = await searchResponse.json();
            const resultItems = responseBody.results;
            for(var item of resultItems) {
                const node: ProblemNode = new ProblemNode(item.name, 'https://acm.ecnu.edu.cn/problem/'+item.value.toString()+'/', item.value.toString(),'single', '');
                result.push(new ExtensionPickItem<ProblemNode>(item.name, node));
            }
            quickPick.items = result;
        }
        else {
            quickPick.items = [];
        }
    });
    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.onDidChangeSelection(async function(selection) {
        if(selection[0]) {
            const value: ProblemNode = await (selection[0] as ExtensionPickItem<ProblemNode>).value;
            vscode.commands.executeCommand('eoj-helper.show-problem-detail', value);
        }
        quickPick.hide();
    });
    quickPick.show();
}

export async function submitProblem(cookieCsrfToken: string, formCsrfToken: string, node: ProblemNode) {
    const quickPick = await vscode.window.createQuickPick();

    const langItems = [];
    for(var item of langs) {
        langItems.push(new ExtensionPickItem<string>(item.label,item.value));
    }
    quickPick.items = langItems;

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.onDidChangeSelection(async function(selection) {
        if (selection[0]) {
            const lang: string = (selection[0] as ExtensionPickItem<string>).value;
            var editor = vscode.window.activeTextEditor;
            if(!editor) {
                vscode.window.showErrorMessage('找不到源代码');
                return;
            }
            var code = editor.document.getText();
     
            const params = new URLSearchParams();
            params.append('csrfmiddlewaretoken', formCsrfToken);
            params.append('problem', node.id);
            params.append('code', code);
            params.append('lang', lang);
            if(node.type === 'contest') {
                params.append('problem', node.id);
            }

            var submitURL = node.url+'/submit/';
            if(node.type === 'contest') {
                submitURL = node.contestURL+'submit/'+node.id;
            }
            else {
                submitURL = node.url+'/submit/';
            }
            
            const submitResponse = await fetch(submitURL, {
                method: 'POST',
                headers: {
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
                    'Referer': node.url,
                    'Origin': 'https://acm.ecnu.edu.cn',
                    'Host': 'acm.ecnu.edu.cn',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
                    'X-CSRFToken': cookieCsrfToken,
                    'Cookie': 'csrftoken='+cookieCsrfToken+'; sessionid='+shared.loginInfo.sessionid
                },
                body: params
            });

            if(await submitResponse.status === 200) {
                const responseBody: any = await submitResponse.json();
                const judgeURL = responseBody.url;

                while(1) {
                    const judgeResponse = await fetch('https://acm.ecnu.edu.cn'+judgeURL, {
                        method: 'GET',
                        headers: {
                            'Accept': '*/*',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
                            'Origin': 'https://acm.ecnu.edu.cn',
                            'Host': 'acm.ecnu.edu.cn',
                            'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
                            'Cookie': 'csrftoken='+shared.loginInfo.csrftoken+'; sessionid='+shared.loginInfo.sessionid
                        }
                    });

                    const judgeContent = await judgeResponse.text();
                    const $ = cheerio.load(judgeContent);
                    const judgeStatus = $('h5[data-status]:first').attr('data-status');
                    if(judgeStatus !== '-3' && judgeStatus !== '-2') 
                    {
                        break;
                    }
                    await sleep(1000);
                }

                const judgeResponse = await fetch('https://acm.ecnu.edu.cn'+judgeURL, {
                        method: 'GET',
                        headers: {
                            'Accept': '*/*',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
                            'Origin': 'https://acm.ecnu.edu.cn',
                            'Host': 'acm.ecnu.edu.cn',
                            'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
                            'Cookie': 'csrftoken='+shared.loginInfo.csrftoken+'; sessionid='+shared.loginInfo.sessionid
                        }
                });
                const judgeContent = await judgeResponse.text();
                const $ = cheerio.load(judgeContent);
                const judgeResultHTML = $('body').html();

                const panel = vscode.window.createWebviewPanel(
                    "judgeView",
        		    "EOJ-评测结果",
        		    vscode.ViewColumn.Beside,
        		    {
            		    enableScripts: true,
        		    }
                );
                panel.webview.html = getJudgeView(judgeResultHTML);
            }
            else if(await submitResponse.status === 400) {
                const errorText = (await submitResponse.text()).toString();
                vscode.window.showErrorMessage("提交失败："+errorText);
            }
            else {
                const error = await submitResponse.text();
                vscode.window.showErrorMessage("提交失败！");
            }
        }
        quickPick.hide();
    });
    quickPick.show();
}