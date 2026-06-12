const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openTickets = new Map();

client.once('ready', () => {
  console.log(`✅ Bot đã online: ${client.user.tag}`);
  client.user.setActivity('🎫 Hỗ trợ ticket', { type: 3 });
});

client.on('interactionCreate', async (interaction) => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'setup-ticket') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Bạn không có quyền!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎫 Hệ Thống Hỗ Trợ')
        .setDescription(
          '> Chọn loại hỗ trợ bên dưới để tạo ticket.\n\n' +
          '📌 **Lưu ý:**\n' +
          '• Mỗi người chỉ mở được **1 ticket** cùng lúc\n' +
          '• Mô tả vấn đề rõ ràng để được hỗ trợ nhanh hơn\n' +
          '• Không spam hoặc lạm dụng hệ thống'
        )
        .setColor(0x5865F2)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category')
        .setPlaceholder('📂 Chọn loại hỗ trợ...')
        .addOptions([
          { label: '🛠️ Hỗ trợ kỹ thuật', value: 'technical', description: 'Lỗi, bug, vấn đề kỹ thuật' },
          { label: '💰 Thanh toán', value: 'billing', description: 'Hoá đơn, giao dịch, hoàn tiền' },
          { label: '📢 Báo cáo vi phạm', value: 'report', description: 'Báo cáo thành viên vi phạm' },
          { label: '💬 Hỏi chung', value: 'general', description: 'Câu hỏi thông thường' },
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: '✅ Panel ticket đã được tạo!', ephemeral: true });
    }

    if (interaction.commandName === 'add-user') {
      if (!openTickets.has(interaction.channelId)) {
        return interaction.reply({ content: '❌ Kênh này không phải ticket!', ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
      });
      await interaction.reply({ content: `✅ Đã thêm ${targetUser} vào ticket!` });
    }

    if (interaction.commandName === 'remove-user') {
      if (!openTickets.has(interaction.channelId)) {
        return interaction.reply({ content: '❌ Kênh này không phải ticket!', ephemeral: true });
      }
      const targetUser = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: false,
        SendMessages: false,
      });
      await interaction.reply({ content: `✅ Đã xoá ${targetUser} khỏi ticket!` });
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') {
    const categoryLabels = {
      technical: '🛠️ Hỗ Trợ Kỹ Thuật',
      billing:   '💰 Thanh Toán',
      report:    '📢 Báo Cáo Vi Phạm',
      general:   '💬 Hỏi Chung',
    };

    const selected = interaction.values[0];
    const guild = interaction.guild;
    const user = interaction.user;

    const existingTicket = [...openTickets.entries()].find(
      ([, data]) => data.userId === user.id
    );
    if (existingTicket) {
      const [channelId] = existingTicket;
      const ch = guild.channels.cache.get(channelId);
      return interaction.reply({
        content: `❌ Bạn đã có ticket rồi: ${ch || 'ticket đã bị xoá'}`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username.toLowerCase().replace(/\s+/g, '-')}`,
        type: ChannelType.GuildText,
        parent: process.env.CATEGORY_ID,
        topic: `Ticket của ${user.tag} | Loại: ${categoryLabels[selected]}`,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
          {
            id: process.env.STAFF_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ManageMessages,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
            ],
          },
        ],
      });

      openTickets.set(ticketChannel.id, {
        userId: user.id,
        category: selected,
        createdAt: new Date(),
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`${categoryLabels[selected]}`)
        .setDescription(
          `Xin chào ${user}! 👋\n\n` +
          `Staff <@&${process.env.STAFF_ROLE_ID}> sẽ hỗ trợ bạn sớm nhất.\n\n` +
          `📝 **Hãy mô tả vấn đề của bạn bên dưới.**`
        )
        .setColor(0x57F287)
        .addFields(
          { name: 'Người dùng', value: `${user}`, inline: true },
          { name: 'Loại ticket', value: categoryLabels[selected], inline: true },
          { name: 'Thời gian', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter({ text: 'Dùng nút bên dưới để quản lý ticket' });

      const controlRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Đóng Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('✋ Nhận Ticket')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('transcript_ticket')
          .setLabel('📄 Lưu Log')
          .setStyle(ButtonStyle.Secondary),
      );

      await ticketChannel.send({
        content: `${user} | <@&${process.env.STAFF_ROLE_ID}>`,
        embeds: [ticketEmbed],
        components: [controlRow],
      });

      await interaction.editReply({ content: `✅ Ticket đã tạo: ${ticketChannel}` });
      await sendLog(guild, 'open', user, ticketChannel, categoryLabels[selected]);

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Có lỗi xảy ra, vui lòng thử lại!' });
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId === 'close_ticket') {
      if (!openTickets.has(interaction.channelId)) {
        return interaction.reply({ content: '❌ Kênh này không phải ticket!', ephemeral: true });
      }
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_close')
          .setLabel('✅ Xác nhận đóng')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_close')
          .setLabel('❌ Huỷ')
          .setStyle(ButtonStyle.Secondary),
      );
      await interaction.reply({
        content: '⚠️ Bạn có chắc muốn **đóng ticket** này không?',
        components: [confirmRow],
      });
    }

    if (interaction.customId === 'confirm_close') {
      const ticketData = openTickets.get(interaction.channelId);
      if (!ticketData) return;
      const owner = await client.users.fetch(ticketData.userId).catch(() => null);
      await sendLog(interaction.guild, 'close', owner, interaction.channel, null, interaction.user);
      openTickets.delete(interaction.channelId);
      await interaction.reply('🔒 Ticket đang được đóng...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }

    if (interaction.customId === 'cancel_close') {
      await interaction.reply({ content: '✅ Đã huỷ!', ephemeral: true });
    }

    if (interaction.customId === 'claim_ticket') {
      const member = interaction.member;
      if (!member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
        return interaction.reply({ content: '❌ Chỉ staff mới có thể nhận ticket!', ephemeral: true });
      }
      await interaction.channel.permissionOverwrites.edit(process.env.STAFF_ROLE_ID, {
        ViewChannel: false,
      });
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ManageMessages: true,
      });
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`✋ ${interaction.user} đã nhận ticket này!`)
            .setColor(0xFEE75C)
        ]
      });
    }

    if (interaction.customId === 'transcript_ticket') {
      await interaction.deferReply({ ephemeral: true });
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = [...messages.values()].reverse();
      let log = `=== TRANSCRIPT: ${interaction.channel.name} ===\n`;
      log += `Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n`;
      sorted.forEach((msg) => {
        if (msg.author.bot) return;
        const time = new Date(msg.createdTimestamp).toLocaleTimeString('vi-VN');
        log += `[${time}] ${msg.author.tag}: ${msg.content || '[Embed/File]'}\n`;
      });
      const buffer = Buffer.from(log, 'utf-8');
      await interaction.editReply({
        content: '📄 Đây là log của ticket:',
        files: [{ attachment: buffer, name: `${interaction.channel.name}.txt` }],
      });
    }
  }
});

async function sendLog(guild, type, user, channel, category, closedBy = null) {
  const logChannel = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!logChannel) return;
  const isOpen = type === 'open';
  const embed = new EmbedBuilder()
    .setTitle(isOpen ? '🎫 Ticket mới được tạo' : '🔒 Ticket đã đóng')
    .setColor(isOpen ? 0x57F287 : 0xED4245)
    .addFields(
      { name: 'Người dùng', value: user ? `${user}` : 'Không xác định', inline: true },
      { name: 'Kênh', value: `${channel}`, inline: true },
    )
    .setTimestamp();
  if (isOpen && category) embed.addFields({ name: 'Loại', value: category, inline: true });
  if (!isOpen && closedBy) embed.addFields({ name: 'Đóng bởi', value: `${closedBy}`, inline: true });
  logChannel.send({ embeds: [embed] }).catch(() => {});
}

client.login(process.env.TOKEN);