import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  type ModalActionRowComponentBuilder,
  type ButtonInteraction,
} from "discord.js";
import { fileURLToPath } from "url";
import path from "path";
import { moderationCommands, handleModCommand, handleSayModal } from "./moderation.js";
import { aiCommand, handleAICommand } from "./ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, "assets", "logo.png");
const BANNER_PATH = path.resolve(__dirname, "assets", "banner.png");

const token = process.env["DISCORD_BOT_TOKEN"];
const clientId = process.env["DISCORD_CLIENT_ID"];

const GUILD_ID = "1486857019674595584";
const WELCOME_CHANNEL_ID = "1487069359062126703";
const REVIEW_CHANNEL_ID = "1487050139787989046";
const APPROVED_CHANNEL_ID = "1487054234959741061";
const REVIEW_ROLE_ID = "1487169501161328810";

if (!token) throw new Error("DISCORD_BOT_TOKEN environment variable is required.");
if (!clientId) throw new Error("DISCORD_CLIENT_ID environment variable is required.");

interface ReportData {
  robloxName: string;
  discordName: string;
  server: string;
  reason: string;
  requesterId: string;
  messageId?: string;
}

const pendingReports = new Map<string, ReportData>();

const baseCommands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Responds with Hello!")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("wantedperson")
    .setDescription("Report a wanted person for review.")
    .toJSON(),
];

const allCommands = [...baseCommands, ...moderationCommands, aiCommand];

const rest = new REST({ version: "10" }).setToken(token);

async function registerCommands() {
  console.log("Registering guild (/) commands...");
  await rest.put(Routes.applicationGuildCommands(clientId!, GUILD_ID), { body: allCommands });
  console.log(`Commands registered successfully (${allCommands.length} total).`);
}

function buildReviewEmbed(report: ReportData, requesterTag: string) {
  return new EmbedBuilder()
    .setTitle("🚨 Wanted Person Report — Pending Review")
    .setColor(0xff6600)
    .setImage("attachment://banner.png")
    .setThumbnail("attachment://logo.png")
    .addFields(
      { name: "🎮 Roblox Name", value: report.robloxName, inline: true },
      { name: "💬 Discord Name", value: report.discordName, inline: true },
      { name: "\u200B", value: "\u200B", inline: false },
      { name: "🌐 Server", value: report.server, inline: true },
      { name: "📋 Reason", value: report.reason, inline: false },
    )
    .setFooter({ text: `Reported by ${requesterTag} • HuntingLC Management`, iconURL: "attachment://logo.png" })
    .setTimestamp();
}

function buildApprovedEmbed(report: ReportData, reward: string, reviewerTag: string) {
  return new EmbedBuilder()
    .setTitle("✅ Wanted Person — Approved")
    .setColor(0x00cc44)
    .setImage("attachment://banner.png")
    .setThumbnail("attachment://logo.png")
    .addFields(
      { name: "🎮 Roblox Name", value: report.robloxName, inline: true },
      { name: "💬 Discord Name", value: report.discordName, inline: true },
      { name: "\u200B", value: "\u200B", inline: false },
      { name: "🌐 Server", value: report.server, inline: true },
      { name: "📋 Reason", value: report.reason, inline: false },
      { name: "🏆 Reward", value: reward, inline: false },
    )
    .setFooter({ text: `Reviewed & approved by ${reviewerTag} • HuntingLC Management`, iconURL: "attachment://logo.png" })
    .setTimestamp();
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMembers],
});

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

client.once("clientReady", (c) => {
  console.log(`Bot ready! Logged in as ${c.user.tag}`);
});

