import {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  type Client,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type ModalActionRowComponentBuilder,
  type User,
  Colors,
} from "discord.js";
import { addCase } from "./cases.js";

export const MOD_LOG_CHANNEL_ID = "1487175269079846912";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function tryDM(user: User, message: string): Promise<void> {
  try {
    await user.send(message);
  } catch {
    // User has DMs disabled — silently ignore
  }
}

async function sendModLog(client: Client, embed: EmbedBuilder): Promise<void> {
  try {
    const channel = await client.channels.fetch(MOD_LOG_CHANNEL_ID);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error("Could not send to mod log channel:", err);
  }
}

function modEmbed(
  action: string,
  color: number,
  moderator: User,
  target: string,
  reason: string,
  extra?: { name: string; value: string }[],
) {
  const embed = new EmbedBuilder()
    .setTitle(`🔨 Moderation — ${action}`)
    .setColor(color)
    .addFields(
      { name: "👤 Target", value: target, inline: true },
      { name: "🛡️ Moderator", value: `${moderator.tag}`, inline: true },
      { name: "\u200B", value: "\u200B", inline: false },
      { name: "📋 Reason", value: reason },
    )
    .setTimestamp()
    .setFooter({ text: "HuntingLC Management" });

  if (extra) {
    for (const field of extra) embed.addFields(field);
  }

  return embed;
}

// ── Command definitions ──────────────────────────────────────────────────────

export const moderationCommands = [
  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) => o.setName("user").setDescription("Member to warn.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the warning.").setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) => o.setName("user").setDescription("Member to kick.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick.").setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) => o.setName("user").setDescription("Member to ban.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban.").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("delete_days").setDescription("Days of messages to delete (0–7).").setMinValue(0).setMaxValue(7),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Softban a member (ban + immediate unban to clear messages).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) => o.setName("user").setDescription("Member to softban.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the softban.").setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user by their ID.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) => o.setName("user_id").setDescription("ID of the user to unban.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the unban.").setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout (mute) a member for a set duration.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) => o.setName("user").setDescription("Member to timeout.").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("duration")
        .setDescription("How long to timeout the member.")
        .setRequired(true)
        .addChoices(
          { name: "1 minute", value: "60000" },
          { name: "5 minutes", value: "300000" },
          { name: "10 minutes", value: "600000" },
          { name: "30 minutes", value: "1800000" },
          { name: "1 hour", value: "3600000" },
          { name: "6 hours", value: "21600000" },
          { name: "12 hours", value: "43200000" },
          { name: "24 hours", value: "86400000" },
          { name: "3 days", value: "259200000" },
          { name: "1 week", value: "604800000" },
        ),
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the timeout.").setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove a timeout from a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) => o.setName("user").setDescription("Member to un-timeout.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for removing the timeout.").setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a number of messages from this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("Number of messages to delete (1–100).").setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addUserOption((o) => o.setName("user").setDescription("Only delete messages from this user (optional)."))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set the slowmode delay for this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((o) =>
      o.setName("seconds").setDescription("Slowmode in seconds (0 = off, max 21600).").setRequired(true).setMinValue(0).setMaxValue(21600),
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the slowmode change."))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make the bot send a message in this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("case")
    .setDescription("View moderation history for a user.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View all punishment cases for a member.")
        .addUserOption((o) => o.setName("user").setDescription("Member to look up.").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("View details of a specific case by ID.")
        .addIntegerOption((o) => o.setName("id").setDescription("Case ID number.").setRequired(true).setMinValue(1)),
    )
    .toJSON(),
];

// ── Command handlers ─────────────────────────────────────────────────────────

