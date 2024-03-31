import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { formatDocumentsAsString } from "langchain/util/document";


const ollamaEmbeddings = new OllamaEmbeddings({
    model: "codellama:7b",
    baseUrl: "http://localhost:11434",
});


async function getGeneratedUseCase(methodName: string, methodContent: string) {
    const privateKey = "";
    if (!privateKey) { throw new Error(`No value for SUPABASE KEY`); }
    const url = "";
    if (!url) { throw new Error(`No value for SUPABASE URL`); }
    const supabaseClient = createClient(url, privateKey);

    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        ollamaEmbeddings,
        {
            client: supabaseClient,
            tableName: "documents",
            queryName: "match_documents",
        }
    );
    const relevantDocs = await vectorStore.similaritySearch(`.${methodName}(`, 4);
    const formattedRelevantDocs: string = formatDocumentsAsString(relevantDocs);
    console.log(`FOUND DOCS: ${formattedRelevantDocs}`);

    const useCasePrompt = `There is the code of the project:
        <code>
        ${formattedRelevantDocs}
        <code>
        Based on the usage of the method in the code, write enumerated list of use cases, when method ${methodName} can be used in the project.
        Enumerated list:`;
    
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
            model: 'codellama:7b',
            prompt: useCasePrompt,
            stream: false
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data: any = await response.json();

    return data.response;
}

async function getGeneratedDocumentation(methodName: string, methodContent: string) {
    const documentationPrompt = `There is the code of the method ${methodName}:
        <code>
        ${methodContent}
        <code>
        Based on the the code, write technical documentation for the method.
        Technical documentation:`;
    
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
            model: 'codellama:7b',
            prompt: documentationPrompt,
            stream: false
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data: any = await response.json();

    return data.response;
}


async function loadSourceCodeFilesToVector(directoryPath: string) {
    const loader = new DirectoryLoader(
        `${directoryPath}`,
        {
            ".java": (path) => new TextLoader(path),
        }
    );
    const docs = await loader.load();
    const javaSplitter = RecursiveCharacterTextSplitter.fromLanguage("java", {
        chunkSize: 1000,
        chunkOverlap: 500,
    });
    const texts = await javaSplitter.splitDocuments(docs);

    const privateKey = "";
    if (!privateKey) { throw new Error(`No value for SUPABASE_KEY`); }
    const url = "";
    if (!url) { throw new Error(`No value for SUPABASE_URL`); }
    const client = createClient(url, privateKey);

    // use embedding model to ingest documents into a vectorstore
    // vectorstore class will automatically prepare each raw document using the embeddings model
    // we have this data indexed in a vectorstore
    await SupabaseVectorStore.fromDocuments(
        texts,
        ollamaEmbeddings,
        {
            client,
            tableName: "documents",
            queryName: "match_documents",
        }
    );

}

export { getGeneratedUseCase, loadSourceCodeFilesToVector, getGeneratedDocumentation };