import * as vscode from 'vscode';
import { getMethodsWithContent } from './parser';
import { Configuration, createMarkdownDocumentationPattern } from './file';
import { loadSourceCodeFilesToVector } from './ai';

export async function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "automated-documentation-for-java" is now active!');

	let disposableGenerate = vscode.commands.registerCommand('automated-documentation-for-java.generateDocumentationFile', async (fileUri) => {

		let settingsFileUrl = vscode.workspace.workspaceFolders![0].uri.fsPath + '/doc.json';
		const settingsFileContent = await vscode.workspace.fs.readFile(
			vscode.Uri.parse(settingsFileUrl)
		);

		const credentials: Configuration = JSON.parse(new TextDecoder().decode(settingsFileContent));

		if (credentials.supabaseKey === '' || credentials.supabaseKey === undefined) {
			vscode.window.showErrorMessage('Supabase API Key and Database URL are mandatory to execute this action! Check yout configuration file doc.json');
		}
		if (credentials.supabaseUrl === '' || credentials.supabaseUrl === undefined) {
			vscode.window.showErrorMessage('Supabase API Key and Database URL are mandatory to execute this action! Check yout configuration file doc.json');
		}
		
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Generating documentation for file...",
			cancellable: true
		}, (progress, token) => {
			token.onCancellationRequested(() => {
				console.log("User canceled the long running operation");
			});

			progress.report({ increment: 0 });

			setTimeout(() => {
				progress.report({ increment: 10, message: "Still going..." });
			}, 10000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "Still going even more..." });
			}, 20000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "I am long running!" });
			}, 30000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "Almost there..." });
			}, 40000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "A bit more time..." });
			}, 50000);

			const p = new Promise<void>(async resolve => {
				const javaFileContent = await vscode.workspace.fs.readFile(
					fileUri
				);

				const methodsWithContent = getMethodsWithContent(new TextDecoder().decode(javaFileContent));
				const documentPattern = await createMarkdownDocumentationPattern(methodsWithContent, credentials.supabaseUrl, credentials.supabaseKey);
				let rootLink;
				rootLink = vscode.workspace.workspaceFolders![0].uri.fsPath + '/documentation.md';
				await vscode.workspace.fs.writeFile(
					vscode.Uri.parse(rootLink), new TextEncoder().encode(documentPattern)
				);

				vscode.window.showInformationMessage('Documentation file was generated!');
				resolve();
			});
			return p;
		});
	});

	let disposableLoad = vscode.commands.registerCommand('automated-documentation-for-java.loadProjectToMemory', async (dirUri) => {

		let settingsFileUrl = vscode.workspace.workspaceFolders![0].uri.fsPath + '/doc.json';
		const settingsFileContent = await vscode.workspace.fs.readFile(
			vscode.Uri.parse(settingsFileUrl)
		);

		const credentials: Configuration = JSON.parse(new TextDecoder().decode(settingsFileContent));

		if (credentials.supabaseKey === '' || credentials.supabaseKey === undefined) {
			vscode.window.showErrorMessage('Supabase API Key and Database URL are mandatory to execute this action! Check yout configuration file doc.json');
		}
		if (credentials.supabaseUrl === '' || credentials.supabaseUrl === undefined) {
			vscode.window.showErrorMessage('Supabase API Key and Database URL are mandatory to execute this action! Check yout configuration file doc.json');
		}

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Loading folder to memory...",
			cancellable: true
		}, (progress, token) => {
			token.onCancellationRequested(() => {
				console.log("User canceled the long running operation");
			});

			progress.report({ increment: 0 });

			setTimeout(() => {
				progress.report({ increment: 10, message: "Still going..." });
			}, 10000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "Still going even more..." });
			}, 20000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "I am long running!" });
			}, 30000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "Almost there..." });
			}, 40000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "A bit more time..." });
			}, 50000);

			const p = new Promise<void>(async resolve => {
				await vscode.workspace.fs.copy(
					dirUri,
					vscode.Uri.parse(`${__dirname}/sourcecode`)
				);

				try {
					await loadSourceCodeFilesToVector(`${__dirname}/sourcecode`, credentials.supabaseUrl, credentials.supabaseKey);
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

				resolve();
			});
			return p;
		});

	});

	context.subscriptions.push(disposableGenerate, disposableLoad);
}

// This method is called when your extension is deactivated
export function deactivate() { }