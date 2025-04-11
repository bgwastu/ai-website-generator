import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { CoreMessage } from 'ai';
import { z } from 'zod';
import { generateId } from 'ai'; // Keep for potential tool call IDs if needed internally, though useChat handles client-side IDs

// Define Hub interface and initial state here or import from a shared location
export interface Hub {
  climate: Record<"low" | "high", number>;
  lights: Array<{ name: string; status: boolean }>;
  locks: Array<{ name: string; isLocked: boolean }>;
}

// In-memory state for the hub (move to DB in production)
let hub: Hub = {
  climate: {
    low: 23,
    high: 25,
  },
  lights: [
    { name: "patio", status: true },
    { name: "kitchen", status: false },
    { name: "garage", status: true },
  ],
  locks: [{ name: "back door", isLocked: true }],
};

// Define schemas for tools
const viewCamerasParams = z.object({});
const viewHubParams = z.object({});
const updateHubParams = z.object({
  hub: z.object({
    climate: z.object({
      low: z.number(),
      high: z.number(),
    }),
    lights: z.array(
      z.object({ name: z.string(), status: z.boolean() })
    ),
    locks: z.array(
      z.object({ name: z.string(), isLocked: z.boolean() })
    ),
  }),
});
const viewUsageParams = z.object({
  type: z.enum(["electricity", "water", "gas"]),
});


export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    system: `\
      - you are a friendly home automation assistant
      - reply in lower case
    `,
    messages,
    tools: {
      viewCameras: {
        description: 'view current active cameras',
        parameters: viewCamerasParams,
        execute: async ({}) => {
          // In AI SDK UI, tool execution returns data, not components.
          // The client will render the CameraView component.
          // We can return a simple status or confirmation.
          return { status: 'displaying cameras' };
          // Note: The original RSC implementation updated AI state here.
          // streamText/useChat handles this automatically based on tool results.
        },
      },
      viewHub: {
        description: 'view the hub that contains current quick summary and actions for temperature, lights, and locks',
        parameters: viewHubParams,
        execute: async ({}) => {
          // Return the current hub state data. Client renders HubView.
          return hub;
        },
      },
      updateHub: {
        description: 'update the hub with new values',
        parameters: updateHubParams,
        execute: async ({ hub: newHub }) => {
          // Update the in-memory state
          hub = newHub;
          // Return the updated hub state. Client renders HubView.
          return hub;
        },
      },
      viewUsage: {
        description: 'view current usage for electricity, water, or gas',
        parameters: viewUsageParams,
        execute: async ({ type }) => {
          // Return the type of usage requested. Client renders UsageView.
          return { type };
        },
      },
    },
    // onFinish callback for saving chat (implement DB logic here)
    // onFinish: async ({ text, toolCalls, toolResults, finishReason, usage, response }) => {
    //   console.log('Chat finished:', { text, toolCalls, toolResults, finishReason, usage });
    //   // Example: Save final messages to DB
    //   // const finalMessages = [...messages, ...response.messages];
    //   // await saveChatToDb(chatId, finalMessages);
    // },
  });

  return result.toDataStreamResponse();
}