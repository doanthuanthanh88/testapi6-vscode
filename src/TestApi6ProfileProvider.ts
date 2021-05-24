import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dump, load } from 'js-yaml';
import { homedir } from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { TestApi6Item } from './TestApi6Item';

export class TestApi6ProfileProvider implements vscode.TreeDataProvider<TestApi6Item> {
  private list = {} as any
  profileName?: string

  constructor(public dataFile = path.join(homedir(), '.testapi6.profile.yaml')) {
    this.load()
  }

  get profile() {
    return this.profileName ? this.list[this.profileName] : {}
  }

  load() {
    if (!existsSync(this.dataFile)) {
      this.newOne()
    } else {
      const content = readFileSync(this.dataFile).toString()
      const list = load(content) as any[]
      this.list = list
    }
  }

  save() {
    writeFileSync(this.dataFile, JSON.stringify(this.list))
  }

  newOne() {
    try {
      const content = readFileSync(this.dataFile).toString()
      if (!content) throw new Error('Init now')
    } catch {
      writeFileSync(this.dataFile, dump({ Development: { baseURL: 'http://localhost:3000' } }))
    }
  }

  getTreeItem(element: TestApi6Item): vscode.TreeItem {
    return element;
  }

  pick(name: string, isPick = true) {
    this.profileName = name === this.profileName ? undefined : name
    this.refresh()
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6Item | undefined | null | void> = new vscode.EventEmitter<TestApi6Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6Item | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: TestApi6Item) {
    if (!element) {
      return Object.keys(this.list).map(e => {
        const item = new TestApi6Item('root', e, JSON.stringify(this.list[e], null, '  '), '', undefined, this.list[e], '( profile )', vscode.TreeItemCollapsibleState.Collapsed)
        item.isPick = (item._label === this.profileName)
        return item
      })
    } else {
      const childs = element.childs as any
      if (childs) {
        return Object.keys(childs).map(e => new TestApi6Item('file', e, JSON.stringify(childs[e], null, '  '), '', undefined, undefined as any, JSON.stringify(childs[e]), vscode.TreeItemCollapsibleState.None))
      }
    }
  }
}
