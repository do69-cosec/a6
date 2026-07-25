"use server";

import { requirePermission } from "@/lib/access";

// Tailored instructions for structured JSON response output
function getSystemInstruction(type: "invoice" | "proposal" | "agreement"): string {
  if (type === "invoice") {
    return `You are a professional accounting AI. Based on the client details and parameters provided by the user, draft a modern professional invoice.
You MUST respond with a raw JSON object matching this schema exactly. Do not wrap in markdown or prefix with backticks. Output only the JSON string:
{
  "lineDescription": "Professional Creative Retainer / Custom services name describing the work",
  "subtotal": 75000,
  "gstRate": 18,
  "dueDate": "2026-06-15" (estimate a due date in YYYY-MM-DD format based on the current date of May 24, 2026)
}`;
  }
  if (type === "proposal") {
    return `You are a professional agency business development AI. Based on the client details and requirements, draft a professional business proposal.
You MUST respond with a raw JSON object matching this schema exactly. Do not wrap in markdown or prefix with backticks. Output only the JSON string:
{
  "title": "Proposal for website redesign / social media marketing etc.",
  "subtotal": 125000,
  "discount": 10000,
  "templateKey": "website" (MUST be one of: 'website', 'social', 'performance', 'retainer', 'branding'),
  "scopeDescription": "Describe the main deliverables, scope of work, timeline, and value proposition in 2-3 clear paragraphs."
}`;
  }
  
  // Agreement / Contract Clauses
  return `You are an expert corporate legal counsel. Based on the client details, draft a comprehensive agency service contract agreement.
Use modern, elegant formatting with markdown. Include sections for:
1. Scope of Services & Deliverables
2. Payment Terms & Milestones
3. Term and Termination Policy (e.g. 30 days notice)
4. Confidentiality & IP Ownership
5. Service Level Agreement (SLA) (e.g. turnaround time, revisions)

You MUST respond with a raw JSON object matching this schema exactly. Do not wrap in markdown or prefix with backticks. Output only the JSON string:
{
  "title": "Master Services Agreement: [Client Company Name] & Blink Beyond",
  "content": "Full markdown agreement text goes here..."
}`;
}

// Fallback Mock generator for local testing
function getMockAIData(type: "invoice" | "proposal" | "agreement", prompt: string): any {
  const p = prompt.toLowerCase();
  
  // Parse an amount
  let amount = 75000;
  const amountMatch = prompt.match(/(?:rs\.?|inr|₹|amount|price|of|at)\s*([\d,]+)/i);
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  }

  // Parse client name
  let clientName = "Acme Retail";
  const clientMatch = prompt.match(/(?:for|client|company|name)\s+([A-Z][a-zA-Z0-9\s]+)/);
  if (clientMatch && clientMatch[1]) {
    clientName = clientMatch[1].trim();
  }

  if (type === "invoice") {
    return {
      lineDescription: p.includes("website") ? "Custom Website Development Service" : p.includes("seo") ? "Monthly SEO & Optimization Retainer" : "Creative & Branding Retainer Services",
      subtotal: amount,
      gstRate: 18,
      dueDate: new Date(Date.now() + 15 * 24 * 3600000).toISOString().slice(0, 10), // 15 days from now
    };
  }

  if (type === "proposal") {
    const templateKey = p.includes("website") ? "website" : p.includes("social") ? "social" : p.includes("performance") ? "performance" : p.includes("brand") ? "branding" : "retainer";
    return {
      title: p.includes("website") ? `Website Development Proposal for ${clientName}` : p.includes("seo") ? `SEO Retainer Proposal for ${clientName}` : `Agency Retainer Proposal for ${clientName}`,
      subtotal: amount,
      discount: amount > 50000 ? amount * 0.1 : 0, // 10% discount if > 50k
      templateKey,
      scopeDescription: `We will provide premium digital services tailored for ${clientName}. This includes target audience analysis, project planning, high-fidelity UI designs, front-end development, testing, and continuous maintenance.

Our deliverables will align with the specifications mentioned, ensuring a high-converting channel setup, responsive performance, and modern sleek layout assets.`
    };
  }

  // Agreement
  return {
    title: `Master Services Agreement: ${clientName} & Blink Beyond`,
    content: `# Master Services Agreement

This Agreement is made on May 24, 2026, by and between **Blink Beyond Agency Pvt Ltd** ("Agency") and **${clientName}** ("Client").

## 1. Scope of Services
Agency will provide services including:
* Custom creative assets and campaign materials
* Project milestones and scheduled publishing
* Monthly analytics reporting

## 2. Financial Terms
* **Service Fee:** ₹${amount.toLocaleString("en-IN")} (exclusive of 18% GST).
* **Payment Terms:** Net-15 days from the date of invoice.

## 3. SLA & Revisions
* Standard turnaround for review is 3 business days.
* Up to 3 rounds of minor revisions per asset.

## 4. Confidentiality & Term
* Both parties agree to protect intellectual property.
* 30-day written notice required for termination.`
  };
}

