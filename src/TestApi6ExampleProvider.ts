import { sortBy } from 'lodash';
import fetch from 'node-fetch';
import 'testapi6/dist/init';
import * as vscode from 'vscode';

type Child = { name: string, childs: Child[] }

export class TestApi6ExampleProvider implements vscode.TreeDataProvider<TestApi6ExampleItem> {
  private list = {} as { [name: string]: Child[] }

  constructor() { }

  async load() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/vscode_example.json', {
        method: 'GET'
      })
      const tmp = await res.text()
      this.list = JSON.parse(tmp) as any
    } finally {
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
      for (const name in this.list) {
        let rootPath = ''
        const childs = this.list[name]
        list.push(new TestApi6ExampleItem('folder', name.toUpperCase(), '', { rootPath: `${rootPath}${name}/`, childs }, vscode.TreeItemCollapsibleState.Collapsed));
      }
    } else {
      const rootPath = element.info.rootPath
      sortBy(element.info.childs, ['name'])
      const listFolders = []
      for (const item of element.info.childs) {
        const { name, childs } = item
        if (!childs) {
          list.push(new TestApi6ExampleItem('file', name, '', { url: `https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/${rootPath}${name}` }, vscode.TreeItemCollapsibleState.None))
        } else {
          listFolders.push(new TestApi6ExampleItem('folder', name, '', { rootPath: `${rootPath}${name}/`, childs }, vscode.TreeItemCollapsibleState.Collapsed));
        }
      }
      list = list.concat(listFolders)
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
    this.label = (tag === 'file' ? (!info.url.includes('/examples/assets/') ? '‣ ' : '- ') : '') + this.title
    this.description = this.des
    this.tooltip = this.des
    this.contextValue = tag
  }
}