client.on("guildMemberAdd", async (member) => {
  try {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const memberNumber = member.guild.memberCount;
    const displayName = member.user.username;

    await channel.send(
      `Welcome **${displayName}**! You are member **${ordinal(memberNumber)}**. Enjoy your stay! 🎉`,
    );
  } catch (err) {
    console.error("Failed to send welcome message:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
  // ── Slash commands ──────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    // Hand off moderation commands
    if (await handleModCommand(interaction, client)) return;

    if (interaction.commandName === "ping") {
      await interaction.reply("Hello!");
      return;
    }

    if (interaction.commandName === "artificialintelligence") {
      const question = interaction.options.getString("question", true);
      await interaction.deferReply();
      const embed = await handleAICommand(question, interaction.user.tag);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "wantedperson") {
      const modal = new ModalBuilder()
        .setCustomId("wantedperson_modal")
        .setTitle("Wanted Person Report");

      modal.addComponents(
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("roblox_name")
            .setLabel("Roblox name of the wanted person.")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("discord_name")
            .setLabel("Discord name of the wanted person.")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("server")
            .setLabel("Server on which the person usually plays.")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Reason.")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true),
        ),
      );

      await interaction.showModal(modal);
      return;
    }
  }

  // ── Wanted person form submitted ────────────────────────────────────────────
  if (interaction.isModalSubmit() && await handleSayModal(interaction)) return;

  if (interaction.isModalSubmit() && interaction.customId === "wantedperson_modal") {
    const robloxName = interaction.fields.getTextInputValue("roblox_name");
    const discordName = interaction.fields.getTextInputValue("discord_name");
    const server = interaction.fields.getTextInputValue("server");
    const reason = interaction.fields.getTextInputValue("reason");
    const requesterId = interaction.user.id;
    const requesterTag = interaction.user.tag;

    const reportId = `${Date.now()}_${requesterId}`;
    const report: ReportData = { robloxName, discordName, server, reason, requesterId };
    pendingReports.set(reportId, report);

    const logoFile = new AttachmentBuilder(LOGO_PATH, { name: "logo.png" });
    const bannerFile = new AttachmentBuilder(BANNER_PATH, { name: "banner.png" });

    const acceptBtn = new ButtonBuilder()
      .setCustomId(`accept_request:${reportId}`)
      .setLabel("✅ Accept Request")
      .setStyle(ButtonStyle.Success);

    const declineBtn = new ButtonBuilder()
      .setCustomId(`decline_request:${reportId}`)
      .setLabel("❌ Decline Request")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptBtn, declineBtn);

    try {
      const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID);
      if (reviewChannel && reviewChannel.isTextBased()) {
        const msg = await reviewChannel.send({
          content: `<@&${REVIEW_ROLE_ID}>`,
          embeds: [buildReviewEmbed(report, requesterTag)],
          files: [bannerFile, logoFile],
          components: [row],
        });

        report.messageId = msg.id;
        pendingReports.set(reportId, report);
      }
    } catch (err) {
      console.error("Could not send to review channel:", err);
    }

    await interaction.reply({ content: "Person logged. Pending Review", ephemeral: true });
    return;
  }

  // ── Accept Request button ───────────────────────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith("accept_request:")) {
    const reportId = interaction.customId.split(":")[1];
    if (!pendingReports.has(reportId!)) {
      await interaction.reply({ content: "This report no longer exists.", ephemeral: true });
      return;
    }

    const rewardModal = new ModalBuilder()
      .setCustomId(`reward_modal:${reportId}`)
      .setTitle("Accept Request — Set Reward");

    rewardModal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reward")
          .setLabel("Reward?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );

    await interaction.showModal(rewardModal);
    return;
  }

  // ── Reward modal submitted ──────────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId.startsWith("reward_modal:")) {
    const reportId = interaction.customId.split(":")[1];
    const report = pendingReports.get(reportId!);
    if (!report) {
      await interaction.reply({ content: "This report no longer exists.", ephemeral: true });
      return;
    }

    const reward = interaction.fields.getTextInputValue("reward");

    const logoFile = new AttachmentBuilder(LOGO_PATH, { name: "logo.png" });
    const bannerFile = new AttachmentBuilder(BANNER_PATH, { name: "banner.png" });

    try {
      const approvedChannel = await client.channels.fetch(APPROVED_CHANNEL_ID);
      if (approvedChannel && approvedChannel.isTextBased()) {
        await approvedChannel.send({
          embeds: [buildApprovedEmbed(report, reward, interaction.user.tag)],
          files: [bannerFile, logoFile],
        });
      }
    } catch (err) {
      console.error("Could not send to approved channel:", err);
    }

    await deleteReviewMessage(report);
    pendingReports.delete(reportId!);

    await interaction.reply({ content: "✅ Request accepted and published.", ephemeral: true });
    return;
  }

  // ── Decline Request button ──────────────────────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith("decline_request:")) {
    const reportId = interaction.customId.split(":")[1];
    const report = pendingReports.get(reportId!);
    if (!report) {
      await interaction.reply({ content: "This report no longer exists.", ephemeral: true });
      return;
    }

    // Acknowledge the interaction BEFORE deleting the message to avoid "Unknown Message"
    await (interaction as ButtonInteraction).deferUpdate();

    try {
      const requester = await client.users.fetch(report.requesterId);
      await requester.send(
        "Your request for HuntingLC has been denied, feel free to request anotherone!",
      );
    } catch (err) {
      console.error("Could not DM requester:", err);
    }

    await deleteReviewMessage(report);
    pendingReports.delete(reportId!);
    return;
  }

  } catch (err) {
    console.error("Unhandled interaction error:", err);
    try {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "An error occurred. Please try again.", ephemeral: true });
      }
    } catch {
      // Already replied or timed out — ignore
    }
  }
});

async function deleteReviewMessage(report: ReportData) {
  if (!report.messageId) return;
  try {
    const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID);
    if (reviewChannel && reviewChannel.isTextBased()) {
      const msg = await reviewChannel.messages.fetch(report.messageId);
      await msg.delete();
    }
  } catch (err) {
    console.error("Could not delete review message:", err);
  }
}

registerCommands()
  .then(() => client.login(token))
  .catch(console.error);
