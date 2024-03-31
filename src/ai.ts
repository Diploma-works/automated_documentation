import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";

import {
    ChatPromptTemplate,
    MessagesPlaceholder,
    PromptTemplate
  } from "@langchain/core/prompts";
import { Ollama } from "@langchain/community/llms/ollama";
import { RunnableSequence } from "langchain/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { StringOutputParser } from "langchain/schema/output_parser";
import { createRetrievalChain } from "langchain/chains/retrieval";


// const ollama = new Ollama({
//     baseUrl: "http://localhost:11434",
//     model: "gemma:2b",
// }).pipe(
//     new StringOutputParser()
// );

const ollama = new Ollama({
    baseUrl: "http://localhost:11434",
    model: "gemma:2b",
});

const ollamaEmbeddings = new OllamaEmbeddings({
    model: "gemma:2b",
    baseUrl: "http://localhost:11434",
});


async function getGeneratedDocumentation(methodName: string, methodContent: string) {
    const privateKey = "";
    if (!privateKey) {throw new Error(`Expected env var SUPABASE_KEY`);}
    const url = "";
    if (!url) {throw new Error(`Expected env var SUPABASE_URL`);}
    const client = createClient(url, privateKey);

    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        ollamaEmbeddings,
        {
            client,
            tableName: "documents",
            queryName: "match_documents",
        }
    );

    const retriever = vectorStore.asRetriever(2);

    // for test
    const relevantDocs = await retriever.getRelevantDocuments(methodName);

    const useCasePrompt = PromptTemplate.fromTemplate(
            `Given the name of the method and the pieces of code, where the method is used, formulate use cases when this method can be called,
            and provide one or two examples from the pieces of code. If no pieces are provided, answer: "No use cases found".
            Name of the method: {input}.
            Pieces of code, where the method is used:
            <context>
            {context}
            </context>`
    );

    const useCaseChain = await createStuffDocumentsChain({
        llm: ollama,
        prompt: useCasePrompt,
    });

    const retrievalChain = await createRetrievalChain({
        combineDocsChain: useCaseChain,
        retriever: retriever,
    });

    const result = await retrievalChain.invoke({
        input: methodName
    });

    // const documentationPrompt = ChatPromptTemplate.fromMessages([
    //     AIMessagePromptTemplate.fromTemplate(`You are a world class technical documentation writer. Write documentation for the Java method given below. The documentation must consist of the following parts:
    //         Name of the method
    //         General Description - describe method in no more than 2 sentences
    //         Use Cases - insert here information about Use Cases below without changes
    //         Logic of the method - describe the most significant parts of method in no more than 6 sentences
    //         Areas for Improvement
    //         Name of the method: {methodName}
    //         The method: {methodCode}`),
    //     AIMessagePromptTemplate.fromTemplate(`Use Cases: {useCases}`),
    // ]);

    // // 2. write docu with context
    // const documentationChain = RunnableSequence.from([
    //     {
    //         usingContext: useCaseChain,
    //         methodName: (input) => input.methodName,
    //         methodCode: (input) => input.methodCode,
    //     },
    //     documentationPrompt,
    //     ollama,
    //     new StringOutputParser(),
    // ]);

    //1. get context
    // const useCaseChain = RunnableSequence.from([
    //     {
    //         input: (input) => input.methodName,
    //         context: async (input) => {
    //             const relevantDocs = await retriever.getRelevantDocuments(input.methodName);
    //             return formatDocumentsAsString(relevantDocs);
    //         },
    //     },
    //     useCasePrompt,
    //     ollama,
    //     new StringOutputParser(),
    //     //documentationChain
    // ]);

    // // 0. 
    // const result = await useCaseChain.invoke({
    //     methodName: methodName,
    //     methodCode: methodContent
    // });

    // let kek = result;

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

    const privateKey = "";
    if (!privateKey) {throw new Error(`Expected env var SUPABASE_KEY`);}
    const url = "";
    if (!url) {throw new Error(`Expected env var SUPABASE_URL`);}
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

export { getGeneratedDocumentation, loadSourceCodeFilesToVector };