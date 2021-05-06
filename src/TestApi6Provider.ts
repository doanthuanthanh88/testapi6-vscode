import { existsSync, readFileSync, writeFileSync } from 'fs';
import { load } from 'js-yaml';
import { homedir } from 'os';
import * as path from 'path';
import { SCHEMA } from 'testapi6/dist/components/index';
import * as vscode from 'vscode';

export class TestApi6Provider implements vscode.TreeDataProvider<TestApi6Item> {
  private list = [] as any[]

  get _list() {
    return this.list.filter(e => e && e.context !== 'divider').map(e => {
      const rs = {
        label: e._label.replaceAll('★ ', ''),
        src: e.src
      }
      return rs
    }).filter(e => e.label)
  }

  constructor(public dataFile = path.join(homedir(), '.testapi6.data')) {
    this.load()
  }

  load() {
    if (!existsSync(this.dataFile)) {
      this.save()
    } else {
      const content = readFileSync(this.dataFile).toString()
      this.list = (JSON.parse(content) as any[]).map(e => new TestApi6Item('folder', e.label, e.src, vscode.TreeItemCollapsibleState.Collapsed))
    }
  }

  save() {
    writeFileSync(this.dataFile, JSON.stringify(this._list))
  }

  getTreeItem(element: TestApi6Item): vscode.TreeItem {
    return element;
  }

  contains(src: string) {
    return this.list.find(e => e.src === src)
  }

  remove(item: TestApi6Item) {
    const i = this.list.findIndex(e => e.src === item.src)
    if (i !== -1) {
      this.list.splice(i, 1)
    }
    this.refresh()
    this.save()
  }

  upsert(label: string, src: string) {
    let item = this.list.find(e => e.src === src)
    if (item) {
      item._label = label
    } else {
      item = new TestApi6Item('folder', label, src, vscode.TreeItemCollapsibleState.Collapsed)
      this.list.push(item)
    }
    this.refresh()
    this.save()
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6Item | undefined | null | void> = new vscode.EventEmitter<TestApi6Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6Item | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this.list = this.list.filter(e => e.context !== 'divider')
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: TestApi6Item) {
    let list = [] as TestApi6Item[]
    if (!element) {
      list = this.list
    } else {
      try {
        const root = load(readFileSync(element.src).toString(), { schema: SCHEMA }) as any
        let items = [] as any[]
        if (Array.isArray(root)) {
          items = root
        } else if (root.steps && Array.isArray(root.steps)) {
          items = root.steps
        }
        const importItems = items.filter(tag => {
          return typeof tag === 'object' && Object.keys(tag)[0] === 'Import'
        })
        list = importItems.map(tag => {
          const file = tag[Object.keys(tag)[0]]
          return new TestApi6Item('folder', file, path.join(path.dirname(element.src), file), vscode.TreeItemCollapsibleState.Collapsed)
        })
      } catch (err) {
        return [new TestApi6Item('file', '❌ Could not load this file', err.message, vscode.TreeItemCollapsibleState.None)]
      }
    }

    list.sort((a, b) => a._label.toLowerCase() < b._label.toLowerCase() ? -1 : a._label.toLowerCase() > b._label.toLowerCase() ? 1 : 0)

    if (!element) {
      let tmp = undefined
      for (let i = list.length - 1; i >= 0; i--) {
        const a = list[i]
        const dir = a._label.substr(0, a._label.lastIndexOf('/'))
        if (tmp === undefined) {
          tmp = dir
        } else if (tmp !== dir) {
          list.splice(i + 1, 0, new TestApi6Item('divider', '★ ' + (tmp?.toUpperCase() || 'DEFAULT'), '', vscode.TreeItemCollapsibleState.None))
          tmp = dir
        }
      }
      if (tmp !== undefined) {
        list.splice(0, 0, new TestApi6Item('divider', '★ ' + (tmp?.toUpperCase() || 'DEFAULT ★'), '', vscode.TreeItemCollapsibleState.None))
      }
    }

    for (const l of list.filter(l => l.context !== 'divider')) {
      const c = await this.getChildren(l) as any
      if (c.length === 0) {
        l.collapsibleState = vscode.TreeItemCollapsibleState.None
        l.context = 'file'
      } else {
        l.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        l.context = 'folder'
      }
    }

    return list
  }

}

export class TestApi6Item extends vscode.TreeItem {
  constructor(
    public context: 'folder' | 'file' | 'divider',
    public _label: string,
    public readonly src: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super('', collapsibleState);
    this.contextValue = context
    this.tooltip = this.src || ''
    const start = this.src.length - 27
    this.description = this.context !== 'divider' ? ('...' + this.tooltip.substr(start > 0 ? start : 0)) : this.src
  }

  // @ts-ignore
  set label(_: any) { }

  // @ts-ignore
  get label() {
    const dir = this._label.substr(0, this._label.lastIndexOf('/'))
    const a = (this.context === 'file' ? '├ ' : this.context === 'folder' ? '├ ' : '') + this._label
    return dir.length > 0 ? a.replace(dir + '/', '') : a
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'TestApi6Item.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'TestApi6Item.svg')
  // };
}
