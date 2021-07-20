import { existsSync, readFileSync } from 'fs';
import { load } from 'js-yaml';
import * as path from 'path';
import { SCHEMA } from 'testapi6/dist/components/index';
import * as vscode from 'vscode';
import { TestApi6Item } from './TestApi6Item';

export class TestApi6LocalProvider implements vscode.TreeDataProvider<TestApi6Item> {
  list = {} as any

  constructor(public dataFiles: string[] = []) {
    this.init()
  }

  init() {
    for (const f of this.dataFiles) {
      this.load(f)
    }
  }

  load(f: string) {
    this.list = {}
    const dataFile = path.join(f, '.yaml')
    if (!existsSync(dataFile)) {
      return
    } else {
      const content = readFileSync(dataFile).toString()
      const conf = load(content) as any[]
      for (const _group of conf) {
        const group = Object.keys(_group)[0]
        this.list[group] = []
        for (const _name of _group[group]) {
          const name = Object.keys(_name)[0]
          this.list[group].push({
            folder: 'root',
            label: name,
            src: _name[name].endsWith('.yaml') ? path.join(f, _name[name]) : undefined,
            cmd: !_name[name].endsWith('.yaml') ? (Array.isArray(_name[name]) ? _name[name] : _name[name].split('&&')) : undefined,
            description: _name[name] || ''
          })
        }
      }
    }
  }

  getTreeItem(element: TestApi6Item): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6Item | undefined | null | void> = new vscode.EventEmitter<TestApi6Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6Item | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this.init()
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: TestApi6Item) {
    let childs = []
    if (!element) {
      childs = Object.keys(this.list).map(k => {
        return {
          context: 'root',
          label: k.toUpperCase(),
          folder: k.toUpperCase(),
          src: '',
          cmd: '',
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
          return new TestApi6Item('file', err.message, item.src, item.cmd, item.folder, [], item.src ? `( ${item.src} )` : '', vscode.TreeItemCollapsibleState.None)
        }
      } else if (item.cmd) {
        return new TestApi6Item('cmd', item.label, item.src, item.cmd, item.folder, item.childs, item.description ? `( ${item.description} )` : '', vscode.TreeItemCollapsibleState.None)
      }
      return new TestApi6Item(item.context === 'root' ? 'root' : item.childs?.length ? 'folder' : 'file', item.label, item.src, item.cmd, item.folder, item.childs, item.description ? `( ${item.description} )` : '', item.childs?.length ? (element ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded) : vscode.TreeItemCollapsibleState.None)
    })
  }
}
