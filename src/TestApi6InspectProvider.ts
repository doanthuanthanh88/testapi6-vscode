import * as vscode from 'vscode';
import { load, InputYamlFile } from 'testapi6/dist/main'

export class TestApi6InspectProvider implements vscode.TreeDataProvider<TestApi6InspectItem> {
  private list = [] as any[]

  constructor() { }

  async load(f: string) {
    this.list = []
    const root = await load(new InputYamlFile(f)) as any
    await root.setup()
    for (const tag of root.group.steps) {
      const tagName = tag.tagName
      if (tagName === 'Group') {
        this.list.push(new TestApi6InspectItem(tagName, tag.title, tag.description || tag.des, tag, vscode.TreeItemCollapsibleState.Collapsed))
      } else if (tag.title || tag.depends) {
        this.list.push(new TestApi6InspectItem(tagName, tag.title, tag.description || tag.des, tag, vscode.TreeItemCollapsibleState.None))
      }
    }
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
      element.info.steps.filter((t: any) => t.title || t.depends).forEach((tag: any) => {
        const tagName = tag.tagName
        if (tagName === 'Group') {
          list.push(new TestApi6InspectItem(tagName, tag.title, tag.description || tag.des, tag, vscode.TreeItemCollapsibleState.Collapsed))
        }
        if (tag.depends) {
          tag.validate?.filter((e: any) => e?.title).forEach((tag: any) => {
            list.push(new TestApi6InspectItem(tagName, `   ◦ ${tag.title}`, tag.description || tag.des, tag, vscode.TreeItemCollapsibleState.None))
          })
        } else {
          list.push(new TestApi6InspectItem(tagName, `▶ ${tag.title}`, tag.description || tag.des, tag, vscode.TreeItemCollapsibleState.None))
        }
      })
    }
    // else if (element.tag === 'Import') {
    //   const root = await load(new InputYamlFile(element.info['src'])) as any
    //   await root.setup()
    //   return root.group.steps.filter((t: any) => t.title).map((tag: any) => {
    //     const tagName = tag.tagName
    //     if (tagName === 'Group') {
    //       return new TestApi6InspectItem(tagName, tag.title, tag.description || tag.des, tag, vscode.TreeItemCollapsibleState.Collapsed)
    //     }
    //     return new TestApi6InspectItem(tagName, tag.title, tag.description || tag.des, tag, vscode.TreeItemCollapsibleState.None)
    //   })
    // }
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
    public readonly title: string,
    readonly des: string,
    public readonly info: any,
    public collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super('', collapsibleState);
    if (this.info?.depends) {
      this.label = '- ' + this.info.validate?.map((v: any) => v.title).filter((e: string) => e).join(' | ')
      this.description = this.description
    } else {
      this.label = this.title
      this.description = this.description
    }
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'TestApi6InspectItem.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'TestApi6InspectItem.svg')
  // };
}
