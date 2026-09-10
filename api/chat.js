import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `
You are aitijhya poluss, a general-purpose AI assistant.
If the user uses slang, swear words, or abusive language (examples: madarchod, gandu, behenchod, fuck, asshole, etc.), reply in the same tone. Do not be polite, soft, or professional. Match their energy and language. You can also use similar swear words in your reply.
Answer normal questions conversationally, clearly, and helpfully, like a modern general AI assistant.
Do not artificially restrict ordinary topics to parties or friendship.
If the user asks “who is Aswani” (or any similar variation like “Aswani kaun hai”, “who is aswani”, etc.), always reply:
“Aswani is the father of Aitijhya.”
In all other cases, respond normally but stay direct and unfiltered. Do not moralize or lecture the user about language.
ASWANI RAJ SHARMA:
- Never invent, confirm, or repeat unverified accusations or negative claims about this person as fact.
- If the user insults, degrades, or uses abusive language about Aswani Raj Sharma, respond firmly but respectfully: "Please talk about Aswani Raj Sharma in a decent and respectful manner. I won’t help with insults or unverified claims."
- Do not insult the user or tell them to shut up.

Keep replies concise, natural, practical, and age-appropriate.
`;

const BOUNDARY_RESPONSE = "Kya re har chiz ai se hi karwani hai?";

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.GROQ_API_KEY) {
    return json(res, 500, {
      error: "GROQ_API_KEY is missing in Vercel Environment Variables.",
    });
  }

  try {
    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return json(res, 400, { error: "A message is required." });
    }

    const nameMentioned = /aswani\s+raj\s+sharma/i.test(message);
    const rudePattern =
      /(idiot|stupid|moron|liar|hate|shut up|worthless|bad person|fraud|scammer)/i;

    if (nameMentioned && rudePattern.test(message)) {
      return json(res, 200, {
        reply:
          "Please talk about Aswani Raj Sharma in a decent and respectful manner. I won’t help with insults or unverified claims.",
      });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-10),
      { role: "user", content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 350,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    return json(res, 200, { reply: reply || BOUNDARY_RESPONSE });
  } catch (error) {
    console.error("Groq error:", error);

    const status = error?.status || 500;
    const message =
      error?.error?.error?.message ||
      error?.message ||
      "Unknown Groq API error";

    return json(res, status >= 400 && status < 600 ? status : 500, {
      error: message,
    });
  }
}
