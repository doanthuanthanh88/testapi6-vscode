// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fetch from 'node-fetch'
import * as path from 'path'
import { existsSync, readFileSync } from 'fs';
import { TestApi6Item, TestApi6Provider, TestApiRootItem } from './TreeDataProvider';
import { basename } from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let ter = new Map<string, vscode.Terminal>()
const nodeBin = path.join(require.resolve('testapi6'), '..', '..', 'bin/index.js')
let lastScenario: string

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
		vscode.window.showErrorMessage('Please install YAML Language support first')
		throw err
	}
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

	const provider = new TestApi6Provider()

	context.subscriptions.push(vscode.commands.registerCommand('testapi6.guide', () => {
		vscode.env.openExternal(vscode.Uri.parse('https://github.com/doanthuanthanh88/testapi6'));
	}))

	context.subscriptions.push(vscode.commands.registerCommand('testapi6.open', async (h: any) => {
		const a = await vscode.workspace.openTextDocument(vscode.Uri.parse("file://" + h.src))
		await vscode.window.showTextDocument(a)
		// const e = await vscode.window.showTextDocument(a, 1, false)
		// e.edit(edit => {
		// 	edit.insert(new vscode.Position(0, 0), "Your advertisement here");
		// })
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
		inp.placeholder = h.label
		inp.show()
		const label = await new Promise<string>(r => {
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
		if (label) provider.upsert(label, scenarioPath)
	}))

	context.subscriptions.push(vscode.commands.registerCommand('testapi6.runinview', async (h: any) => {
		const scenarioPath = h.src
		vscode.commands.executeCommand('testapi6.run', new TestApiRootItem(basename(scenarioPath), scenarioPath, vscode.TreeItemCollapsibleState.Collapsed, 0))
	}))

	context.subscriptions.push(vscode.commands.registerCommand('testapi6.add', async (h: any) => {
		const scenarioPath = (h?.scheme === 'file' && h?.path) || vscode.window.activeTextEditor?.document.uri.fsPath
		vscode.commands.executeCommand('testapi6.edit', new TestApiRootItem(basename(scenarioPath), scenarioPath, vscode.TreeItemCollapsibleState.Collapsed, 0))
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
			if (!scenarioPath?.endsWith('.yaml') && !scenarioPath?.endsWith('.yml') && !scenarioPath?.endsWith('.encrypt')) {
				if (!lastScenario) return
				scenarioPath = lastScenario
			} else {
				let [firstLine = '',] = readFileSync(scenarioPath).toString().split('\n')
				firstLine = firstLine.trim()
				const [cmd = '', file] = firstLine.split(':')
				if (file && ['#run', '# run'].includes(cmd.toLowerCase())) {
					const newFile = path.join(scenarioPath, file.trim())
					if (existsSync(newFile)) {
						scenarioPath = newFile
					}
				}
				lastScenario = scenarioPath
			}
			let decryptPassword = ''
			if (scenarioPath?.endsWith('.encrypt')) {
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
			const name = path.basename(scenarioPath)
			const terName = 'testapi6:' + name
			let terObj = ter.get(terName)
			if (!terObj) {
				terObj = vscode.window.createTerminal(terName)
				ter.set(terName, terObj)
			}
			terObj.show(true)
			// if (content.length > 0) {
			// 	scenarioPath = path.join(os.tmpdir(), name)
			// 	writeFileSync(scenarioPath, content.join('\n'))
			// }
			terObj.sendText(`${nodeBin} ${scenarioPath} ${decryptPassword}`)
		} catch (err: any) {
			vscode.window.showErrorMessage('Error: ' + err.message + ' ❌❌❌')
			console.error(err)
		}
	}))

	vscode.window.registerTreeDataProvider('testApi6', provider);

}

// this method is called when your extension is deactivated
export function deactivate() {

}
