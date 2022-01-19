import * as vscode from 'vscode';
import fetch from "node-fetch";
import { ProblemNode } from './problem';

const shared = require('./shared');
const cheerio = require('cheerio');

export class ProblemProvider implements vscode.TreeDataProvider<ProblemInfo> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProblemInfo | undefined | null | void> = new vscode.EventEmitter<ProblemInfo | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProblemInfo | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProblemInfo): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ProblemInfo): Promise<ProblemInfo[]> {
        if (!shared.loginInfo.isLogin) {
            return Promise.resolve([]);
        }

        if(element) {
            if(element.contextValue === 'category') {
                const childrens: ProblemInfo[] = [];
                var problemItems = await getProblemByCategory(element.label);
                for(var item of problemItems) {
                    childrens.push(new ProblemInfo(item.title, item.url, item.id, 'problem', vscode.TreeItemCollapsibleState.None));
                }
                return childrens;
            }

            return Promise.resolve([]);
        }

        const result: ProblemInfo[] = [];
        const categories = ['时下流行', '未解之谜', '挑战难题', '刷刷水题', '巩固已学习', '学习新的'];
        for(var category of categories) {
            result.push(new ProblemInfo(category,'','','category',vscode.TreeItemCollapsibleState.Collapsed));
        }
        result.push(new ProblemInfo('搜索更多','','','search',vscode.TreeItemCollapsibleState.None));
        return Promise.resolve(result);
    }
}

class ProblemInfo extends vscode.TreeItem {
    public problemID: string;
    public problemURL: string;
    constructor(
        public readonly label: string,
        url: string,
        id: string,
        option: string,  
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.contextValue = option;
        this.problemID = id;
        this.problemURL = url;

        switch(option) {
            case 'category':
                this.iconPath = new vscode.ThemeIcon('folder');
                break;
            case 'problem':
                this.iconPath = new vscode.ThemeIcon('book');
                this.command = {
                    command: 'eoj-helper.show-problem-detail',
                    title: '查看详情',
                    arguments: [new ProblemNode(this.label, this.problemURL, this.problemID, 'single', '')]
                };
                break;
            case 'search':
                this.iconPath = new vscode.ThemeIcon('search');
                this.command = {
                    command: 'eoj-helper.search-problem',
                    title: '搜索题目'
                };
                break;
        }
    }
}

async function getProblemByCategory(category: string) {
    const problemListResponse = await fetch("https://acm.ecnu.edu.cn/problem/recommending/", {
        method: 'GET',
        headers: {
            'Cookie': 'csrftoken='+shared.loginInfo.csrftoken+' ;sessionid='+shared.loginInfo.sessionid,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
            'Connection': 'keep-alive',
            'Host': 'acm.ecnu.edu.cn',
            'Referer': 'https://acm.ecnu.edu.cn/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
        }
    });

    const problemList = await problemListResponse.text();
    const $ = cheerio.load(problemList);

    var tableItem: any[] = [];
    $('table:contains('+category+') tr').each(function(this: any) {
        var res = $(this).find('td').eq(0).html();
        tableItem.push(res);
    });

    var infoItems: any[] = [];
    for(var item of tableItem) {
        if(item !== null){
            var info = {
                title: '',
                url: '',
                id: ''
            };
            const $ = cheerio.load(item);
            var problemTitle = $('a:first').text();
            var problemURL = $('a:first').attr('href');

            var problemURLElements = problemURL.replaceAll('/', ' ').trim().split(' ');
        
            info.title = problemTitle;
            info.url = 'https://acm.ecnu.edu.cn'+problemURL;
            info.id = problemURLElements[1];

            infoItems.push(info);
        }
    }

    return infoItems;
}