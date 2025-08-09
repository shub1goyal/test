// Import the Google Generative AI SDK
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash';

// API Key Management
let API_KEY = localStorage.getItem('gemini_api_key') || '';
let genAI = null;

// Initialize the Gemini API client if we have an API key
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
}

// The system instruction needs to be in a format compatible with the Gemini API
const SYSTEM_INSTRUCTION = {
    role: "user",
    parts: [{
        text: "You are Analyst AI, a helpful assistant that can analyze documents and answer questions.\n- Respond in a clear, concise manner\n- Format your responses using Markdown when appropriate\n- When analyzing documents, provide structured insights\n- For tables, use proper Markdown table syntax\n- Be accurate and helpful"
    }]
};

// State management
let messages = []; // Array of message objects {id, role, text}
let isLoading = false;
let uploadedFiles = [];
let chatSession = null; // To hold the Gemini chat session


// DOM Elements
const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const attachButton = document.getElementById('attach-button');
const fileInput = document.getElementById('file-input');
const filePreviewsContainer = document.getElementById('file-previews');

// API Key Modal Elements
const apiKeyButton = document.getElementById('api-key-button');
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyForm = document.getElementById('api-key-form');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyCancelButton = document.getElementById('api-key-cancel');
const dropzone = document.getElementById('dropzone');



// Event Listeners
chatForm.addEventListener('submit', handleSendMessage);
attachButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelection);

// API Key Modal Event Listeners
apiKeyButton.addEventListener('click', openApiKeyModal);
apiKeyCancelButton.addEventListener('click', closeApiKeyModal);
apiKeyForm.addEventListener('submit', saveApiKey);




// Drag and Drop Event Listeners
['dragenter', 'dragover'].forEach(eventName => {
    document.body.addEventListener(eventName, handleDragEnter);
});

['dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, handleDragLeave);
});

document.body.addEventListener('dragover', handleDragOver);
document.body.addEventListener('drop', handleDrop);
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendButton.click();
    }
});

// Initialize the chat with a welcome message
initializeChat();


/**
 * API Key Modal Functions
 */
function openApiKeyModal() {
    // Pre-fill with existing API key if available
    if (API_KEY) {
        apiKeyInput.value = API_KEY;
    }
    apiKeyModal.classList.remove('hidden');
}

function closeApiKeyModal() {
    apiKeyModal.classList.add('hidden');
}

function saveApiKey(event) {
    event.preventDefault();
    const newApiKey = apiKeyInput.value.trim();
    
    if (!newApiKey) {
        alert('Please enter a valid API key');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('gemini_api_key', newApiKey);
    API_KEY = newApiKey;

    // Initialize the Gemini API client with the new key
    genAI = new GoogleGenerativeAI(API_KEY);
    
    // Reset chat session to use the new API key
    chatSession = null;
    
    // Close the modal
    closeApiKeyModal();
    
    // Add a confirmation message
    messages.push({
        id: Date.now(),
        role: 'model',
        text: 'API key has been updated successfully! You can now use the chat.'
    });
    
    render();
}

/**
 * Drag and Drop Functions
 */
function handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
        dropzone.classList.remove('hidden');
    }
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.relatedTarget === null || !dropzone.contains(event.relatedTarget)) {
        dropzone.classList.add('hidden');
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.add('hidden');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection({ target: { files: files } });
    }
}



/**
 * Initialize the chat with a welcome message
 */
function initializeChat() {
    let welcomeMessage = 'Hello! I\'m Analyst AI. I can help you analyze documents and answer questions. Upload a document or ask me anything!';
    
    // Add API key setup instructions if no API key is set
    if (!API_KEY) {
        welcomeMessage += '\n\n**Important Setup Required**: You need to set up your Gemini API key before using this application. Click the "Set API Key" button in the top right corner to get started.';
    }
    
    messages = [
        {
            id: Date.now(),
            role: 'model',
            text: welcomeMessage
        }
    ];
    render();
}

/**
 * Render the UI based on current state
 */
