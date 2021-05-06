import { Method, Templates } from 'testapi6/dist/components';
import { context } from 'testapi6/dist/Context';
import 'testapi6/dist/init';
import * as vscode from 'vscode';

export class TestApi6InspectProvider implements vscode.TreeDataProvider<TestApi6InspectItem> {
  private list = [] as any[]

  constructor() { }

  async load(root: any, type: 'templates' | 'vars' | 'scenario' | 'docs') {
    const list = [] as any
    try {
      if (type === 'templates') {
        Templates.Templates.forEach((tag: any, key) => {
          tag.$type = type
          list.push(new TestApi6InspectItem(key, `${key}`, `${tag.tagName}` + (tag['<--'].length > 0 ? `<${tag['<--'].join(' & ')}>` : ''), tag, true, vscode.TreeItemCollapsibleState.None))
        })
      } else if (type === 'scenario') {
        root.group.steps.filter((t: any) => t.title || t.depends).forEach((tag: any) => {
          tag.$type = type
          const tagName = tag.tagName
          if (tagName === 'Group') {
            list.push(new TestApi6InspectItem(tagName, `↳ ${tag.title}`, tag.description || tag.des || tagName, tag, true, vscode.TreeItemCollapsibleState.Collapsed))
          } else if (['api', ...Object.keys(Method).map(e => e.toLowerCase())].includes(tagName.toLowerCase())) {
            if (!tag.depends) {
              list.push(new TestApi6InspectItem(tagName, `${tag.title}`, (tag.docs ? '★ ' : '') + (tag.description || tag.des || tagName), tag, true, vscode.TreeItemCollapsibleState.None))
              tag.validate?.filter((e: any) => e?.title).forEach((v: any) => {
                v.tagName = 'Validate'
                list.push(new TestApi6InspectItem(tagName, `${v.title}`, v.description || v.des || 'Api.Validate', v, true, vscode.TreeItemCollapsibleState.None))
              })
            } else {
              tag.validate?.filter((e: any) => e?.title).forEach((v: any, i: any) => {
                v.tagName = 'Validate'
                list.push(new TestApi6InspectItem(tagName, `${v.title}`, (tag.docs ? '★ ' : '') + (v.description || v.des || (+i === 0 ? 'Api.Validate (depends)' : '')), v, true, vscode.TreeItemCollapsibleState.None))
              })
            }
          } else {
            list.push(new TestApi6InspectItem(tagName, `${tag.title}`, tag.description || tag.des || tagName, tag, true, vscode.TreeItemCollapsibleState.None))
          }
        })
      } else if (type === 'vars') {
        Object.keys(context.Vars).forEach(k => {
          list.push(new TestApi6InspectItem(k, `▫ ${k}`, typeof context.Vars[k] === 'object' ? JSON.stringify(context.Vars[k]) : `${context.Vars[k]}`, { tagName: '$globalVar', $type: type }, true, vscode.TreeItemCollapsibleState.None))
        })
      } else if (type === 'docs') {
        let i = 1
        const scanDoc = (group: any) => {
          group.steps.filter((t: any) => (t.tagName === 'Group' || t.docs) && !t.disabled).forEach((tag: any) => {
            tag.$type = type
            const tagName = tag.tagName
            if (tag.tagName === 'Group') {
              scanDoc(tag)
            } else {
              list.push(new TestApi6InspectItem(tagName, `${i++}. ${tag.title}`, tagName + `<${(tag.docs?.tags || tag.docs?.swagger || tag.docs?.md || []).join('|')}>`, tag, true, vscode.TreeItemCollapsibleState.None))
            }
          })
        }
        scanDoc(root.group)
      }
    } finally {
      this.list = list
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
        tag.$type = element.info.$type
        const tagName = tag.tagName
        if (tagName === 'Group') {
          list.push(new TestApi6InspectItem(tagName, ` ↳ ${tag.title}`, tag.description || tag.des || tagName, tag, false, vscode.TreeItemCollapsibleState.Collapsed))
        } else if (['api', ...Object.keys(Method).map(e => e.toLowerCase())].includes(tagName.toLowerCase())) {
          if (!tag.depends) {
            list.push(new TestApi6InspectItem(tagName, `${tag.title}`, (tag.docs ? '★ ' : '') + (tag.description || tag.des || tagName), tag, false, vscode.TreeItemCollapsibleState.None))
            tag.validate?.filter((e: any) => e?.title).forEach((v: any) => {
              v.tagName = 'Validate'
              list.push(new TestApi6InspectItem(tagName, `${v.title}`, v.description || v.des || 'Api.Validate', v, false, vscode.TreeItemCollapsibleState.None))
            })
          } else {
            tag.validate?.filter((e: any) => e?.title).forEach((v: any, i: any) => {
              v.tagName = 'Validate'
              list.push(new TestApi6InspectItem(tagName, `${v.title}`, (tag.docs ? '★ ' : '') + (v.description || v.des || (+i === 0 ? 'Api.Validate (depends)' : '')), v, false, vscode.TreeItemCollapsibleState.None))
            })
          }
        } else {
          list.push(new TestApi6InspectItem(tagName, `${tag.title}`, tag.description || tag.des || tagName, tag, false, vscode.TreeItemCollapsibleState.None))
        }
      })
    } else if (element.title) {
      const tag = element.info
      const tagName = tag.tagName
      list.push(new TestApi6InspectItem(tagName, `- ${tag.title}`, tag.description || tag.des || tagName, tag, false, vscode.TreeItemCollapsibleState.None))
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
    public readonly isRoot: boolean,
    public collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super('', collapsibleState);
    // if (this.info?.depends) {
    //   this.label = '- ' + this.info.validate?.map((v: any) => v.title).filter((e: string) => e).join(' | ')
    //   this.description = this.des
    // } else {
    this.label = this.title
    this.description = this.des
    this.tooltip = this.des
  }

  getDisabledText(isDisabled: boolean, txt: string) {
    return isDisabled ? txt.split('').join('⎯') : txt
  }

  // @ts-ignore
  set label(_: any) { }

  // @ts-ignore
  get label() {
    let icon = this.info.disabled ? '❌' : ''
    let space = ''
    if (!this.isRoot) space = '   '
    if (this.info.tagName !== '$globalVar') {
      if (['api', ...Object.keys(Method).map(e => e.toLowerCase())].includes(this.info.tagName.toLowerCase())) {
        if (!icon) icon = this.info.$type !== 'docs' ? '↳' : ''
        return `${space}${icon} ` + this.getDisabledText(this.info.disabled, this.title)
      } else if ('Validate' === this.info.tagName) {
        if (!icon) icon = ' ▫'
        return `${space}    ${icon} ` + this.getDisabledText(this.info.disabled, this.title)
      } else if ('Group' === this.info.tagName) {
        if (!icon) icon = this.info.$type === 'templates' ? 'ⓖ ' : ''
        return `${icon} ` + this.title
      } else {
        if (!icon) icon = '・'
        return `${space}${icon} ` + this.getDisabledText(this.info.disabled, this.title)
      }
    }
    return this.getDisabledText(this.info.disabled, this.title)
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'TestApi6InspectItem.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'TestApi6InspectItem.svg')
  // };
}
