import * as vscode from 'vscode';
import { load, InputYamlFile } from 'testapi6/dist/main'
import { Templates } from 'testapi6/dist/components/Templates'
import { Tag } from 'testapi6/dist/components/Tag';
import { context } from 'testapi6/dist/Context';

export class TestApi6InspectProvider implements vscode.TreeDataProvider<TestApi6InspectItem> {
  private list = [] as any[]

  constructor() { }

  async load(f: string) {
    const root = await load(new InputYamlFile(f)) as any
    await root.setup()
    this.list.push(new TestApi6InspectItem('Common', 'Global components', context.Vars, vscode.TreeItemCollapsibleState.Collapsed))
    this.list.push(new TestApi6InspectItem('---------------------------', '', context.Vars, vscode.TreeItemCollapsibleState.None))
    this.list.push(...root.group.steps.map((tag: any) => {
      const tagName = tag.tagName
      if (tagName === 'Group') {
        return new TestApi6InspectItem(tagName, '', tag, vscode.TreeItemCollapsibleState.Expanded)
      }
      return new TestApi6InspectItem(tagName, '', tag, vscode.TreeItemCollapsibleState.None)
    }))
    this.refresh()
  }

  getTreeItem(element: TestApi6InspectItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestApi6InspectItem | undefined | null | void> = new vscode.EventEmitter<TestApi6InspectItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestApi6InspectItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: TestApi6InspectItem) {
    let list = []
    if (!element) {
      list = this.list
    } else if (element.tag === 'Group') {
      list = element.info.steps.map((tag: any) => {
        const tagName = tag.tagName
        if (tagName === 'Group') {
          return new TestApi6InspectItem(tagName, '', tag, vscode.TreeItemCollapsibleState.Expanded)
        }
        if (tagName === 'Validator') {
          return new TestApi6InspectItem(tagName, '', tag, vscode.TreeItemCollapsibleState.Expanded)
        }
        return new TestApi6InspectItem(tagName, '', tag, vscode.TreeItemCollapsibleState.None)
      })
    } else if (element.tag === 'Global Templates') {
      element.info.forEach((v: Tag, k: string) => {
        list.push(new TestApi6InspectItem(`${v.tagName} #${k}`, v.title || '', {}, vscode.TreeItemCollapsibleState.None))
      })
    } else if (element.tag === 'Global Utils') {
      Object.keys(element.info).forEach((k: string) => {
        list.push(new TestApi6InspectItem(`${k}`, '', {}, vscode.TreeItemCollapsibleState.None))
      })
    } else if (element.tag === 'Global Validators') {
      Object.keys(element.info).forEach((k: string) => {
        list.push(new TestApi6InspectItem(`${k}`, '', {}, vscode.TreeItemCollapsibleState.None))
      })
    } else if (element.tag === 'Global Vars') {
      Object.keys(element.info).forEach((k: string) => {
        list.push(new TestApi6InspectItem(`${k}`, typeof element.info[k], {}, vscode.TreeItemCollapsibleState.None))
      })
    } else if (element.tag === 'Common') {
      list.push(new TestApi6InspectItem('Global Templates', '', Templates.Templates, vscode.TreeItemCollapsibleState.Collapsed))
      list.push(new TestApi6InspectItem('Global Utils', '', context.Utils, vscode.TreeItemCollapsibleState.Collapsed))
      list.push(new TestApi6InspectItem('Global Validators', '', context.Validate, vscode.TreeItemCollapsibleState.Collapsed))
      list.push(new TestApi6InspectItem('Global Vars', '', context.Vars, vscode.TreeItemCollapsibleState.Expanded))
    }
    //  else {
    //   const root = load(readFileSync(element.src).toString(), { schema: SCHEMA }) as any
    //   let items = [] as any[]
    //   if (Array.isArray(root)) {
    //     items = root
    //   } else if (root.steps && Array.isArray(root.steps)) {
    //     items = root.steps
    //   }
    //   list = items.map(tag => {
    //     const tagName = Object.keys(tag)[0]
    //     return new TestApi6InspectItem(tagName, '', tagObj, vscode.TreeItemCollapsibleState.Collapsed)
    //   })
    // }
    return list
  }

}

export class TestApi6InspectItem extends vscode.TreeItem {
  constructor(
    public readonly tag: string,
    readonly des: string,
    public readonly info: any,
    public collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super('', collapsibleState);
    const id = this.info['-->']?.join('|') || ''
    this.label = this.tag + (id ? ' #' : '') + id
    if (['Api', 'Get', 'Post', 'Put', 'Delete', 'Patch', 'Head'].includes(this.tag) && this.info.title === null) {
      this.label = '-'
      this.description = this.info.validate.map((e: any) => typeof e === 'object' && e.title).filter((e: string) => e).join(' AND ')
      this.tooltip = this.info.validate.map((e: any) => typeof e === 'object' && e.title).filter((e: string) => e).map((e: string) => `- ${e}`).join('\n')
    } else {
      this.description = des || this.info.description || ''
      this.tooltip = (this.info.title || '') + (this.description ? `\n${this.description}` : '')
    }
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'TestApi6InspectItem.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'TestApi6InspectItem.svg')
  // };
}
