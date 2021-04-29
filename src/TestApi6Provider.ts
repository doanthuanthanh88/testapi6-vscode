import * as vscode from 'vscode';
import * as path from 'path';
import { load } from 'js-yaml'
import { homedir } from 'os'
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { SCHEMA } from 'testapi6/dist/components/index'

export class TestApi6Provider implements vscode.TreeDataProvider<TestApi6Item> {
  private list = [] as any[]

  get _list() {
    return this.list.map(e => {
      return {
        label: e.label,
        src: e.src,
        collapsibleState: e.collapsibleState
      }
    })
  }

  constructor(public dataFile = path.join(homedir(), '.testapi6.data')) {
    this.load()
  }

  load() {
    if (!existsSync(this.dataFile)) {
      this.save()
    } else {
      const content = readFileSync(this.dataFile).toString()
      this.list = (JSON.parse(content) as any[]).map(e => new TestApiRootItem(e.label, e.src, e.collapsibleState, 0))
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

  remove(item: TestApiRootItem) {
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
      item.label = label
    } else {
      item = new TestApiRootItem(label, src, vscode.TreeItemCollapsibleState.Collapsed, 0)
      this.list.push(item)
    }
    this.refresh()
    this.save()
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6Item | undefined | null | void> = new vscode.EventEmitter<TestApi6Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6Item | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: TestApi6Item) {
    let list = []
    if (!element) list = this.list
    else {
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
          return new TestApiChildItem(file, path.join(path.dirname(element.src), file), vscode.TreeItemCollapsibleState.Collapsed, element.level + 1)
        })
      } catch (err) {
        return [new TestApiChildItem('❌ Could not load this file', err.message, vscode.TreeItemCollapsibleState.None, -1)]
      }
    }

    for (const l of list) {
      const c = await this.getChildren(l) as any
      if (c.length === 0) {
        l.collapsibleState = vscode.TreeItemCollapsibleState.None
      }
    }

    list.sort((a, b) => a.label.toLowerCase() < b.label.toLowerCase() ? -1 : a.label.toLowerCase() > b.label.toLowerCase() ? 1 : 0)

    return list
  }

}

export abstract class TestApi6Item extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly src: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly level: number,
  ) {
    super(label, collapsibleState);
    this.tooltip = this.src
    const start = this.src.length - 27
    this.description = '...' + this.src.substr(start > 0 ? start : 0);
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'TestApi6Item.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'TestApi6Item.svg')
  // };
}

export class TestApiRootItem extends TestApi6Item {
  level = 0
}

export class TestApiChildItem extends TestApi6Item {
  level = 1
}