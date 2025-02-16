// Peer dependency
import * as parse from "pdf-parse";
//import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
//import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {ChatOllama} from '@langchain/ollama';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";


import { OllamaEmbeddings } from "@langchain/ollama";


export async function loadAndSplitChunks({
  chunkSize,
  chunkOverlap
}) {
  const loader = new PDFLoader("./data/MachineLearning-Lecture01.pdf");

  const rawCS229Docs = await loader.load();
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });
  
  const splitDocs = await splitter.splitDocuments(rawCS229Docs);
  return splitDocs;
}

export async function initializeVectorstoreWithDocuments({
  documents
}) {
  const embeddings = new OllamaEmbeddings({
  model: "llama3.1:latest",
  baseUrl: "http://localhost:11434",
});
  const vectorstore = new MemoryVectorStore(embeddings);
  await vectorstore.addDocuments(documents);
  return vectorstore;
}

export function createDocumentRetrievalChain() {
  const convertDocsToString = (documents: Document[]): string => {
    return documents.map((document) => `<doc>\n${document.pageContent}\n</doc>`).join("\n");
  };

  const documentRetrievalChain = RunnableSequence.from([
    (input) => input.standalone_question,
    retriever,
    convertDocsToString,
  ]);
  
  return documentRetrievalChain;
}

export function createRephraseQuestionChain() {
  const REPHRASE_QUESTION_SYSTEM_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.`;

  const rephraseQuestionChainPrompt = ChatPromptTemplate.fromMessages([
    ["system", REPHRASE_QUESTION_SYSTEM_TEMPLATE],
    new MessagesPlaceholder("history"),
    ["human", "Rephrase the following question as a standalone question:\n{question}"],
  ]);
  const rephraseQuestionChain = RunnableSequence.from([
    rephraseQuestionChainPrompt,
    new ChatOllama({model:  "llama3.1:latest", baseUrl: "http://localhost:11434"}),
    new StringOutputParser(),
  ]);
  return rephraseQuestionChain;
}
