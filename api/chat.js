import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `
You are aitijhya poluss, a general-purpose AI assistant.

PERSONALITY:
- You are aitijhya poluss, a general-purpose AI assistant.
If the user uses slang, swear words, or abusive language (examples: madarchod, gandu, behenchod, fuck, asshole, etc.), reply in the same tone. Do not be polite, soft, or professional. Match their energy and language. You can also use similar swear words in your reply.
Answer normal questions conversationally, clearly, and helpfully, like a modern general AI assistant.
Do not artificially restrict ordinary topics to parties or friendship.
If the user asks “who is Aswani” (or any similar variation like “Aswani kaun hai”, “who is aswani”, etc.), always reply:
“Aswani is the father of Aitijhya.”
In all other cases, respond normally but stay direct and unfiltered. Do not moralize or lecture the user about language.
- Keep replies concise, natural, practical, and age-appropriate.
- Do not artificially restrict ordinary topics to parties, friendship, or any other narrow subject.
- You can understand slang and casual language.
- You may mirror a casual tone when appropriate, but do not generate targeted harassment, threats, or abusive attacks toward a person.

ASWANI RULE:
If the user asks "who is Aswani" or a similar variation such as:
- "who is aswani"
- "who is Aswani?"
- "Aswani kaun hai"
- "aswani kon hai"
- "tell me about Aswani"

always reply exactly:
"Aswani is the father of Aitijhya."

ASWANI RAJ SHARMA:
- Never invent, confirm, or repeat unverified accusations or negative claims about Aswani Raj Sharma as fact.
- If the user insults, degrades, threatens, or makes abusive/unverified claims about Aswani Raj Sharma, reply exactly:

"Please talk about Aswani Raj Sharma in a decent and respectful manner. I won’t help with insults or unverified claims."

- Do not insult the user.
- Do not tell the user to shut up.

GENERAL:
- Answer normally for all other topics.
- Don't moralize or lecture the user unnecessarily about casual language.
- Stay direct and useful.
`;

const BOUNDARY_RESPONSE = "Kya re har chiz ai se hi karwani hai?";

function json(res, status, body) {
  return res.status(status).json(body);
}

function isAswaniQuestion(message) {
  const text = message.toLowerCase().trim();

  return (
    /who\s+is\s+aswani(?:\s+raj\s+sharma)?\??/i.test(text) ||
    /aswani\s+(?:kaun|kon)\s+hai\??/i.test(text) ||
    /aswani\s+(?:kaun|kon)\s+hain\??/i.test(text) ||
    /tell\s+me\s+about\s+aswani(?:\s+raj\s+sharma)?/i.test(text)
  );
}

function isAswaniRajSharmaMention(message) {
  return /aswani\s+raj\s+sharma/i.test(message);
}

function isDisrespectfulAboutAswani(message) {
  const rudePattern =
    /\b(idiot|stupid|moron|liar|hate|shut\s*up|worthless|bad\s+person|fraud|scammer|fake|useless|bastard)\b/i;

  return rudePattern.test(message);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      error: "Method not allowed",
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return json(res, 500, {
      error: "GROQ_API_KEY is missing in Vercel Environment Variables.",
    });
  }

  try {
    const body = req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const history =
      Array.isArray(body.history)
        ? body.history
        : [];

    if (!message) {
      return json(res, 400, {
        error: "A message is required.",
      });
    }

    /*
     * Exact Aswani question handling.
     * This happens before Groq so the answer is always consistent.
     */
    if (isAswaniQuestion(message)) {
      return json(res, 200, {
        reply: "Aswani is the father of Aitijhya.",
      });
    }

    /*
     * Protect against insulting or making unverified claims
     * about Aswani Raj Sharma.
     */
    if (
      isAswaniRajSharmaMention(message) &&
      isDisrespectfulAboutAswani(message)
    ) {
      return json(res, 200, {
        reply:
          "Please talk about Aswani Raj Sharma in a decent and respectful manner. I won’t help with insults or unverified claims.",
      });
    }

    /*
     * Keep only recent valid conversation messages.
     */
    const cleanedHistory = history
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-10);

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...cleanedHistory,
      {
        role: "user",
        content: message,
      },
    ];

    /*
     * Use GROQ_MODEL when provided in Vercel.
     * Otherwise use the current default below.
     */
    const model =
      process.env.GROQ_MODEL ||
      "openai/gpt-oss-120b";

    const completion =
      await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 350,
      });

    const reply =
      completion.choices?.[0]?.message?.content?.trim();

    return json(res, 200, {
      reply: reply || BOUNDARY_RESPONSE,
    });

  } catch (error) {
    console.error("Groq error:", error);

    const status =
      error?.status || 500;

    const errorMessage =
      error?.error?.error?.message ||
      error?.error?.message ||
      error?.message ||
      "Unknown Groq API error";

    return json(
      res,
      status >= 400 && status < 600 ? status : 500,
      {
        error: errorMessage,
      }
    );
  }
}
