import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid input: 'messages' must be an array" }, { status: 400 });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "meta-llama/llama-3.1-8b-instruct:free",
        "messages": [
          { "role": "system", "content": "You are a helpful assistant for a company called headstarter ai, which is an AI-powered interview service for SWE students. Only give 1-3 sentences in response to the user." },
          ...messages
        ],
      }),
      keepalive: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value);
          
          // Parse the buffer for the assistant's message content
          const match = buffer.match(/"content":"(.*?)"/);
          if (match && match[1]) {
            controller.enqueue(match[1]);
            buffer = ''; // Reset buffer after successful match
          }
        }

        controller.close();
      }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain' } });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

