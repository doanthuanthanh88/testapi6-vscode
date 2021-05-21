import { existsSync, readFileSync, writeFileSync } from 'fs';
import { load } from 'js-yaml';
import moment = require('moment');
import { homedir } from 'os';
import * as path from 'path';
import { SCHEMA } from 'testapi6/dist/components/index';
import * as vscode from 'vscode';
import { TestApi6Item } from './TestApi6Item';

export class TestApi6HistoryProvider implements vscode.TreeDataProvider<TestApi6Item> {
  private list = [] as any[]

  constructor(public dataFile = path.join(homedir(), '.testapi6.history')) {
    this.load()
  }

  load() {
    if (!existsSync(this.dataFile)) {
      this.push()
    } else {
      const content = readFileSync(this.dataFile).toString()
      const list = JSON.parse(content) as any[]
      this.list = list
    }
  }

  push(item?: {
    _label?: string,
    src?: string,
    cmd?: string,
    des?: string
    context?: string,
    id?: string
  }) {
    if (item) {
      item.id = `${item._label}:${item.src}:${item.cmd}`
      item.des = moment().format('HH:mm:ss')
      if (this.list[0]?.id === item.id) {
        this.list.splice(0, 1, item)
      } else {
        this.list.splice(0, 0, item)
      }
    }
    if (this.list.length > 30) this.list.pop()
    this.refresh()
    writeFileSync(this.dataFile, JSON.stringify(this.list))
  }

  getTreeItem(element: TestApi6Item): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6Item | undefined | null | void> = new vscode.EventEmitter<TestApi6Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6Item | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(_element?: TestApi6Item) {
    return this.list.map((k: any) => {
      return new TestApi6Item(k.context || 'file', k.des, k.src, k.cmd, '', [], `${k._label}`, vscode.TreeItemCollapsibleState.None)
    })
  }
}
