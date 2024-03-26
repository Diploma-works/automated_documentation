import * as vscode from 'vscode';
import { getMethodsWithContent } from './parser';
import { createMarkdownDocumentationPattern } from './file'
import { loadSourceCodeFilesToVector } from './ai';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "automated-documentation-for-java" is now active!');

	let disposableGenerate = vscode.commands.registerCommand('automated-documentation-for-java.generateDocumentationFile', async (fileUri) => {

		const javaFileContent = await vscode.workspace.fs.readFile(
			fileUri
		);

		const methodsWithContent = getMethodsWithContent(new TextDecoder().decode(javaFileContent));
		const documentPattern = await createMarkdownDocumentationPattern(methodsWithContent);
		let rootLink;
		if (vscode.workspace.workspaceFolders != undefined) {
			rootLink = vscode.workspace.workspaceFolders[0].uri.fsPath + '/documentation.md';
			await vscode.workspace.fs.writeFile(
				vscode.Uri.parse(rootLink), new TextEncoder().encode(documentPattern)
			);
		}

		vscode.window.showInformationMessage('Documentation file was generated');
	});

	let disposableLoad = vscode.commands.registerCommand('automated-documentation-for-java.loadProjectToMemory', async (dirUri) => {

		await vscode.workspace.fs.copy(
			dirUri,
			vscode.Uri.parse(`${__dirname}/sourcecode`)
		);

		try {
			await loadSourceCodeFilesToVector(`${__dirname}/sourcecode`);
			await vscode.workspace.fs.delete(
				vscode.Uri.parse(`${__dirname}/sourcecode`),
				{
					recursive: true
				}
			);
				vscode.window.showInformationMessage('Folder was loaded to memory');
		} catch (error) {
			await vscode.workspace.fs.delete(
				vscode.Uri.parse(`${__dirname}/sourcecode`),
				{
					recursive: true
				}
			);
			vscode.window.showErrorMessage('Error while executing command');
		}

		
	});

	context.subscriptions.push(disposableGenerate, disposableLoad);
}

// This method is called when your extension is deactivated
export function deactivate() { }
