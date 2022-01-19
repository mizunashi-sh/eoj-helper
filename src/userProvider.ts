import * as vscode from 'vscode';

const shared = require('./shared');

export class UserInfoProvider implements vscode.TreeDataProvider<UserInfo> {
    private _onDidChangeTreeData: vscode.EventEmitter<UserInfo | undefined | null | void> = new vscode.EventEmitter<UserInfo | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<UserInfo | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: UserInfo): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: UserInfo): Promise<UserInfo[]> {
        const result: UserInfo[] = [];
        if(element) {
            return Promise.resolve(result);
        }

        const username = getUsername();
        if (username === null) {
            result.push(new UserInfo("未登录", "not-login"));
        } else {
            result.push(new UserInfo(`用户名：${username}`, "username"));
        }

        const emb = getEmb();
        if (emb === null) {
            result.push(new UserInfo("不适用", "emb"));
        } else {
            result.push(new UserInfo(`EMB：${emb}`, "emb"));
        }

        return Promise.resolve(result);
    }
}

class UserInfo extends vscode.TreeItem {
    constructor(public readonly name: string, option: string) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.contextValue = option;

        switch (option) {
            case "not-login":
            case "username":
                this.iconPath = new vscode.ThemeIcon('account');
                break;
            case "emb":
                this.iconPath = new vscode.ThemeIcon('mortar-board');
                break;
        }
    }
}

export function getUsername() {
    if(!shared.loginInfo.isLogin){
        return null;
    }
    else {
        return shared.loginInfo.username;
    }
}

export function getEmb() {
    if(!shared.loginInfo.isLogin){
        return null;
    }
    else {
        return shared.loginInfo.emb;
    }
}