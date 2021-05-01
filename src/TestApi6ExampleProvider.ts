import * as vscode from 'vscode';
import 'testapi6/dist/init'
import { Method, Templates } from 'testapi6/dist/components';
import { context } from 'testapi6/dist/Context'
import { loadAll } from 'js-yaml';
import fetch from 'node-fetch';

export class TestApi6ExampleProvider implements vscode.TreeDataProvider<TestApi6ExampleItem> {
  private list = [] as any[]

  constructor() { }

  async load() {
    const list = [] as any
    try {
      const res = await fetch('https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/test/index.yaml', {
        method: 'GET'
      })
      const tmp = await res.text()
      const [cnt] = loadAll(tmp) as any[]
      const examples = cnt.steps.map((e: any) => e && e['Import']).filter((e: string) => e)
      const tree = examples.reduce((sum: any, e: string) => {
        const paths = e.split('/')
        let pt = sum
        paths.forEach((p, i) => {
          if (i !== paths.length - 1) {
            if (!pt[paths[i]]) pt[paths[i]] = {}
            pt = pt[paths[i]]
          } else {
            if (!pt.$files) pt.$files = []
            pt.$files.push({ name: p, fullpath: e })
          }
        })
        return sum
      }, {})
      Object.keys(tree).forEach(k => {
        if (k !== '$files') {
          list.push(new TestApi6ExampleItem('folder', k, k, tree[k], vscode.TreeItemCollapsibleState.Collapsed))
        } else {
          tree[k].forEach((e: any) => {
            list.push(new TestApi6ExampleItem('file', e.name, `https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/test/${e.fullpath}`, {}, vscode.TreeItemCollapsibleState.None))
          })
        }
      })
    } finally {
      this.list = list
      this.refresh()
    }
  }

  async getContent(f: string) {
    const res = await fetch(f, {
      method: 'GET'
    })
    const tmp = await res.text()
    return tmp
  }

  getTreeItem(element: TestApi6ExampleItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6ExampleItem | undefined | null | void> = new vscode.EventEmitter<TestApi6ExampleItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6ExampleItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: TestApi6ExampleItem) {
    let list = []
    if (!element) {
      list = this.list
    } else {
      const tree = element.info
      Object.keys(tree).forEach(k => {
        if (k !== '$files') {
          list.push(new TestApi6ExampleItem('folder', k, k, tree[k], vscode.TreeItemCollapsibleState.Collapsed))
        } else {
          tree[k].forEach((e: any) => {
            list.push(new TestApi6ExampleItem('file', e.name, `https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/test/${e.fullpath}`, {}, vscode.TreeItemCollapsibleState.None))
          })
        }
      })
    }
    return list
  }

}

export class TestApi6ExampleItem extends vscode.TreeItem {
  constructor(
    public readonly tag: string,
    public readonly title: string,
    readonly des: string,
    public readonly info: any,
    public collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super('', collapsibleState);
    this.label = this.title
    this.description = this.des
    this.tooltip = this.des
    this.contextValue = tag
  }
}