function render() {
    // Clear the chat container
    chatContainer.innerHTML = '';
    
    // Render each message
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add(
            'p-3', 
            'rounded-lg', 
            'max-w-3/4', 
            'mb-4',
            message.role === 'user' ? 'ml-auto' : 'mr-auto'
        );
        
        // Apply different styling based on message role
        if (message.role === 'user') {
            messageElement.classList.add('bg-indigo-600', 'text-white');
        } else {
            messageElement.classList.add('bg-slate-800');
            
            // Add logo for model messages
            const logoContainer = document.createElement('div');
            logoContainer.classList.add('flex', 'items-center', 'mb-2');
            
            const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            logo.setAttribute('class', 'w-5 h-5 mr-2');
            logo.setAttribute('viewBox', '0 0 24 24');
            logo.setAttribute('fill', 'none');
            logo.innerHTML = `
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
            
            logoContainer.appendChild(logo);
            logoContainer.appendChild(document.createTextNode('Analyst AI'));
            messageElement.appendChild(logoContainer);
        }
        
        // Create message content container
        const contentElement = document.createElement('div');
        
        // Parse markdown for model messages
        if (message.role === 'model') {
            contentElement.classList.add('markdown-content');
            let content = message.text || '';
            // Check for and format pipe-separated tables
            if (content.includes('|') && !content.includes('---')) {
                content = content.split('\n').map(line => 
                    line.trim().startsWith('|') && line.trim().endsWith('|') ? line : `| ${line.replace(/\s*\|\s*/g, ' | ')} |`
                ).join('\n');
                const lines = content.split('\n');
                if (lines.length > 1 && lines[0].includes('|')) {
                    const headerSeparator = lines[0].split('|').slice(1, -1).map(() => '---').join(' | ');
                    lines.splice(1, 0, `| ${headerSeparator} |`);
                    content = lines.join('\n');
                }
            }
            contentElement.innerHTML = marked.parse(content);
        } else {
            contentElement.textContent = message.text;
        }
        
        messageElement.appendChild(contentElement);
        chatContainer.appendChild(messageElement);
    });
    
    // Add typing indicator if loading
    if (isLoading) {
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('bg-slate-800', 'p-3', 'rounded-lg', 'mr-auto', 'mb-4', 'flex', 'items-center');
        
        // Add logo
        const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        logo.setAttribute('class', 'w-5 h-5 mr-2');
        logo.setAttribute('viewBox', '0 0 24 24');
        logo.setAttribute('fill', 'none');
        logo.innerHTML = `
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        
        typingIndicator.appendChild(logo);
        typingIndicator.appendChild(document.createTextNode('Analyst AI is typing...'));
        chatContainer.appendChild(typingIndicator);
    }
    
    // Update UI state based on isLoading
    messageInput.disabled = isLoading;
    sendButton.disabled = isLoading;
    attachButton.disabled = isLoading;
    
    // Update file previews
    filePreviewsContainer.innerHTML = ''; // Clear existing previews
    if (uploadedFiles.length > 0) {
        uploadedFiles.forEach((file, index) => {
            const previewElement = document.createElement('div');
            previewElement.className = 'bg-white/10 p-2 rounded-lg flex items-center justify-between';
            previewElement.innerHTML = `
                <span class="text-sm text-gray-300 truncate">${file.name}</span>
                <button data-index="${index}" class="remove-file-btn text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            `;
            filePreviewsContainer.appendChild(previewElement);
        });

        // Add event listeners to new remove buttons
        document.querySelectorAll('.remove-file-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const indexToRemove = event.currentTarget.dataset.index;
                handleRemoveFile(indexToRemove);
            });
        });
    }
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Handle file selection
 * @param {Event} event - The change event from the file input
 */
function handleFileSelection(event) {
    const files = event.target.files;
    if (files.length > 0) {
        for (const file of files) {
            const validTypes = ['.pdf', '.docx', '.txt'];
            const fileExtension = file.name.substring(file.name.lastIndexOf('.'));

            if (validTypes.includes(fileExtension.toLowerCase())) {
                if (!uploadedFiles.some(f => f.name === file.name)) {
                    uploadedFiles.push(file);
                }
            } else {
                alert(`File type not supported for ${file.name}. Please upload PDF, DOCX, or TXT files.`);
            }
        }
        render();
        // Reset file input to allow selecting the same file again
        fileInput.value = '';
    }
}

