export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number | Date;
    movies?: Array<{
        id: number;
        // ... other movie properties
    }>;
} 