import * as vscode from 'vscode';

export class TestApi6Item extends vscode.TreeItem {
  constructor(
    public context: 'root' | 'folder' | 'file' | 'cmd',
    public _label: string,
    public readonly src: string,
    public readonly cmd: string,
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
    let label = ''
    if (this._label.length > 30) {
      label = '...' + this._label.substr(this._label.length - 30)
    } else {
      label = this._label
    }
    return (this.context === 'cmd' ? '▶ ' : this.context === 'root' ? '' : this.context === 'file' ? 'ϟ ' : this.context === 'folder' ? 'ϟ ' : '') + label
    // return dir.length > 0 ? a.replace(dir + '/', '') : a
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'TestApi6Item.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'TestApi6Item.svg')
  // };
}