function createMarkdownDocumentationPattern(methodsWithContent: Map<string, string>) {
    let resultPattern = ""

    for (let [key, value] of methodsWithContent) {
        resultPattern += `### Метод ${key}\n\n`
        resultPattern += `Содержание метода:\n\n \`\`\`\n${value}\n\n \`\`\`\n\n`          
    }

    return resultPattern;
}

export { createMarkdownDocumentationPattern }