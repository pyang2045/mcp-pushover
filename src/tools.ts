import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { sendPushoverMessage } from './services/pushover.js';
import { ToolDefinition } from './types/index.js';
import { config } from './config.js';

// Define input schema with Zod
const pushoverSendInputSchema = z.object({
  message: z.string().describe("The message content to send"),
  user_key: z.string().optional().describe("Pushover user or group key (defaults to env var)"),
  api_token: z.string().optional().describe("Pushover application API token (defaults to env var)"),
  title: z.string().optional().describe("Optional message title"),
  priority: z.number().min(-2).max(2).optional().describe("Message priority (-2 to 2)"),
  sound: z.string().optional().describe("Notification sound"),
});

// Tool definition
export const pushoverTool: ToolDefinition = {
  name: 'pushover_send_message',
  description: 'Send a notification via Pushover',
  inputSchema: zodToJsonSchema(pushoverSendInputSchema),
  handler: async (args: unknown) => {
    const validated = pushoverSendInputSchema.parse(args);
    
    // Use defaults from config if not provided
    const token = validated.api_token || config.PUSHOVER_DEFAULT_TOKEN;
    const user = validated.user_key || config.PUSHOVER_DEFAULT_USER;
    
    if (!token || !user) {
      throw new Error('Pushover API token and user key are required. Provide them as parameters or set PUSHOVER_DEFAULT_TOKEN and PUSHOVER_DEFAULT_USER environment variables.');
    }
    
    try {
      const result = await sendPushoverMessage({
        token,
        user,
        message: validated.message,
        title: validated.title,
        priority: validated.priority,
        sound: validated.sound,
      });
      
      return {
        content: [{
          type: "text",
          text: `Message sent successfully (request ID: ${result.request})`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
};

// Tool registry
export const toolRegistry: ToolDefinition[] = [pushoverTool];