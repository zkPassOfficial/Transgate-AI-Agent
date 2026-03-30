import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import config from '../config/index.js';
import { searchSchemasTool, searchCampaignsTool } from './tools.js';
import { buildSystemPrompt } from './prompt.js';

const llm = new ChatOpenAI({
  model: config.openai.model,
  apiKey: config.openai.apiKey,
  temperature: 0,
});

const checkpointer = new MemorySaver();

const agent = createReactAgent({
  llm,
  tools: [searchSchemasTool, searchCampaignsTool],
  prompt: buildSystemPrompt(),
  checkpointer,
});

export default agent;
