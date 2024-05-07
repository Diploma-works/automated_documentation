import { getGeneratedDocumentation, getGeneratedUseCase } from './ai';

async function createMarkdownDocumentationPattern(methodsWithContent: Map<string, string>, supabaseUrl: string, supabaseKey: string) {

    let resultPattern = "";
    for (let [key, value] of methodsWithContent) {
        resultPattern += `### Method ${key}\n\n`;

        const useCase = await getGeneratedUseCase(key, supabaseUrl, supabaseKey);
        const documentation = await getGeneratedDocumentation(key, value);

        resultPattern += `#### Use cases:\n\n\n${useCase}\n\n\n`;
        resultPattern += `#### Information:\n\n\n${documentation}\n\n\n\n`;
    }

    return resultPattern;
}

type Configuration = {
    supabaseKey: string,
    supabaseUrl: string
};

export { createMarkdownDocumentationPattern, Configuration };