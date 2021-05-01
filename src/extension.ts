// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fetch from 'node-fetch'
import * as path from 'path'
import { existsSync, readFileSync } from 'fs';
import { TestApi6Item, TestApi6Provider } from './TestApi6Provider';
import { basename } from 'path';
import { TestApi6InspectProvider } from './TestApi6InspectProvider';
import { load, InputYamlFile } from 'testapi6/dist/main'
import { TestApi6ExampleProvider } from './TestApi6ExampleProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let ter = new Map<string, vscode.Terminal>()
const nodeBin = path.join(require.resolve('testapi6'), '..', '..', 'bin/index.js')
let lastScenario: string
let lastInspect: string
let playStatusBar: vscode.StatusBarItem;

async function setConfig() {
  // Setting yaml config
  const res = await fetch('https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/.vscode/settings.json', {
    method: 'GET'
  })
  const tmp = await res.text()
  let yamlConfig = {} as any
  try {
    eval(`yamlConfig = ${tmp || '{}'}`)
  } catch (err) {
    vscode.window.showErrorMessage(err.message)
    throw err
  }
  try {
    const conf = vscode.workspace.getConfiguration()
    await conf.update('yaml.customTags', yamlConfig['yaml.customTags'], vscode.ConfigurationTarget.Workspace)
    await conf.update('yaml.schemas', {
      "https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/schema.json": "*.yaml"
    }, vscode.ConfigurationTarget.Workspace)
  } catch (err) {
    vscode.window.showWarningMessage('Please install YAML Language support first')
    // throw err
  }
}

function getLine(lines: string[], i: number) {
  // Get first line
  if (i === 0) {
    for (const l of lines) {
      if (l && l.trim().length) return l.trim()
    }
  } else if (i === -1) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i]
      if (l && l.trim().length) return l.trim()
    }
  }
  return ''
}

function getFileRun(scenarioPath: string, lastScenario: string) {
  let isClose = false
  let _lastScenario = lastScenario
  if (!scenarioPath?.endsWith('.yaml') && !scenarioPath?.endsWith('.yml') && !scenarioPath?.endsWith('.encrypt')) {
    if (!_lastScenario) return {}
    scenarioPath = _lastScenario
  } else {
    const lines = readFileSync(scenarioPath).toString().split('\n')
    const firstLine = getLine(lines, 0)
    const lastLine = getLine(lines, -1)
    isClose = /\#\s*close/i.test(lastLine)
    const [cmd = '', file] = firstLine.split(':')
    if (file && /\#\s*run/i.test(cmd)) {
      const newFile = path.join(scenarioPath, file.trim())
      if (existsSync(newFile)) {
        scenarioPath = newFile
      }
    }
    _lastScenario = scenarioPath
  }
  return { scenarioFile: _lastScenario, isClose }
}

