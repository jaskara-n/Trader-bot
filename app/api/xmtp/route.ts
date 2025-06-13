import { Client } from "@xmtp/xmtp-js";
import { NextResponse } from "next/server";
import { Wallet } from "ethers";

export async function GET() {
  try {
    // Create a wallet from private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY environment variable is not set");
    }

    const wallet = new Wallet(privateKey);

    // Initialize XMTP client with the wallet
    await Client.create(wallet);
    
    return NextResponse.json({ 
      success: true, 
      message: "XMTP client initialized successfully" 
    });
  } catch (error) {
    console.error("Error initializing XMTP client:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to initialize XMTP client" 
    }, { status: 500 });
  }
} 