/**
 * Remove an uploaded file by its index
 * @param {number} index - The index of the file to remove
 */
function handleRemoveFile(index) {
    uploadedFiles.splice(index, 1);
    render();
}

/**
 * Convert a file to base64
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - A promise that resolves to the base64 string
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Extract the base64 part from the data URL
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * Handle sending a message
 * @param {Event} event - The submit event from the form
 */
async function handleSendMessage(event) {
    event.preventDefault();
    
    const userMessage = messageInput.value.trim();
    
    // Don't send if there's no message and no files
    if (!userMessage && uploadedFiles.length === 0) return;
    
    // Check if API key is set
    if (!API_KEY) {
        messages.push({
            id: Date.now(),
            role: 'user',
            text: userMessage || `Please analyze the attached file(s).`
        });
        
        // Clear input
        messageInput.value = '';
        
        // Render to show user message
        render();
        
        // No API key, so we need to stop and wait for the user to set it
        return;
    }
    
    try {
        // Set loading state
        isLoading = true;
        
        // Add user message to chat
        let messageText = userMessage;
        if (uploadedFiles.length > 0) {
            const fileNames = uploadedFiles.map(f => f.name).join(', ');
            const fileText = `Please analyze the following file(s): ${fileNames}.`;
            messageText = userMessage ? `${userMessage}\n\n${fileText}` : fileText;
        }

        messages.push({
            id: Date.now(),
            role: 'user',
            text: messageText
        });
        
        // Clear input
        messageInput.value = '';
        
        // Render to show user message
        render();
        
        // Prepare file data if present
        const fileParts = [];
        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                const base64 = await fileToBase64(file);
                fileParts.push({
                    inlineData: {
                        mimeType: file.type,
                        data: base64
                    }
                });
            }
            // Clear the files after preparing them
            uploadedFiles = [];
        }
        
        // Initialize chat session if it doesn't exist
        if (!chatSession) {
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });
            
            // Set safety settings
            const safetySettings = [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                }
            ];
            
            // Create chat session with system instruction
            chatSession = model.startChat({
                history: [],
                safetySettings,
                generationConfig: { temperature: 0.4 },
                systemInstruction: SYSTEM_INSTRUCTION
            });
        }
        
        // Add placeholder for model response
        const responseId = Date.now() + 1;
        messages.push({
            id: responseId,
            role: 'model',
            text: ''
        });
        
        // Prepare content parts for the message
        const contentParts = [];
        
        // Add text if present
        if (userMessage) {
            contentParts.push({ text: userMessage });
        }
        
        // Add files if present
        if (fileParts.length > 0) {
            contentParts.push(...fileParts);
        }
        
        // Send message to Gemini API and stream the response
        const result = await chatSession.sendMessageStream(contentParts);
        
        // Process the streamed response
        let responseText = '';
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            responseText += chunkText;
            
            // Update the model's message with the accumulated text
            const modelMessageIndex = messages.findIndex(msg => msg.id === responseId);
            if (modelMessageIndex !== -1) {
                messages[modelMessageIndex].text = responseText;
                render();
            }
        }
        
        // Set loading state to false when done
        isLoading = false;
        render();
        
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Prepare a user-friendly error message
        let errorMessage = 'Sorry, an error occurred. Please try again.';
        
        // Check for API key errors
        if (error.message && error.message.includes('API key not valid')) {
            errorMessage = 'Your Gemini API key is invalid or not set. Please use the "Set API Key" button to enter a valid key. You can get one from [Google AI Studio](https://makersuite.google.com/app/apikey).';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        // Add error message to chat
        messages.push({
            id: Date.now() + 1,
            role: 'model',
            text: errorMessage
        });
        
        // Set loading state to false
        isLoading = false;
        render();
    }
}
