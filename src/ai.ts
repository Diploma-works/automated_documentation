import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { formatDocumentsAsString } from "langchain/util/document";


const ollamaEmbeddings = new OllamaEmbeddings({
    model: "phi3:instruct",
    baseUrl: "http://localhost:11434",
});


async function getGeneratedUseCase(methodName: string, supabaseUrl: string, supabaseKey: string) {
    if (!supabaseKey) { throw new Error(`No value for SUPABASE KEY`); }
    if (!supabaseUrl) { throw new Error(`No value for SUPABASE URL`); }
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

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

    const useCasePrompt = `You will be given the code of the project, where some method is called.
        1. Find snippets where the given method is called. If you can not find such snippets, answer only one sentence: "Usecases are not found". Do not write anything else.
        2. If you have found snippets, for each snippet write one sentence with its summary: when and for what purpose the method was called. Do not write anything about other methods.
        For example, if you the method name "updateToSeen" and the example code below:
            @PutMapping(path = "/{notificationId}")
            public ResponseEntity<NotificationResponse> setOneAsSeenNotification(
                @AuthenticationPrincipal UserLoginInfo userDetails,
                @Valid @PathVariable @Parameter(name = "notificationId", description = "ID уведомления", example = "15") Integer notificationId
            ) {
                NotificationResponse responseBody = NotificationMapper
                    .notificationToNotificationResponse(
                        notificationService.updateToSeen(
                            notificationId,
                            userDetails.getUser().getId()));
                return ResponseEntity.ok(responseBody);
            }
        Your answer looked like these:
            Use case: 
            UnotificationService.updateToSeen(
                notificationId,
                userDetails.getUser().getId()
            )
            Description: The updateToSeen method is called in the setOneAsSeenNotification endpoint when a user marks a specific notification as seen. The method is called to update the notification status to "seen" for the given notificationId and userId. This is done to keep track of which notifications have been seen by the user.
        Now complete instruction for the method name ${methodName} and code: ${formattedRelevantDocs}.
        Answer:
        
        Please analyze the provided code and perform the following tasks:
        1. Analyze the code snippet provided as ${formattedRelevantDocs} and identify instances where the method ${methodName} is called.
        2. If no such instances are found, respond with a single sentence: "Usecases are not found".
        3. If instances are found, for each snippet, provide a brief summary in a single sentence describing when and for what purpose the ${methodName} method is called.
        Format your response as follows:
    
        Use case: 
        [code snippet of method ${methodName} usage]
        Description: [brief summary sentence of code snippet]

        For example, answer for the method "updateToSeen" and code "@PutMapping(path = "/{notificationId}")
        public ResponseEntity<NotificationResponse> setOneAsSeenNotification(
            @AuthenticationPrincipal UserLoginInfo userDetails,
            @Valid @PathVariable @Parameter(name = "notificationId", description = "ID уведомления", example = "15") Integer notificationId
        ) {
            NotificationResponse responseBody = NotificationMapper
                .notificationToNotificationResponse(
                    notificationService.updateToSeen(
                        notificationId,
                        userDetails.getUser().getId()));
            return ResponseEntity.ok(responseBody);
        }"
        Will be the following:
        "Use case: 
            UnotificationService.updateToSeen(
                notificationId,
                userDetails.getUser().getId()
            )
            Description: The updateToSeen method is called in the setOneAsSeenNotification endpoint when a user marks a specific notification as seen. The method is called to update the notification status to "seen" for the given notificationId and userId. This is done to keep track of which notifications have been seen by the user.
        "

        Please provide your answer based on the given code and method name.`;
    
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
            model: 'phi3:instruct',
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
    const documentationPrompt = `
        You will be given the code of the project, where some method is implemented.
        1. Write technical documentation for the method with the following parts: Method, Purpose, Logic, Notes. Do not include any other parts in your answer.
        For example, if you were given the following code:
        @Transactional public Task edit(Integer id, TaskRequest taskRequest) {
            Task task = taskRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, ExceptionConst.TASK_NOT_FOUND_MESSAGE));
            Event event = eventService.findById(taskRequest.eventId());
            User assigner = task.getAssigner();
            User prevAssignee = task.getAssignee();
            User assignee = null;
            if (taskRequest.assigneeId() != null) {
                assignee = userService.findById(taskRequest.assigneeId());
            }
            Place place = null;
            if (taskRequest.placeId() != null) {
                place = placeService.findById(taskRequest.placeId());
            }
            Task newTaskData = TaskMapper.taskRequestToTask(taskRequest, event, assignee, assigner, place);
            newTaskData.setId(task.getId());
            newTaskData.setCreationTime(task.getCreationTime());
            if (LocalDateTime.now().isAfter(newTaskData.getDeadline())) {
                newTaskData.setStatus(TaskStatus.EXPIRED);
            }
            newTaskData = taskRepository.save(newTaskData);
            if (assignee != null && (prevAssignee == null || !Objects.equals(prevAssignee.getId(), assignee.getId()))) {
                taskNotificationUtils.createIncomingTaskNotification(newTaskData);
                taskDeadlineTriggerService.createNewDeadlineTrigger(newTaskData);
                taskReminderTriggerService.createNewReminderTrigger(newTaskData);
            }
            return newTaskData;
        }
        Your answer looked like:
            Method: edit
            Purpose: Updates an existing task with new data.    
            Parameters:
                id: The ID of the task to be updated.
                taskRequest: An object containing the new task data.
            Logic:
                Retrieves the task with the given id from the database. If not found, throws a ResponseStatusException.
                Retrieves the associated event, assigner, and previous assignee from the database.
                Updates the task's assignee and place if new IDs are provided in the taskRequest.
                Creates a new Task object with the updated data using the TaskMapper.
                Saves the updated task to the database.
                If the assignee has changed, creates incoming task notifications, deadline triggers, and reminder triggers.
                Returns the updated task.
            Notes:
            The method is annotated with @Transactional, ensuring that all database operations are executed within a single transaction.
            The method throws a ResponseStatusException if the task with the given id is not found.
            The TaskMapper is used to convert the taskRequest object to a Task object.

        Now complete instruction for method with name ${methodName} and the code of its implementation
        ${methodContent}
        Your answer:`;
    
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
            model: 'phi3:instruct',
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


async function loadSourceCodeFilesToVector(directoryPath: string, supabaseUrl: string, supabaseKey: string) {
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

    if (!supabaseKey) { throw new Error(`No value for SUPABASE_KEY`); }
    if (!supabaseUrl) { throw new Error(`No value for SUPABASE_URL`); }
    const client = createClient(supabaseUrl, supabaseKey);

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