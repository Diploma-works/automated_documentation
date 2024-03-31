import { getGeneratedDocumentation } from './ai';

async function createMarkdownDocumentationPattern(methodsWithContent: Map<string, string>) {

    let resultPattern = "";
    for (let [key, value] of methodsWithContent) {
        resultPattern += `### Метод ${key}\n\n`;

        const result = await getGeneratedDocumentation(key, value);

        resultPattern += `Содержание метода:\n\n \`\`\`\n${result}\n\n \`\`\`\n\n`;
    }

    return resultPattern;
}

export { createMarkdownDocumentationPattern };