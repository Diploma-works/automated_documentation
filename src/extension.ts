// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getMethodsWithContent } from './parser';
import { createMarkdownDocumentationPattern } from './file'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "automated-documentation-for-java" is now active!');

	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('automated-documentation-for-java.generateDocumentationFile', async (fileUri) => {

		const javaFileContent = await vscode.workspace.fs.readFile(
			fileUri
		);

		const methodsWithContent = getMethodsWithContent(new TextDecoder().decode(javaFileContent));
		const documentPattern = createMarkdownDocumentationPattern(methodsWithContent);
		let rootLink;
		if (vscode.workspace.workspaceFolders != undefined) {
			rootLink = vscode.workspace.workspaceFolders[0].uri.fsPath + '/documentation.md';
			await vscode.workspace.fs.writeFile(
				vscode.Uri.parse(rootLink), new TextEncoder().encode(documentPattern)
			);
		}

		// Display a message box to the user
		vscode.window.showInformationMessage('Documentation file generated');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
