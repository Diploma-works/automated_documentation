import fetch from 'node-fetch';
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { TensorFlowEmbeddings } from "langchain/embeddings/tensorflow";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
    AIMessagePromptTemplate,
    HumanMessagePromptTemplate,
  } from "langchain/prompts";
  import { RunnableSequence } from "@langchain/core/runnables";
  import { formatDocumentsAsString } from "langchain/util/document";
  import { BaseMessage } from "langchain/schema";
  import { StringOutputParser } from "@langchain/core/output_parsers";
  import { Ollama } from "langchain/llms/ollama";

  const ollama = new Ollama({
    baseUrl: "http://localhost:11434",
    model: "gemma:2b",
  });


async function createMarkdownDocumentationPattern(methodsWithContent: Map<string, string>) {


    const loader = new DirectoryLoader(
        ".",
        {
            ".java": (path) => new TextLoader(path),
        }
    );
    const docs = await loader.load();

    const javaSplitter = RecursiveCharacterTextSplitter.fromLanguage("java", {
        chunkSize: 2000,
        chunkOverlap: 200,
    });
    const texts = await javaSplitter.splitDocuments(docs);

    console.log("Loaded ", texts.length, " documents.");


    const privateKey = ""
    if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

    const url = "https://jhywbgpvewqckylxochq.supabase.co";
    if (!url) throw new Error(`Expected env var SUPABASE_URL`);

    const client = createClient(url, privateKey);


    const vectorStore = await SupabaseVectorStore.fromDocuments(
        texts,
        new TensorFlowEmbeddings(),
        {
          client,
          tableName: "documents",
          queryName: "match_documents",
        }
      );

      const retriever = vectorStore.asRetriever({
        searchType: "mmr", // Use max marginal relevance search
        searchKwargs: { fetchK: 5 },
      });

      const prompt = ChatPromptTemplate.fromMessages([
        AIMessagePromptTemplate.fromTemplate(
          "Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n\n{context}\n\n"
        ),
        HumanMessagePromptTemplate.fromTemplate("Question: write documentation for the following method {method}"),
      ]);


      const chain = RunnableSequence.from([
        {
          method: (output: string) => output,
          context: async (output: string) => {
            const relevantDocs = await retriever.getRelevantDocuments(output);
            return formatDocumentsAsString(relevantDocs);
          },
        },
        prompt,
        ollama,
        new StringOutputParser(),
      ]);

    let resultPattern = ""
    for (let [key, value] of methodsWithContent) {
        resultPattern += `### Метод ${key}\n\n`

        // const response = await fetch('http://localhost:11434/api/generate', {
        //     method: 'POST',
        //     body: JSON.stringify({
        //         model: 'gemma:2b',
        //         prompt: `Write short technical documentation for method inside symbols @@@: \n@@@${value}@@@`,
        //         stream: false
        //     }),
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        // });

        // const data = await response.json();

        const result = await chain.invoke(value);

        resultPattern += `Содержание метода:\n\n \`\`\`\n${result}\n\n \`\`\`\n\n`
    }

    return resultPattern;
}

export { createMarkdownDocumentationPattern }