export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "testapi6" is now active!');

  let isSetConfig: boolean

  vscode.window.onDidCloseTerminal(e => {
    if (e.name.startsWith('testapi6:')) {
      ter.delete(e.name)
    }
  })

  // Status bar

  playStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
  playStatusBar.command = 'testapi6.run'
  playStatusBar.text = '▶ TestAPI6'
  playStatusBar.tooltip = 'Run testapi6'
  context.subscriptions.push(playStatusBar);

  function updateStatusBar(file: string) {
    if (file && file.endsWith('.yaml')) {
      playStatusBar.show()
      playStatusBar.text = `▶ ${basename(file)}`
      playStatusBar.tooltip = `testapi6: ${file}`
    } else if (lastScenario) {
      playStatusBar.text = `▶ ${basename(lastScenario)}`
      playStatusBar.tooltip = `testapi6: ${lastScenario}`
    } else {
      playStatusBar.hide()
    }
  }

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (a) => {
    const scenarioFile = vscode.window.activeTextEditor?.document.fileName || a?.document.fileName || ''
    updateStatusBar(scenarioFile)
    const root = await load(new InputYamlFile(scenarioFile)) as any
    await root.setup()
    await scenarioInspectProvider.load(root, 'scenario')
    await templateInspectProvider.load(root, 'templates')
    await varsInspectProvider.load(root, 'vars')
    await exampleProvider.load()
  }))

  updateStatusBar(lastScenario)

  const scenarioInspectProvider = new TestApi6InspectProvider()
  const templateInspectProvider = new TestApi6InspectProvider()
  const varsInspectProvider = new TestApi6InspectProvider()
  const exampleProvider = new TestApi6ExampleProvider()
  const provider = new TestApi6Provider()

  vscode.window.registerTreeDataProvider('testApi6ScenarioInspect', scenarioInspectProvider);
  vscode.window.registerTreeDataProvider('testApi6TemplatesInspect', templateInspectProvider);
  vscode.window.registerTreeDataProvider('testApi6VarsInspect', varsInspectProvider);
  vscode.window.registerTreeDataProvider('testApi6ExampleProvider', exampleProvider);
  vscode.window.registerTreeDataProvider('testApi6', provider);

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.guide', () => {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/doanthuanthanh88/testapi6'));
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.openExample', async (h: any) => {
    const content = await exampleProvider.getContent(h.des)
    const document = await vscode.workspace.openTextDocument({
      language: 'yaml',
      content,
    })
    await vscode.window.showTextDocument(document, vscode.ViewColumn.Two);
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.open', async (h: any) => {
    const a = await vscode.workspace.openTextDocument(vscode.Uri.parse("file://" + h.src))
    await vscode.window.showTextDocument(a)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.del', (h: any) => {
    provider.remove(h)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.refresh', (h: any) => {
    provider.load()
    provider.refresh()
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.edit', async (h: any) => {
    let scenarioPath = h.src
    const inp = vscode.window.createInputBox()
    inp.value = h.label
    inp.show()
    let label = await new Promise<string>(r => {
      let isAccepted: boolean
      inp.onDidAccept(() => {
        if (!isAccepted) {
          inp.hide()
          r(inp.value || '')
        }
      })
      inp.onDidHide(() => {
        isAccepted = true
        inp.hide()
        r(inp.value || '')
      })
    })
    if (!label) label = h.label
    if (label) provider.upsert(label.trim(), scenarioPath)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.runinview', async (h: any) => {
    const scenarioPath = h.src
    vscode.commands.executeCommand('testapi6.run', new TestApi6Item('folder', basename(scenarioPath), scenarioPath, vscode.TreeItemCollapsibleState.Collapsed))
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.add', async (h: any) => {
    const scenarioPath = (h?.scheme === 'file' && h?.path) || vscode.window.activeTextEditor?.document.uri.fsPath
    vscode.commands.executeCommand('testapi6.edit', new TestApi6Item('folder', basename(scenarioPath), scenarioPath, vscode.TreeItemCollapsibleState.Collapsed))
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.inspect', async (h: any) => {
    let scenarioPath = h instanceof TestApi6Item ? h.src : (h?.scheme === 'file' && h?.path) || vscode.window.activeTextEditor?.document.uri.fsPath
    if (scenarioPath) {
      try {
        const { scenarioFile = '' } = getFileRun(scenarioPath, lastInspect)
        const root = await load(new InputYamlFile(scenarioFile)) as any
        await root.setup()
        await scenarioInspectProvider.load(root, 'scenario')
        await templateInspectProvider.load(root, 'templates')
        await varsInspectProvider.load(root, 'vars')
        lastInspect = scenarioFile
      } catch (err) {
        vscode.window.showErrorMessage('Error: ' + err.message + ' ❌❌❌')
      }
    }
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.run', async (h: any) => {
    try {
      if (!isSetConfig) await setConfig()
      isSetConfig = true
    } catch { }
    try {
      // const content = []
      // if (vscode.window.activeTextEditor) {
      // 	for (const s of vscode.window.activeTextEditor.selections) {
      // 		const tmp = vscode.window.activeTextEditor.document.getText(s)
      // 		if (tmp && tmp.trim().length > 0) {
      // 			content.push(tmp)
      // 		}
      // 	}
      // }
      let scenarioPath = h instanceof TestApi6Item ? h.src : (h?.scheme === 'file' && h?.path) || vscode.window.activeTextEditor?.document.uri.fsPath
      const { scenarioFile = '', isClose = false } = getFileRun(scenarioPath, lastScenario)
      let decryptPassword = ''
      if (scenarioFile?.endsWith('.encrypt')) {
        const inp = vscode.window.createInputBox()
        inp.placeholder = 'Enter password to decrypt file'
        inp.show()
        decryptPassword = await new Promise(r => {
          let isAccepted: boolean
          inp.onDidAccept(() => {
            if (!isAccepted) {
              inp.hide()
              r(inp.value || '')
            }
          })
          inp.onDidHide(() => {
            isAccepted = true
            inp.hide()
            r(inp.value || '')
          })
        })
      }
      const name = path.basename(scenarioFile)
      const terName = 'testapi6:' + name
      let terObj = ter.get(terName)
      if (!terObj) {
        terObj = vscode.window.createTerminal(terName)
        ter.set(terName, terObj)
      }
      terObj.show(true)
      // if (content.length > 0) {
      // 	lastScenario = path.join(os.tmpdir(), name)
      // 	writeFileSync(lastScenario, content.join('\n'))
      // }
      lastScenario = scenarioFile
      updateStatusBar(lastScenario)
      terObj.sendText(`${nodeBin} ${scenarioFile} ${decryptPassword}`)
      if (isClose) {
        setTimeout(() => {
          terObj?.sendText(`exit`, true)
        }, 1000)
      }
    } catch (err: any) {
      vscode.window.showErrorMessage('Error: ' + err.message + ' ❌❌❌')
      console.error(err)
    }
  }))

}

// this method is called when your extension is deactivated
export function deactivate() {

}
