import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
    AIMessagePromptTemplate,
    HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { BaseMessage } from "langchain/schema";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Ollama } from "@langchain/community/llms/ollama";
import dotenv from 'dotenv';

const ollama = new Ollama({
    baseUrl: "http://localhost:11434",
    model: "gemma:2b",
}).pipe(
    new StringOutputParser()
);

const ollamaEmbeddings = new OllamaEmbeddings({
    model: "gemma:2b",
    baseUrl: "http://localhost:11434",
});

async function getGeneratedDocumentation(methodContent: string) {
    const privateKey = process.env.SUPABASE_KEY;
    if (!privateKey) throw new Error(`Expected env var SUPABASE_KEY`);
    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);
    const client = createClient(url, privateKey);
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        ollamaEmbeddings,
        {
            client,
            tableName: "documents",
            queryName: "match_documents",
        }
    );

    const retriever = vectorStore.asRetriever({
        searchType: "mmr",
        searchKwargs: { fetchK: 5 },
    });

    const combineDocumentsPrompt = ChatPromptTemplate.fromMessages([
        AIMessagePromptTemplate.fromTemplate(
            "Use the following pieces of context to perform the instuction at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n\n{context}\n\n"
        ),
        HumanMessagePromptTemplate.fromTemplate("Instuction: write documentation for the following Java method: {method}"),
    ]);

    const combineDocumentsChain = RunnableSequence.from([
        {
            method: (output: string) => output,
            context: async (output: string) => {
                const relevantDocs = await retriever.getRelevantDocuments(output);
                return formatDocumentsAsString(relevantDocs);
            },
        },
        combineDocumentsPrompt,
        ollama,
        new StringOutputParser(),
    ]);

    const result = await combineDocumentsChain.invoke(methodContent);
    return result;
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
    console.log("Loaded ", texts.length, " documents.");

    const privateKey = "";
    if (!privateKey) throw new Error(`Expected env var SUPABASE_KEY`);
    const url ="";
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);
    const client = createClient(url, privateKey);
    const vectorStore = await SupabaseVectorStore.fromDocuments(
        texts,
        ollamaEmbeddings,
        {
            client,
            tableName: "documents",
            queryName: "match_documents",
        }
    );
    console.log("Loaded project to SUPABASE");
}

export { getGeneratedDocumentation, loadSourceCodeFilesToVector }