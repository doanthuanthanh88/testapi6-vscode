import * as vscode from 'vscode';
import 'testapi6/dist/init'
import { load, InputYamlFile } from 'testapi6/dist/main'
import { Method, Templates } from 'testapi6/dist/components';

export class TestApi6InspectProvider implements vscode.TreeDataProvider<TestApi6InspectItem> {
  private list = [] as any[]

  constructor() { }

  async load(f: string) {
    this.list = []
    try {
      const root = await load(new InputYamlFile(f)) as any
      await root.setup()
      this.list.push(new TestApi6InspectItem('Templates', '--------------------', 'Templates', {}, vscode.TreeItemCollapsibleState.None))
      Templates.Templates.forEach((tag: any, key) => {
        this.list.push(new TestApi6InspectItem(key, key, tag['<--'].length > 0 ? `extends ${tag['<--'].join(', ')}` : '', tag, vscode.TreeItemCollapsibleState.None))
      })
      this.list.push(new TestApi6InspectItem('Test steps', '--------------------', 'Test steps', {}, vscode.TreeItemCollapsibleState.None))
      root.group.steps.filter((t: any) => t.title || t.depends).forEach((tag: any) => {
        const tagName = tag.tagName
        if (tagName === 'Group') {
          this.list.push(new TestApi6InspectItem(tagName, `  ${tag.title}`, tag.description || tag.des || tagName, tag, vscode.TreeItemCollapsibleState.Collapsed))
        } else if (['api', ...Object.keys(Method).map(e => e.toLowerCase())].includes(tagName.toLowerCase())) {
          if (!tag.depends) {
            this.list.push(new TestApi6InspectItem(tagName, `⥂ ${tag.title}`, tag.description || tag.des || tagName, tag, vscode.TreeItemCollapsibleState.None))
          }
          tag.validate?.filter((e: any) => e?.title).forEach((tag: any) => {
            this.list.push(new TestApi6InspectItem(tagName, `    ☑ ${tag.title}`, tag.description || tag.des || 'Api.Validate', tag, vscode.TreeItemCollapsibleState.None))
          })
        } else {
          this.list.push(new TestApi6InspectItem(tagName, ` ·  ${tag.title}`, tag.description || tag.des || tagName, tag, vscode.TreeItemCollapsibleState.None))
        }
      })
    } finally {
      this.refresh()
    }
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
          list.push(new TestApi6InspectItem(tagName, `  ${tag.title}`, tag.description || tag.des || tagName, tag, vscode.TreeItemCollapsibleState.Collapsed))
        } else if (['api', ...Object.keys(Method).map(e => e.toLowerCase())].includes(tagName.toLowerCase())) {
          if (!tag.depends) {
            list.push(new TestApi6InspectItem(tagName, `⥂ ${tag.title}`, tag.description || tag.des || tagName, tag, vscode.TreeItemCollapsibleState.None))
          }
          tag.validate?.filter((e: any) => e?.title).forEach((tag: any) => {
            list.push(new TestApi6InspectItem(tagName, `    ☑ ${tag.title}`, tag.description || tag.des || 'Api.Validate', tag, vscode.TreeItemCollapsibleState.None))
          })
        } else {
          list.push(new TestApi6InspectItem(tagName, ` ·  ${tag.title}`, tag.description || tag.des || tagName, tag, vscode.TreeItemCollapsibleState.None))
        }
      })
    } else if (element.title) {
      const tag = element.info
      const tagName = tag.tagName
      list.push(new TestApi6InspectItem(tagName, `- ${tag.title}`, tag.description || tag.des || tagName, tag, vscode.TreeItemCollapsibleState.None))
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
    // if (this.info?.depends) {
    //   this.label = '- ' + this.info.validate?.map((v: any) => v.title).filter((e: string) => e).join(' | ')
    //   this.description = this.des
    // } else {
    this.label = this.title
    this.description = this.des
    // }
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'TestApi6InspectItem.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'TestApi6InspectItem.svg')
  // };
}
