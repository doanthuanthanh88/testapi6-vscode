import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dump, load } from 'js-yaml';
import * as _ from 'lodash';
import { homedir } from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { TestApi6Item } from './TestApi6Item';

export class TestApi6ProfileProvider implements vscode.TreeDataProvider<TestApi6Item> {
  private list = {} as any
  profileData = {} as any

  constructor(public dataFile = path.join(homedir(), '.testapi6.profile.yaml')) {
    this.load()
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

  pick(key: string, value: string) {
    value = _.cloneDeep(value)
    if (!this.isPick(key, value))
      eval(`${key} = value`)
    else
      eval(`${key} = {}`)
    this.refresh()
  }

  // @ts-ignore
  isPick(key: string, value: any) {
    try {
      // @ts-ignore
      const isEqual = _.isEqual
      return eval(`isEqual(${key}, value)`)
    } catch {
      return false
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6Item | undefined | null | void> = new vscode.EventEmitter<TestApi6Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6Item | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: TestApi6Item) {
    if (!element) {
      return Object.keys(this.list).filter(e => !e.startsWith('_')).map(e => {
        const item = new TestApi6Item('root', e, this.list[e], 'this.profileData', undefined, this.list[e], '( profile )', vscode.TreeItemCollapsibleState.Collapsed)
        item.isPick = this.isPick(item.cmd, item.src)
        if (item.isPick) item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded
        return item
      })
    } else {
      const childs = element.childs as any
      if (childs) {
        return Object.keys(childs).map(e => {
          const childItems = typeof childs[e] === 'object' ? childs[e] : undefined
          const item = new TestApi6Item(childItems ? 'folder' : 'file', e, childs[e], element.cmd + '.' + e, undefined, childItems as any, childs[e], childItems ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None)
          item.isPick = this.isPick(item.cmd, item.src)
          return item
        })
      }
    }
  }
}
