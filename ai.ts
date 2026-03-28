import { SlashCommandBuilder, EmbedBuilder, Colors } from "discord.js";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

export const aiCommand = new SlashCommandBuilder()
  .setName("artificialintelligence")
  .setDescription("Ask HuntingLC's AI anything — it will answer with questionable wisdom.")
  .addStringOption((o) =>
    o
      .setName("question")
      .setDescription("What do you want to ask the almighty AI?")
      .setRequired(true),
  )
  .toJSON();

export async function handleAICommand(
  question: string,
  username: string,
): Promise<EmbedBuilder> {
  let answer = "I tried to think... and nothing happened. Classic AI.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "You are HuntingLC's sarcastic and slightly dramatic AI assistant. " +
            "You answer every question with humor, wit, and light sarcasm — like a funny friend who happens to know everything. " +
            "Keep answers short (2-4 sentences max), punchy, and entertaining. " +
            "Always reply in English. Never be rude or offensive, just playfully sarcastic.",
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    answer = response.choices[0]?.message?.content ?? answer;
  } catch (err) {
    console.error("AI command error:", err);
    answer = "My neural networks had a coffee break. Please try again — unlike me, I don't have feelings to hurt. 🤖";
  }

  return new EmbedBuilder()
    .setTitle("🤖 HuntingLC AI")
    .setColor(Colors.Purple)
    .addFields(
      { name: "❓ Question", value: question },
      { name: "💡 Answer", value: answer },
    )
    .setFooter({ text: `Asked by ${username} • HuntingLC Management` })
    .setTimestamp();
}
