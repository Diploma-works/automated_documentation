// async function copyFile(
//     vscode,
//     context,
//     outputChannel,
//     sourcePath,
//     destPath,
//     callBack
//   ) {
//     try {
//       const wsedit = new vscode.WorkspaceEdit();
//       const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
//       const data = await vscode.workspace.fs.readFile(
//         vscode.Uri.file(context.asAbsolutePath(sourcePath))
//       );
//       const filePath = vscode.Uri.file(wsPath + destPath);
//       wsedit.createFile(filePath, { ignoreIfExists: true });
//       await vscode.workspace.fs.writeFile(filePath, data);
//       let isDone = await vscode.workspace.applyEdit(wsedit);
//       if(isDone) {
//         outputChannel.appendLine(`File created successfully: ${destPath}`);
//         callBack(null, true);
//       }
//     } catch (err) {
//       outputChannel.appendLine(`ERROR: ${err}`);
//       callBack(err, false);
//     }
//   }