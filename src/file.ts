import { getGeneratedDocumentation, getGeneratedUseCase } from './ai';
import { MethodInfo } from './parser';

async function createMarkdownDocumentationPattern(methodsWithContent: Array<MethodInfo>, supabaseUrl: string, supabaseKey: string) {

    let resultPattern = "";
    for (let method of methodsWithContent) {
        resultPattern += `### Method ${method.methodName}\n\n`;

        const useCase = await getGeneratedUseCase(method, supabaseUrl, supabaseKey);
        const documentation = await getGeneratedDocumentation(method);

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