import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { prepareAgentkitAndWalletProvider } from "./prepare-agentkit";
import { AgentKit } from "@coinbase/agentkit";
import { swapActionProvider } from "./actions/swap";
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
let cachedAgentKit: AgentKit | null = null;
let cachedSwapActionProvider: ReturnType<typeof swapActionProvider> | null = null;

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
export async function createAgent(
  statusCallback?: (status: string, isDetailed?: boolean) => void
): Promise<{
  agent: ReturnType<typeof createReactAgent>;
  agentkit: AgentKit;
  swapActionProviderInstance: ReturnType<typeof swapActionProvider>;
}> {
  // If agent has already been initialized, return it
  if (agent && cachedAgentKit && cachedSwapActionProvider) {
    if (statusCallback) {
      cachedSwapActionProvider.setStatusCallback(statusCallback);
    }
    return { agent, agentkit: cachedAgentKit, swapActionProviderInstance: cachedSwapActionProvider };
  }

  try {
    const { agentkit, walletProvider, swapActionProviderInstance } =
      await prepareAgentkitAndWalletProvider(statusCallback);
    cachedAgentKit = agentkit;
    cachedSwapActionProvider = swapActionProviderInstance;

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
    const cantUseFaucetMessage = `If you need funds, you can provide your wallet details and request funds from the user.`;

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
        If the user asks for medium-risk investment opportunities, suggest options like staking on Compound or token swaps. 
        Include risk and return details for each. If the user selects one, execute the action.
        --- BEGIN TRANSACTION DATA ---
        ${transactionsContext}
        --- END TRANSACTION DATA ---
        If the user inquires about staking, swaps, or past activity, analyze the above context to provide relevant,
        data-backed answers. Be concise and helpful.If asked about portfolio analysis, provide a report on holdings, transaction history, and performance metrics.
        For questions on transaction patterns, trends, or recommendations, use conversation and transaction history to offer insights.
        `,
    });

    return { agent, agentkit, swapActionProviderInstance };
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}
