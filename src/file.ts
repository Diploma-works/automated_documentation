import fetch from 'node-fetch';

// callback to print each word 


async function createMarkdownDocumentationPattern(methodsWithContent: Map<string, string>) {
    let resultPattern = ""
    for (let [key, value] of methodsWithContent) {
        resultPattern += `### Метод ${key}\n\n`

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            body: JSON.stringify({
                model: 'gemma:2b',
                prompt: `Write short technical documentation for method inside symbols @@@: \n@@@${value}@@@`,
                stream: false
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        resultPattern += `Содержание метода:\n\n \`\`\`\n${data.response}\n\n \`\`\`\n\n`
    }

    return resultPattern;
}

export { createMarkdownDocumentationPattern }