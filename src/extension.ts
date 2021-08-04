// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import axios from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import * as path from 'path';
import { basename, join } from 'path';
import { InputYamlFile, load } from 'testapi6/dist/main';
import * as vscode from 'vscode';
import { TestApi6ExampleProvider } from './TestApi6ExampleProvider';
import { TestApi6GlobalProvider } from './TestApi6GlobalProvider';
import { TestApi6HistoryProvider } from './TestApi6HistoryProvider';
import { TestApi6InspectProvider } from './TestApi6InspectProvider';
import { TestApi6Item } from './TestApi6Item';
import { TestApi6LocalProvider } from './TestApi6LocalProvider';
import { TestApi6ProfileProvider } from './TestApi6ProfileProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
const ter = new Map<string, vscode.Terminal>()
let nodeBin = path.join(require.resolve('testapi6'), '..', '..', 'bin/testapi6.js')
let lastScenario: string
let playStatusBar: vscode.StatusBarItem;
let debugLog: vscode.OutputChannel

async function setConfig() {
  try {
    // Setting yaml config
    const { data } = await axios.get('https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/.vscode/settings.json')
    let yamlConfig = {} as any
    try {
      // eslint-disable-next-line
      eval(`yamlConfig = ${data || '{}'}`)
    } catch (err) {
      vscode.window.showErrorMessage(err.message)
      debugLog.appendLine('')
      debugLog.appendLine(err.message)
      debugLog.appendLine(err.stack)
      debugLog.show(true)
    }
    try {
      let conf = vscode.workspace.getConfiguration('testapi6')
      const useGlobal = conf.get('useGlobal')
      if (useGlobal === undefined) {
        await conf.update('useGlobal', false, vscode.ConfigurationTarget.Global)
      } else if (useGlobal === true) {
        nodeBin = 'testapi6'
      }
      conf = vscode.workspace.getConfiguration('yaml')
      if (conf && conf.has('customTags')) {
        await conf.update('customTags', yamlConfig['yaml.customTags'], vscode.ConfigurationTarget.Workspace)
        await conf.update('schemas', {
          "https://raw.githubusercontent.com/doanthuanthanh88/testapi6/main/schema.json": "*.yaml"
        }, vscode.ConfigurationTarget.Workspace)
      }
    } catch (err) {
      debugLog.appendLine('You should install YAML Language support')
      debugLog.appendLine('')
      debugLog.appendLine(err.message)
      debugLog.appendLine(err.stack)
      debugLog.show(true)
      // throw err
    }
  } catch (err) {
    vscode.window.showErrorMessage(err.message)
    debugLog.appendLine('')
    debugLog.appendLine(err.message)
    debugLog.appendLine(err.stack)
    debugLog.show(true)
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
  if ((scenarioPath && scenarioPath.includes(' ')) || !scenarioPath?.endsWith('.yaml') && !scenarioPath?.endsWith('.yml') && !scenarioPath?.endsWith('.encrypt')) {
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

  debugLog = vscode.window.createOutputChannel('TestAPI6')
  debugLog.show(false)
  const scenarioInspectProvider = new TestApi6InspectProvider()
  const templateInspectProvider = new TestApi6InspectProvider()
  const varsInspectProvider = new TestApi6InspectProvider()
  const docsInspectProvider = new TestApi6InspectProvider()
  const exampleProvider = new TestApi6ExampleProvider()
  const globalProvider = new TestApi6GlobalProvider()

  const localProvider = new TestApi6LocalProvider(vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || [])
  const profileProvider = new TestApi6ProfileProvider()
  const historyProvider = new TestApi6HistoryProvider()

  vscode.window.onDidCloseTerminal(e => {
    if (e.name.startsWith('TestAPI6:')) {
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
      lastScenario = file
    }
    if (lastScenario) {
      playStatusBar.show()
      playStatusBar.text = `▶ ${basename(lastScenario)}`
      playStatusBar.tooltip = `TestAPI6: ${lastScenario}`
    } else {
      playStatusBar.hide()
    }
  }

  async function yamlChange(file: string, isForceShowError: boolean) {
    debugLog.clear()
    try {
      const { scenarioFile = file } = getFileRun(file, file)
      const rootScenario = await load(new InputYamlFile(scenarioFile)) as any
      const rootDocs = cloneDeep(rootScenario)
      const rootTemps = cloneDeep(rootScenario)
      const rootVars = cloneDeep(rootScenario)
      await Promise.all([
        rootScenario.setup(),
        rootDocs.setup(),
        rootTemps.setup(),
        rootVars.setup(),
      ])
      await Promise.all([
        scenarioInspectProvider.load(rootScenario, 'scenario'),
        docsInspectProvider.load(rootDocs, 'docs'),
        templateInspectProvider.load(rootTemps, 'templates'),
        varsInspectProvider.load(rootVars, 'vars'),
      ])
      return scenarioFile
    } catch (err) {
      debugLog.appendLine('')
      debugLog.appendLine(err.message)
      debugLog.appendLine(err.stack)
      debugLog.show(!isForceShowError)
    }
    return null
  }

  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (a) => {
    let file = a?.fileName || ''
    if (file.endsWith('.yaml')) {
      if (basename(file) === '.yaml') {
        localProvider.refresh()
      } else {
        profileProvider.load()
        profileProvider.refresh()
        await yamlChange(file, true)
      }
    }
  }))
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (a) => {
    let file = vscode.window.activeTextEditor?.document.fileName || a?.document.fileName || ''
    if (file.endsWith('.yaml') && basename(file) !== '.yaml') {
      const outFile = await yamlChange(file, false)
      if (outFile) updateStatusBar(outFile)
    }
  }))

  updateStatusBar(lastScenario)

  setTimeout(() => {
    setConfig()
    vscode.window.registerTreeDataProvider('testApi6ScenarioInspect', scenarioInspectProvider);
    vscode.window.registerTreeDataProvider('testApi6TemplatesInspect', templateInspectProvider);
    vscode.window.registerTreeDataProvider('testApi6VarsInspect', varsInspectProvider);
    vscode.window.registerTreeDataProvider('testApi6DocsInspect', docsInspectProvider);
    vscode.window.registerTreeDataProvider('testApi6ExampleProvider', exampleProvider);
    vscode.window.registerTreeDataProvider('testApi6Global', globalProvider);
    vscode.window.registerTreeDataProvider('testApi6History', historyProvider);
    vscode.window.registerTreeDataProvider('testApi6Local', localProvider);
    vscode.window.registerTreeDataProvider('testApi6Profile', profileProvider);
    exampleProvider.load()
  })

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.openExample', async (h: any) => {
    const content = await exampleProvider.getContent(h.des)
    const document = await vscode.workspace.openTextDocument({
      language: 'yaml',
      content,
    })
    await vscode.window.showTextDocument(document, vscode.ViewColumn.Two);
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.open', async (h: any) => {
    const a = await vscode.workspace.openTextDocument(vscode.Uri.parse("file:" + h.src))
    await vscode.window.showTextDocument(a)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.updateProfile', async () => {
    profileProvider.newOne()
    const a = await vscode.workspace.openTextDocument(vscode.Uri.parse("file:" + profileProvider.dataFile))
    await vscode.window.showTextDocument(a)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.setProfile', async (h: any) => {
    profileProvider.pick(h.cmd, h.src)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.del', (h: any) => {
    globalProvider.remove(h.src, h.folder)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.refresh', (h: any) => {
    // globalProvider.load()
    localProvider.refresh()
    globalProvider.refresh()
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.edit', async (h: any) => {
    let scenarioPath = h.src
    const label = await getInput('', h.labelText)
    if (label) {
      globalProvider.upsert(label.trim(), scenarioPath, h.folder)
    }
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.runinview', async (h: any) => {
    if (h.src) {
      historyProvider.push({ ...h, context: 'file' })
      vscode.commands.executeCommand('testapi6.run', { scheme: 'file', path: h.src })
    } else if (h.cmd && h.cmd.length) {
      historyProvider.push({ ...h, context: 'cmd' })
      const name = path.basename(h._label || 'TestAPI6 Command')
      const terName = 'TestAPI6:' + name
      let terObj = ter.get(terName)
      if (!terObj) {
        terObj = vscode.window.createTerminal(terName)
        ter.set(terName, terObj);
      }
      (h.cmd as string[]).map(e => e.trim()).filter(e => e).forEach(cmd => terObj?.sendText(cmd))
      terObj.show(false)
    }
  }))

  context.subscriptions.push(vscode.commands.registerCommand('testapi6.add', async (h: any) => {
    const scenarioPath = (h?.scheme === 'file' && h?.path) || vscode.window.activeTextEditor?.document.uri.fsPath
    vscode.commands.executeCommand('testapi6.edit', {
      label: basename(scenarioPath),
      src: scenarioPath
    })
  }))

  let cachedInApp: any
  context.subscriptions.push(vscode.commands.registerCommand('testapi6.runInApp', async (h: any) => {
    const rs = [] as any[]
    let i = 1
    for (const group in localProvider.list) {
      rs.push({ label: '', description: group.toUpperCase(), get _label() { return this.label?.replace(/^[^\d]*\d\.\s*/g, '') } })
      localProvider.list[group].forEach((data: any) => {
        const { folder, label, src, description, cmd } = data
        rs.push({ label: `   ├ ${i++}. ${label}`, description, src, folder, cmd, get _label() { return this.label?.replace(/^[^\d]*\d\.\s*/g, '') } })
      })
    }
    rs.push({ label: '', description: 'Configuration...', help: true })
    if (rs.length > 0) {
      // if (cachedInApp) {
      //   const pick = rs.find(e => e.label === cachedInApp.label) as any
      //   if (pick) pick.picked = true
      // }
      let vl = await vscode.window.showQuickPick(rs, {
        canPickMany: false,
        placeHolder: cachedInApp?.label || 'Search'
      }) as any
      if (vl) {
        if (!vl['folder'] && !vl['help']) {
          if (cachedInApp) {
            vl = rs.find(e => e.label === cachedInApp.label)
          }
        }
        if (vl['folder']) {
          vscode.commands.executeCommand('testapi6.runinview', vl)
          cachedInApp = vl
        } else if (vl['help']) {
          const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : ''
          if (workspaceFolder) {
            const yamlFile = join(workspaceFolder, '.yaml')
            if (!existsSync(yamlFile)) {
              writeFileSync(yamlFile, `- Dev:
  - SayHello: echo "Hello testapi6"
`)
            }
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(yamlFile));
          }
        }
      } else {
        cachedInApp = undefined
      }
    } else {
      const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : ''
      if (workspaceFolder) {
        const yamlFile = join(workspaceFolder, '.yaml')
        if (!existsSync(yamlFile)) {
          writeFileSync(yamlFile, `
- Say Hello:
  - Hello world: echo "Hello world"
`)
          vscode.commands.executeCommand('vscode.open', vscode.Uri.file(yamlFile));
        }
      }
    }
  }))
  context.subscriptions.push(vscode.commands.registerCommand('testapi6.run', async (h: any) => {
    debugLog.clear()
    try {
      let scenarioPath = h instanceof TestApi6Item ? h.src : ((h?.scheme === 'file' && h?.path) || vscode.window.activeTextEditor?.document.uri.fsPath)
      const { scenarioFile = '', isClose = false } = getFileRun(scenarioPath, lastScenario)
      let decryptPassword = ''
      if (scenarioFile?.endsWith('.encrypt')) {
        decryptPassword = await getInput('Enter password to decrypt file', '')
      }
      const name = path.basename(scenarioFile)

      if (h instanceof TestApi6Item) {
        historyProvider.push({ ...h, context: 'file' })
      } else {
        historyProvider.push({
          _label: scenarioFile,
          src: scenarioFile,
          context: 'file'
        })
      }

      const terName = 'TestAPI6:' + name
      let terObj = ter.get(terName)
      if (!terObj) {
        terObj = vscode.window.createTerminal(terName)
        ter.set(terName, terObj)
      }
      terObj.show(true)
      lastScenario = scenarioFile
      updateStatusBar(lastScenario)
      const cmd = [nodeBin]
      if (profileProvider.profileData && Object.keys(profileProvider.profileData).length > 0) {
        cmd.push('-e', `'${JSON.stringify(profileProvider.profileData)}'`)
      }
      cmd.push(scenarioFile)
      if (decryptPassword) {
        cmd.push(`'${decryptPassword}'`)
      }
      terObj.sendText(cmd.join(' '))
      if (isClose) {
        terObj?.sendText(`exit`, true)
      }
    } catch (err: any) {
      vscode.window.showErrorMessage('Error: ' + err.message + ' ❌❌❌')
      debugLog.appendLine('')
      debugLog.appendLine(err.message)
      debugLog.appendLine(err.stack)
      debugLog.show(true)
    }
  }))

}

// this method is called when your extension is deactivated
export function deactivate() {

}

async function getInput(label: string, value: string) {
  const inp = vscode.window.createInputBox()
  if (label) {
    inp.placeholder = label
  }
  inp.value = value
  inp.show()
  value = await new Promise<string>(r => {
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
  return value
}