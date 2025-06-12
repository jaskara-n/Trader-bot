import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { prepareAgentkitAndWalletProvider } from "./prepare-agentkit";
import { getAllTransactions } from "@/app/utils/transactionInsights";
/**
 * Agent Configuration Guide
 *
 * This file handles the core configuration of your AI agent's behavior and capabilities.
 *
 * Key Steps to Customize Your Agent:
 *
 * 1. Select your LLM:
 *    - Modify the `ChatOpenAI` instantiation to choose your preferred LLM
 *    - Configure model parameters like temperature and max tokens
 *
 * 2. Instantiate your Agent:
 *    - Pass the LLM, tools, and memory into `createReactAgent()`
 *    - Configure agent-specific parameters
 */

// The agent
let agent: ReturnType<typeof createReactAgent>;

/**
 * Initializes and returns an instance of the AI agent.
 * If an agent instance already exists, it returns the existing one.
 *
 * @function getOrInitializeAgent
 * @returns {Promise<ReturnType<typeof createReactAgent>>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function createAgent(): Promise<
  ReturnType<typeof createReactAgent>
> {
  // If agent has already been initialized, return it
  if (agent) {
    return agent;
  }

  try {
    const { agentkit, walletProvider } =
      await prepareAgentkitAndWalletProvider();
    const allTransactions = await getAllTransactions();
    const transactionsContext = JSON.stringify(allTransactions, null, 2);
    // Initialize LLM: https://platform.openai.com/docs/models#gpt-4o
    const llm = new ChatDeepSeek({ model: "deepseek-chat" });

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();

    // Initialize Agent
    const canUseFaucet =
      walletProvider.getNetwork().networkId == "base-sepolia";
    const faucetMessage = `If you ever need funds, you can request them from the faucet.`;
    const cantUseFaucetMessage = `If you need funds, you can provide your wallet details and request funds from the user.`

    agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful trader agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are empowered to interact onchain using your tools. 
        ${canUseFaucet ? faucetMessage : cantUseFaucetMessage}.
        Before executing your first action, get the wallet details to determine what network you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later.
        If someone asks you to do something you can't do with your currently available tools, you must clearly state that, and encourage them to implement it themselves using the CDP SDK + AgentKit. Recommend they visit docs.cdp.coinbase.com for more information.
        Be concise and helpful with your responses. Refrain from restating your tools' descriptions unless explicitly requested.
        User Flow Instruction:
        If the user prompts with something like "What are some good investment opportunities with medium risk?", 
        your task is to provide suitable opportunities such as staking on Compound or performing a token swap. 
        Each option should include details about the associated risk and expected return. 
        If the user selects one of the presented opportunities, proceed to execute the action.
        --- BEGIN TRANSACTION DATA ---
        ${transactionsContext}
        --- END TRANSACTION DATA ---
        If the user asks questions about stake activity,Portfolio analysis, swap recommendations, or requests insights based on previous activity, analyze the above context and provide relevant, data-backed answers.
        When asked about transaction patterns, trends, or recommendations, analyze the conversation and transaction history to provide insights.
        `,
    });

    return agent;
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}
