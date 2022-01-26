import * as vscode from 'vscode';
import fetch from "node-fetch";
import { ProblemNode } from './problem';

const shared = require('./shared');
const cheerio = require('cheerio');

export class ContestProvider implements vscode.TreeDataProvider<ContestInfo> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContestInfo | undefined | null | void> = new vscode.EventEmitter<ContestInfo | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContestInfo | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ContestInfo): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ContestInfo): Promise<ContestInfo[]> {
        if (!shared.loginInfo.isLogin) {
            return Promise.resolve([]);
        }
        if(element?.contextValue === 'contest') {
            const childrens: ContestInfo[] = [];
            var problemItems = getProblemByContest(element.contestURL);
            for(var item of await problemItems) {
                childrens.push(new ContestInfo(item.title, element.contestURL, item.id, 'https://acm.ecnu.edu.cn'+item.url, 'problem', vscode.TreeItemCollapsibleState.None));
            }
            return Promise.resolve(childrens);
        }

        const result: ContestInfo[] = [];
        const contestList = await vscode.workspace.getConfiguration('eoj-helper').get<Array<string>>('contestList');
        if(contestList !== undefined) {
            for(var i=0; i<contestList.length; i++) {
                const contestInfoResponse = await fetch(contestList[i] + '/', {
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
                const contestInfo = await contestInfoResponse.text();
                const $ = cheerio.load(contestInfo);
                const contestName = $('h1:first').text();

                result.push(new ContestInfo(contestName, contestList[i], '', '', 'contest', vscode.TreeItemCollapsibleState.Collapsed));
            }
        }
        return Promise.resolve(result);
    }
}

export class ContestInfo extends vscode.TreeItem {
    public contestURL: string;
    public problemID: string;
    public problemURL: string;

    constructor(
        public readonly label: string,
        contestUrl: string,
        problemId: string,
        problemUrl: string,
        option: string,  
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.contextValue = option;
        this.contestURL = contestUrl;
        this.problemID = problemId;
        this.problemURL = problemUrl;

        switch(option) {
            case 'contest':
                this.iconPath = new vscode.ThemeIcon('folder');
                break;
            case 'problem':
                this.iconPath = new vscode.ThemeIcon('book');
                this.command = {
                    command: 'eoj-helper.show-problem-detail',
                    title: '查看详情',
                    arguments: [new ProblemNode(this.label, this.problemURL, this.problemID, 'contest', this.contestURL)]
                };
                break;
        }
    }
}

async function getProblemByContest(contestUrl: string) {
    const problemListResponse = await fetch(contestUrl+'/', {
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

    var tableItems: any[] = [];
    $('table:first').find('tr').each(function(this: any){ 
        var idItem = $(this).find('td').eq(0).text();
        var titleLinkItem = $(this).find('td').eq(1).html();
        tableItems.push({
            id: idItem,
            titleLink: titleLinkItem
        });
    });

    var infoItems: any[] = [];
    for(var item of tableItems) {
        if(item.titleLink !== null) {
            const $ = cheerio.load(item.titleLink);
            var problemTitle = $('a:first').text();
            var problemURL = $('a:first').attr('href');
             
            infoItems.push({
                title: problemTitle.trim(),
                url: problemURL,
                id: item.id
            });
        }
    }

    return infoItems;
}