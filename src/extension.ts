import * as vscode from 'vscode';
import { UserInfoProvider } from './userProvider';
import { login, logout } from './auth';
import { ProblemProvider } from './problemProvider';
import { searchProblem, ProblemNode, ExtensionPickItem, submitProblem } from './problem';
import { getProblemView } from './webview/problemView';
import fetch from "node-fetch";
import { getCookieByName } from './utils';
import { addContest, removeContest } from './contest';
import { ContestInfo, ContestProvider } from './contestProvider';

const shared = require('./shared');
const cheerio = require('cheerio');

export async function activate(context: vscode.ExtensionContext) {	
	const userInfo = new UserInfoProvider();
	const problemProvider = new ProblemProvider();
	const contestProvider = new ContestProvider();

	let disposables: vscode.Disposable[] = [
		vscode.window.registerTreeDataProvider('userInfo', userInfo),
		vscode.window.registerTreeDataProvider('problemList', problemProvider),
		vscode.window.registerTreeDataProvider('contestList', contestProvider),
		vscode.commands.registerCommand('eoj-helper.login', login),
		vscode.commands.registerCommand('eoj-helper.logout', logout),
		vscode.commands.registerCommand('eoj-helper.refresh-userinfo', () => {
			userInfo.refresh();
		}),
		vscode.commands.registerCommand('eoj-helper.refresh-problems', () => {
			problemProvider.refresh();
		}),
		vscode.commands.registerCommand('eoj-helper.search-problem', searchProblem),
		vscode.commands.registerCommand('eoj-helper.show-problem-detail', async function(node: ProblemNode) {
			await vscode.window.withProgress({location: vscode.ProgressLocation.Notification}, async (p: vscode.Progress<{}>) => {
                const message = "正在获取题目详情...";
                p.report({message});
                const problemDetailResponse = await fetch(node.url, {
					method: 'GET',
					headers: {
						'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
						'Accept-Encoding': 'gzip, deflate, br',
						'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
						'Connection': 'keep-alive',
						'Host': 'acm.ecnu.edu.cn',
						"Cookie": "csrftoken:"+shared.loginInfo.csrftoken+' ;sessionid='+shared.loginInfo.sessionid,
						'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
					}
				});
	
				const contents = await problemDetailResponse.text();
				const $ = cheerio.load(contents);
				const problemHeader = $('.problem-header').html();
				const problemBody = $('.problem-body').html();
				const formCsrfToken = $("[name='csrfmiddlewaretoken']").val();
				
				const problemFormCookie = await problemDetailResponse.headers.raw()['set-cookie'];
				const cookieCsrfToken = getCookieByName('csrftoken', problemFormCookie[0]);
	
				const panel = vscode.window.createWebviewPanel(
					"problemView",
					"EOJ-题目详情",
					vscode.ViewColumn.Two,
					{
						enableScripts: true,
					}
				);
				panel.webview.html = getProblemView(node.name, problemHeader, problemBody, node.url);
	
				panel.webview.onDidReceiveMessage(async function(message) {
						switch (message.command) {
							case 'code':
								const quickPick = await vscode.window.createQuickPick();
								quickPick.items = [new ExtensionPickItem<number>('新建文件',1), new ExtensionPickItem<number>('打开已有文件',2)];
								quickPick.onDidHide(() => quickPick.dispose());
								quickPick.onDidChangeSelection(function(selection) {
									if(selection[0]) {
										const value: number = (selection[0] as ExtensionPickItem<number>).value;
										switch(value) {
											case 1:
												vscode.workspace.openTextDocument().then(doc => {
													vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
												});
												break;
											case 2:
												vscode.window.showOpenDialog().then(uri => {
													if(uri !== undefined && uri.length >= 1) {
														vscode.workspace.openTextDocument(uri[0]).then(doc => {
															vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
														});
													}
												});
												break;
										}
									}
									quickPick.hide();
								});
								quickPick.show();
								break;
							case 'submit':
								vscode.commands.executeCommand('eoj-helper.submit', cookieCsrfToken, formCsrfToken, node);
								break;
						}
					},
					undefined,
					context.subscriptions
				);
            });
		}),
		vscode.commands.registerCommand('eoj-helper.submit', (cookieCsrfToken: string, formCsrfToken: string, node: ProblemNode) => submitProblem(cookieCsrfToken, formCsrfToken, node)),
		vscode.commands.registerCommand('eoj-helper.add-contest', addContest),
		vscode.commands.registerCommand('eoj-helper.refresh-contests', () => {
			contestProvider.refresh();
		}),
		vscode.commands.registerCommand('eoj-helper.remove-contest', (info: ContestInfo)=>removeContest(info)),
		vscode.commands.registerCommand('eoj-helper.get-context', () => context)
	];

	context.subscriptions.push(...disposables);

	const csrftoken = await context.secrets.get('csrftoken');
	const sessionid = await context.secrets.get('sessionid');

	if(csrftoken === undefined || sessionid === undefined) {
		shared.loginInfo = {
			isLogin: false,
			username: null,
			csrftoken: null,
			sessionid: null,
			emb: null
		};
		context.secrets.delete('csrftoken');
    	context.secrets.delete('sessionid');
	}
	else {
		const homeResponse = await fetch('https://acm.ecnu.edu.cn/', {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
                'Cookie': 'csrftoken='+csrftoken+'; sessionid='+sessionid,
                'Connection': 'keep-alive',
                'Host': 'acm.ecnu.edu.cn',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
            }
        });
		const home = await homeResponse.text();
        const $ = cheerio.load(home);
		let info = $(".ui.dropdown.simple.item").text();
		if (info === '') {
			shared.loginInfo = {
				isLogin: false,
				username: null,
				csrftoken: null,
				sessionid: null,
				emb: null
			};
			context.secrets.delete('csrftoken');
    		context.secrets.delete('sessionid');
		}
		else {
			info = info.replaceAll('\n',' ');
        	info = info.trim();
        	info = info.split(/\s+/);
			shared.loginInfo = {
				isLogin: true,
				username: info[0],
				csrftoken: csrftoken,
				sessionid: sessionid,
				emb: info[2]
			};
		}
	}

	vscode.commands.executeCommand('eoj-helper.refresh-userinfo');
	vscode.commands.executeCommand('eoj-helper.refresh-problems');
	vscode.commands.executeCommand('eoj-helper.refresh-contests');
}

export function deactivate() {}