export async function generateAITemplate(
  prompt: string,
  templateType: "invoice" | "proposal" | "agreement",
  apiKey: string,
  provider: "gemini" | "groq" | "openrouter" | "local"
): Promise<{ ok: boolean; error?: string; data?: any }> {
  try {
    // Authenticate permission - requires finance create permissions
    await requirePermission("finance", "create");

    if (!prompt.trim()) {
      return { ok: false, error: "Please enter a description for the template generation." };
    }

    if (provider === "local") {
      // Local Mock Simulator
      return { ok: true, data: getMockAIData(templateType, prompt) };
    }

    // Attempt to load API Key from env if not passed explicitly
    let keyToUse = apiKey;
    if (!keyToUse) {
      if (provider === "gemini") keyToUse = process.env.GEMINI_API_KEY || "";
      else if (provider === "groq") keyToUse = process.env.GROQ_API_KEY || "";
      else if (provider === "openrouter") keyToUse = process.env.OPENROUTER_API_KEY || "";
    }

    if (!keyToUse) {
      return { 
        ok: false, 
        error: `API Key is required for provider "${provider}". Please enter it in the dialog or define it in your .env configuration.` 
      };
    }

    let resultJson: any;

    if (provider === "gemini") {
      // Call Gemini API (gemini-2.5-flash)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`;
      const systemInstruction = getSystemInstruction(templateType);
      
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemInstruction}\n\nClient Description and Parameters:\n"${prompt}"` }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, error: `Gemini API Error: ${response.status} - ${errorText}` };
      }

      const resJson = await response.json();
      const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        return { ok: false, error: "Received empty content response from Gemini API." };
      }

      resultJson = JSON.parse(textResponse.trim());
    } else if (provider === "groq") {
      // Call Groq API (llama-3.3-70b-versatile)
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const systemInstruction = getSystemInstruction(templateType);
      
      const requestBody = {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Client Description and Parameters:\n"${prompt}"` }
        ],
        response_format: { type: "json_object" }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keyToUse}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, error: `Groq API Error: ${response.status} - ${errorText}` };
      }

      const resJson = await response.json();
      const textResponse = resJson.choices?.[0]?.message?.content;
      if (!textResponse) {
        return { ok: false, error: "Received empty content response from Groq API." };
      }

      resultJson = JSON.parse(textResponse.trim());
    } else if (provider === "openrouter") {
      // Call OpenRouter API (google/gemini-2.5-flash or default LLM)
      const url = "https://openrouter.ai/api/v1/chat/completions";
      const systemInstruction = getSystemInstruction(templateType);
      
      const requestBody = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Client Description and Parameters:\n"${prompt}"` }
        ],
        response_format: { type: "json_object" }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keyToUse}`,
          "HTTP-Referer": "https://blinkbeyond.com",
          "X-Title": "Blink Beyond Agency OS"
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, error: `OpenRouter API Error: ${response.status} - ${errorText}` };
      }

      const resJson = await response.json();
      const textResponse = resJson.choices?.[0]?.message?.content;
      if (!textResponse) {
        return { ok: false, error: "Received empty content response from OpenRouter API." };
      }

      resultJson = JSON.parse(textResponse.trim());
    }

    return { ok: true, data: resultJson };

  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "An unexpected error occurred during AI generation." };
  }
}

export async function generateAIClause(
  prompt: string,
  currentContractText: string,
  apiKey: string,
  provider: "gemini" | "groq" | "openrouter" | "local"
): Promise<{ ok: boolean; error?: string; clause?: string }> {
  try {
    await requirePermission("finance", "edit");

    if (!prompt.trim()) {
      return { ok: false, error: "Please enter a description for the clause." };
    }

    if (provider === "local") {
      return {
        ok: true,
        clause: `\n\n## Custom Clause (Simulated AI)\n* **Parameters:** ${prompt}\n* **Compliance:** This clause is drafted based on standard agency operating rules. Revisions and obligations under this section are governed by the general SLA conditions of the Master Agreement.`
      };
    }

    let keyToUse = apiKey;
    if (!keyToUse) {
      if (provider === "gemini") keyToUse = process.env.GEMINI_API_KEY || "";
      else if (provider === "groq") keyToUse = process.env.GROQ_API_KEY || "";
      else if (provider === "openrouter") keyToUse = process.env.OPENROUTER_API_KEY || "";
    }

    if (!keyToUse) {
      return { ok: false, error: "API Key is required to call the AI service." };
    }

    const systemInstruction = `You are an expert corporate legal counsel. Write a contract clause based on the user's prompt.
Integrate it nicely to match the styling of a standard Master Services Agreement.
Output ONLY the markdown clause text. Do not write any conversational intro or outro.`;

    let generatedClause = "";

    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `${systemInstruction}\n\nExisting Contract Context (brief): ${currentContractText.substring(0, 500)}...\n\nDraft a clause for: "${prompt}"` }]
          }]
        }),
      });

      if (!response.ok) return { ok: false, error: `Gemini API Error: ${response.status}` };
      const resJson = await response.json();
      generatedClause = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // Groq & OpenRouter general implementation
      const url = provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
      const model = provider === "groq" ? "llama-3.3-70b-versatile" : "google/gemini-2.5-flash";
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keyToUse}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Draft a clause for: "${prompt}"` }
          ]
        }),
      });

      if (!response.ok) return { ok: false, error: `${provider} API Error: ${response.status}` };
      const resJson = await response.json();
      generatedClause = resJson.choices?.[0]?.message?.content || "";
    }

    return { ok: true, clause: `\n\n${generatedClause.trim()}` };

  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to generate agreement clause." };
  }
}
