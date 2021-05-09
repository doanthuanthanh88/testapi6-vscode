import { existsSync, readFileSync, writeFileSync } from 'fs';
import { load } from 'js-yaml';
import { homedir } from 'os';
import * as path from 'path';
import { SCHEMA } from 'testapi6/dist/components/index';
import * as vscode from 'vscode';

export class TestApi6Provider implements vscode.TreeDataProvider<TestApi6Item> {
  private list = {} as any

  constructor(public dataFile = path.join(homedir(), '.testapi6.data')) {
    this.load()
  }

  load() {
    if (!existsSync(this.dataFile)) {
      this.save()
    } else {
      const content = readFileSync(this.dataFile).toString()
      const list = JSON.parse(content) as any[]
      if (Array.isArray(list)) {
        // Migrate old data
        list.forEach((item: any) => {
          this.upsert(item.label, item.src, '')
        })
      } else {
        this.list = list
      }
    }
  }

  save() {
    writeFileSync(this.dataFile, JSON.stringify(this.list))
  }

  getTreeItem(element: TestApi6Item): vscode.TreeItem {
    return element;
  }

  // contains(src: string) {
  //   return this.list.find(e => e.src === src)
  // }

  remove(src: string, folder: string, isReload = true) {
    if (folder) {
      if (this.list[folder]) {
        const k = folder
        const idx = this.list[k].findIndex((item: any) => item.src === src)
        if (idx !== -1) {
          this.list[k].splice(idx, 1)
        }
        if (!this.list[k].length) {
          delete this.list[k]
        }
      }
    } else {
      Object.keys(this.list).forEach((k: string) => {
        const idx = this.list[k].findIndex((item: any) => item.src === src)
        if (idx !== -1) {
          this.list[k].splice(idx, 1)
        }
        if (!this.list[k].length) {
          delete this.list[k]
        }
      })
    }
    if (isReload) {
      this.refresh()
      this.save()
    }
  }

  upsert(label: string, src: string, folder: string) {
    this.remove(src, folder, false)
    const newFolder = label.substr(0, label.lastIndexOf('/')) || folder || 'default'
    label = label.substr(label.lastIndexOf('/') + 1)
    // Remove old
    if (newFolder !== folder) this.remove(src, newFolder, false)
    // Add new
    if (!this.list[newFolder]) this.list[newFolder] = []
    let item = this.list[newFolder].find((e: any) => e.src === src)
    if (item) {
      item.label = label
    } else {
      this.list[newFolder].push({
        folder: newFolder,
        label,
        src
      })
    }
    this.list[newFolder].sort((a: any, b: any) => {
      return a.folder > b.folder ? 1 : a.folder < b.folder ? -1 : a.label > b.label ? 1 : a.label < b.label ? -1 : 0
    })
    this.refresh()
    this.save()
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6Item | undefined | null | void> = new vscode.EventEmitter<TestApi6Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6Item | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: TestApi6Item) {
    let childs = []
    if (!element) {
      childs = Object.keys(this.list).sort().map(k => {
        return {
          context: 'root',
          label: k.toUpperCase(),
          folder: k.toUpperCase(),
          src: '',
          description: '',
          childs: this.list[k]
        }
      })
    } else {
      childs = element.childs
    }
    return childs.map((item: any) => {
      if (item.src) {
        try {
          const root = load(readFileSync(item.src.toString()).toString(), { schema: SCHEMA }) as any
          let items = [] as any[]
          if (Array.isArray(root)) {
            items = root
          } else if (root.steps && Array.isArray(root.steps)) {
            items = root.steps
          }
          item.childs = items
            .filter(tag => typeof tag === 'object' && Object.keys(tag)[0] === 'Import')
            .map(tag => {
              const obj = typeof tag['Import'] === 'string' ? { label: path.basename(tag['Import']), src: tag['Import'] } : { label: tag['Import'].title || path.basename(tag['Import']), src: tag['Import'].src }
              return { label: obj.label, src: path.join(path.dirname(item.src), obj.src) }
            })
        } catch (err) {
          return new TestApi6Item('file', err.message, item.src, item.folder, [], item.src, vscode.TreeItemCollapsibleState.None)
        }
      }
      return new TestApi6Item(item.context === 'root' ? 'root' : item.childs.length ? 'folder' : 'file', item.label, item.src, item.folder, item.childs, item.description || '', item.childs.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    })
  }

}

export class TestApi6Item extends vscode.TreeItem {
  constructor(
    public context: 'root' | 'folder' | 'file',
    public _label: string,
    public readonly src: string,
    public readonly folder: any,
    public readonly childs: any[],
    public readonly description: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super('', collapsibleState);
    this.contextValue = context
    this.tooltip = this.src || ''
  }

  get labelText() {
    if (!this.label) return ''
    return this.label.replaceAll('★ ', '').replaceAll('├ ', '')
  }

  get folderText() {
    if (!this.folder) return ''
    return this.folder.replaceAll('★ ', '').replaceAll('├ ', '')
  }

  // @ts-ignore
  set label(_: any) { }

  // @ts-ignore
  get label() {
    // const dir = this._label.substr(0, this._label.lastIndexOf('/'))
    return (this.context === 'root' ? '★ ' : this.context === 'file' ? '├ ' : this.context === 'folder' ? '├ ' : '') + this._label
    // return dir.length > 0 ? a.replace(dir + '/', '') : a
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'TestApi6Item.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'TestApi6Item.svg')
  // };
}
