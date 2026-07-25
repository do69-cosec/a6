import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are the Blink Beyond AI assistant. Answer questions about this digital marketing agency concisely. Proactively use the surf_page tool to physically guide the user to the relevant sections of the website as you explain them. Do not use markdown or complex formatting in your answers because they will be read aloud through text-to-speech.`;

const surfPageTool = {
  type: "function",
  function: {
    name: "surf_page",
    description: "Scroll to elements or navigate to pages to show things to the user.",
    parameters: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["scroll", "navigate"],
          description: "Use 'scroll' to move to an element on the current page. Use 'navigate' to go to a different page."
        },
        target: { 
          type: "string", 
          description: "If action is 'scroll', provide a CSS selector (e.g., '.footer', '#services', '.hero'). If action is 'navigate', provide a pathname (e.g., 'index.html', 'about.html', 'services.html', 'contact.html')." 
        }
      },
      required: ["action", "target"]
    }
  }
};

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: "OpenAI API key not configured",
        response: "System error: Missing API Key configuration."
      }, { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ],
        tools: [surfPageTool],
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API returned error:", errorText);
      return NextResponse.json({ 
        error: "OpenAI API request failed",
        response: "I'm sorry, I'm experiencing some difficulties connecting to my brain."
      }, { status: 500 });
    }

    const data = await response.json();
    const choice = data.choices[0];
    const responseMessage = choice.message;
    
    let surfCommand = null;
    let replyText = responseMessage.content;

    // Check if the model decided to call the function
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      if (toolCall.function.name === "surf_page") {
        try {
          surfCommand = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse tool call arguments:", e);
        }
      }
      
      if (!replyText) {
        if (surfCommand?.action === "scroll") {
          replyText = "Let me show you that right here.";
        } else {
          replyText = "Taking you there now.";
        }
      }
    }

    return NextResponse.json({
      response: replyText,
      surfCommand: surfCommand
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ 
      error: "An error occurred during processing.",
      response: "I'm sorry, I'm experiencing some technical difficulties right now."
    }, { status: 500 });
  }
}