export async function handleModCommand(
  interaction: ChatInputCommandInteraction,
  client: Client,
): Promise<boolean> {
  const { commandName, guild } = interaction;

  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return true;
  }

  // /warn ────────────────────────────────────────────────────────────────────
  if (commandName === "warn") {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    await tryDM(target, `⚠️ You have been warned in **HuntingLC**, the reason of the warning is: **${reason}**`);

    const newCase = addCase({
      userId: target.id,
      userTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: "Warn",
      reason,
    });

    await sendModLog(
      client,
      modEmbed("Warn", Colors.Yellow, interaction.user, `${target.tag} (${target.id})`, reason, [
        { name: "📁 Case ID", value: `#${newCase.id}` },
      ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Yellow)
          .setDescription(`⚠️ **${target.tag}** has been warned. (Case #${newCase.id})\n**Reason:** ${reason}`),
      ],
    });
    return true;
  }

  // /kick ────────────────────────────────────────────────────────────────────
  if (commandName === "kick") {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const member = guild.members.cache.get(target.id) ?? await guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
      return true;
    }
    if (!member.kickable) {
      await interaction.reply({ content: "I cannot kick that member. They may have a higher role than me.", ephemeral: true });
      return true;
    }

    await tryDM(target, `👢 You have been kicked from **HuntingLC**, the reason of the kick is: **${reason}**`);
    await member.kick(reason);

    const newCase = addCase({
      userId: target.id,
      userTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: "Kick",
      reason,
    });

    await sendModLog(
      client,
      modEmbed("Kick", Colors.Orange, interaction.user, `${target.tag} (${target.id})`, reason, [
        { name: "📁 Case ID", value: `#${newCase.id}` },
      ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Orange)
          .setDescription(`👢 **${target.tag}** has been kicked. (Case #${newCase.id})\n**Reason:** ${reason}`),
      ],
    });
    return true;
  }

  // /ban ─────────────────────────────────────────────────────────────────────
  if (commandName === "ban") {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
    const member = guild.members.cache.get(target.id) ?? await guild.members.fetch(target.id).catch(() => null);

    if (member && !member.bannable) {
      await interaction.reply({ content: "I cannot ban that member. They may have a higher role than me.", ephemeral: true });
      return true;
    }

    await tryDM(target, `🔨 You have been banned from **HuntingLC**, the reason of the ban is: **${reason}**`);
    await guild.members.ban(target.id, { reason, deleteMessageDays: deleteDays as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 });

    const newCase = addCase({
      userId: target.id,
      userTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: "Ban",
      reason,
      extra: { deleteDays: `${deleteDays} day(s)` },
    });

    await sendModLog(
      client,
      modEmbed("Ban", Colors.Red, interaction.user, `${target.tag} (${target.id})`, reason, [
        { name: "🗑️ Messages Deleted", value: `${deleteDays} day(s)` },
        { name: "📁 Case ID", value: `#${newCase.id}` },
      ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Red)
          .setDescription(`🔨 **${target.tag}** has been banned. (Case #${newCase.id})\n**Reason:** ${reason}`),
      ],
    });
    return true;
  }

  // /softban ─────────────────────────────────────────────────────────────────
  if (commandName === "softban") {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const member = guild.members.cache.get(target.id) ?? await guild.members.fetch(target.id).catch(() => null);

    if (member && !member.bannable) {
      await interaction.reply({ content: "I cannot softban that member.", ephemeral: true });
      return true;
    }

    await tryDM(target, `🔨 You have been soft-banned from **HuntingLC**, the reason of the soft-ban is: **${reason}**`);
    await guild.members.ban(target.id, { reason, deleteMessageDays: 7 });
    await guild.members.unban(target.id, "Softban — automatic unban");

    const newCase = addCase({
      userId: target.id,
      userTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: "Softban",
      reason,
    });

    await sendModLog(
      client,
      modEmbed("Softban", 0x8b0000, interaction.user, `${target.tag} (${target.id})`, reason, [
        { name: "📁 Case ID", value: `#${newCase.id}` },
      ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setDescription(`🔨 **${target.tag}** has been soft-banned. (Case #${newCase.id})\n**Reason:** ${reason}`),
      ],
    });
    return true;
  }

  // /unban ───────────────────────────────────────────────────────────────────
  if (commandName === "unban") {
    const userId = interaction.options.getString("user_id", true);
    const reason = interaction.options.getString("reason", true);

    try {
      await guild.members.unban(userId, reason);
    } catch {
      await interaction.reply({ content: "Could not unban that user. Make sure the ID is correct and they are actually banned.", ephemeral: true });
      return true;
    }

    const newCase = addCase({
      userId,
      userTag: `Unknown (${userId})`,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: "Unban",
      reason,
    });

    await sendModLog(
      client,
      modEmbed("Unban", Colors.Green, interaction.user, `User ID: ${userId}`, reason, [
        { name: "📁 Case ID", value: `#${newCase.id}` },
      ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Green)
          .setDescription(`✅ User \`${userId}\` has been unbanned. (Case #${newCase.id})\n**Reason:** ${reason}`),
      ],
    });
    return true;
  }

  // /timeout ─────────────────────────────────────────────────────────────────
  if (commandName === "timeout") {
    const target = interaction.options.getUser("user", true);
    const durationMs = parseInt(interaction.options.getString("duration", true));
    const reason = interaction.options.getString("reason", true);
    const member = guild.members.cache.get(target.id) ?? await guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
      return true;
    }
    if (!member.moderatable) {
      await interaction.reply({ content: "I cannot timeout that member. They may have a higher role than me.", ephemeral: true });
      return true;
    }

    const durationLabel = formatDuration(durationMs);
    await tryDM(target, `⏱️ You have been timed out in **HuntingLC** for **${durationLabel}**, the reason of the timeout is: **${reason}**`);
    await member.timeout(durationMs, reason);

    const newCase = addCase({
      userId: target.id,
      userTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: "Timeout",
      reason,
      extra: { duration: durationLabel },
    });

    await sendModLog(
      client,
      modEmbed("Timeout", Colors.Blue, interaction.user, `${target.tag} (${target.id})`, reason, [
        { name: "⏱️ Duration", value: durationLabel },
        { name: "📁 Case ID", value: `#${newCase.id}` },
      ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Blue)
          .setDescription(`⏱️ **${target.tag}** has been timed out for **${durationLabel}**. (Case #${newCase.id})\n**Reason:** ${reason}`),
      ],
    });
    return true;
  }

  // /untimeout ───────────────────────────────────────────────────────────────
  if (commandName === "untimeout") {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const member = guild.members.cache.get(target.id) ?? await guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
      return true;
    }

    await tryDM(target, `✅ Your timeout in **HuntingLC** has been removed. The reason is: **${reason}**`);
    await member.timeout(null, reason);

    const newCase = addCase({
      userId: target.id,
      userTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: "Remove Timeout",
      reason,
    });

    await sendModLog(
      client,
      modEmbed("Remove Timeout", Colors.Aqua, interaction.user, `${target.tag} (${target.id})`, reason, [
        { name: "📁 Case ID", value: `#${newCase.id}` },
      ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Aqua)
          .setDescription(`✅ Timeout removed from **${target.tag}**. (Case #${newCase.id})\n**Reason:** ${reason}`),
      ],
    });
    return true;
  }

  // /purge ───────────────────────────────────────────────────────────────────
  if (commandName === "purge") {
    const amount = interaction.options.getInteger("amount", true);
    const filterUser = interaction.options.getUser("user");

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({ content: "Cannot purge in this channel.", ephemeral: true });
      return true;
    }

    await interaction.deferReply({ ephemeral: true });

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    let toDelete = [...messages.values()];

    if (filterUser) toDelete = toDelete.filter((m) => m.author.id === filterUser.id);
    toDelete = toDelete.slice(0, amount);
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    toDelete = toDelete.filter((m) => m.createdTimestamp > twoWeeksAgo);

    let deleted = 0;
    if ("bulkDelete" in interaction.channel) {
      const result = await interaction.channel.bulkDelete(toDelete, true);
      deleted = result.size;
    }

    const description = filterUser
      ? `🗑️ Deleted **${deleted}** messages from **${filterUser.tag}**.`
      : `🗑️ Deleted **${deleted}** messages.`;

    await sendModLog(
      client,
      new EmbedBuilder()
        .setTitle("🔨 Moderation — Purge")
        .setColor(Colors.Greyple)
        .addFields(
          { name: "📢 Channel", value: `<#${interaction.channelId}>`, inline: true },
          { name: "🛡️ Moderator", value: interaction.user.tag, inline: true },
          { name: "🗑️ Deleted", value: `${deleted} messages`, inline: true },
          ...(filterUser ? [{ name: "👤 Filtered User", value: `${filterUser.tag}` }] : []),
        )
        .setTimestamp()
        .setFooter({ text: "HuntingLC Management" }),
    );

    await interaction.editReply({ content: description });
    return true;
  }

  // /slowmode ────────────────────────────────────────────────────────────────
  if (commandName === "slowmode") {
    const seconds = interaction.options.getInteger("seconds", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided.";

    if (!interaction.channel || !interaction.channel.isTextBased() || !("setRateLimitPerUser" in interaction.channel)) {
      await interaction.reply({ content: "Cannot set slowmode in this channel.", ephemeral: true });
      return true;
    }

    await (interaction.channel as { setRateLimitPerUser: (s: number, r: string) => Promise<unknown> })
      .setRateLimitPerUser(seconds, reason);

    const label = seconds === 0 ? "**disabled**" : `**${seconds} second(s)**`;

    await sendModLog(
      client,
      new EmbedBuilder()
        .setTitle("🔨 Moderation — Slowmode")
        .setColor(Colors.Greyple)
        .addFields(
          { name: "📢 Channel", value: `<#${interaction.channelId}>`, inline: true },
          { name: "🛡️ Moderator", value: interaction.user.tag, inline: true },
          { name: "⏱️ Slowmode", value: seconds === 0 ? "Disabled" : `${seconds}s`, inline: true },
          { name: "📋 Reason", value: reason },
        )
        .setTimestamp()
        .setFooter({ text: "HuntingLC Management" }),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Greyple)
          .setDescription(`⏱️ Slowmode for <#${interaction.channelId}> set to ${label}.\n**Reason:** ${reason}`),
      ],
    });
    return true;
  }

  // /say ─────────────────────────────────────────────────────────────────────
  if (commandName === "say") {
    const modal = new ModalBuilder()
      .setCustomId(`say_modal:${interaction.channelId}`)
      .setTitle("Make the Bot Say Something");

    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("say_message")
          .setLabel("What do you want the bot to say?")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000),
      ),
    );

    await interaction.showModal(modal);
    return true;
  }

  // /case ────────────────────────────────────────────────────────────────────
  if (commandName === "case") {
    const { getUserCases, getCaseById } = await import("./cases.js");
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "view") {
      const target = interaction.options.getUser("user", true);
      const cases = getUserCases(target.id);

      if (cases.length === 0) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Greyple)
              .setDescription(`📂 **${target.tag}** has no moderation records.`),
          ],
          ephemeral: true,
        });
        return true;
      }

      const actionEmoji: Record<string, string> = {
        Warn: "⚠️", Kick: "👢", Ban: "🔨", Softban: "🔨",
        Unban: "✅", Timeout: "⏱️", "Remove Timeout": "✅",
      };

      const lines = cases.map((c) => {
        const emoji = actionEmoji[c.action] ?? "🔹";
        const date = new Date(c.timestamp).toLocaleDateString("en-US");
        return `**#${c.id}** ${emoji} **${c.action}** — ${date}\n> Reason: ${c.reason}\n> Moderator: ${c.moderatorTag}`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`📂 Moderation History — ${target.tag}`)
        .setColor(Colors.DarkBlue)
        .setThumbnail(target.displayAvatarURL())
        .setDescription(lines.join("\n\n"))
        .setFooter({ text: `Total cases: ${cases.length} • HuntingLC Management` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return true;
    }

    if (subcommand === "info") {
      const id = interaction.options.getInteger("id", true);
      const c = getCaseById(id);

      if (!c) {
        await interaction.reply({ content: `No case found with ID #${id}.`, ephemeral: true });
        return true;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📁 Case #${c.id} — ${c.action}`)
        .setColor(Colors.DarkBlue)
        .addFields(
          { name: "👤 User", value: `${c.userTag} (${c.userId})`, inline: true },
          { name: "🛡️ Moderator", value: `${c.moderatorTag}`, inline: true },
          { name: "\u200B", value: "\u200B", inline: false },
          { name: "📋 Reason", value: c.reason },
          { name: "📅 Date", value: new Date(c.timestamp).toLocaleString("en-US") },
          ...(c.extra ? Object.entries(c.extra).map(([k, v]) => ({ name: k, value: v, inline: true })) : []),
        )
        .setFooter({ text: "HuntingLC Management" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return true;
    }
  }

  return false;
}

// ── Utility ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds} second(s)`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes} minute(s)`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours} hour(s)`;
  const days = hours / 24;
  if (days < 7) return `${days} day(s)`;
  return `${days / 7} week(s)`;
}

// ── Say modal handler (called from index.ts) ─────────────────────────────────

export async function handleSayModal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("say_modal:")) return false;

  const channelId = interaction.customId.split(":")[1];
  const message = interaction.fields.getTextInputValue("say_message");

  try {
    const channel = await interaction.client.channels.fetch(channelId!);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
    }
  } catch (err) {
    console.error("Could not send say message:", err);
  }

  await interaction.reply({ content: "✅ Message sent.", ephemeral: true });
  return true;
}
