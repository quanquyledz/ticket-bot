const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'setup-ticket',
    description: 'Tạo panel ticket trong kênh này',
  },
  {
    name: 'add-user',
    description: 'Thêm user vào ticket',
    options: [
      {
        name: 'user',
        description: 'User muốn thêm',
        type: 6,
        required: true,
      },
    ],
  },
  {
    name: 'remove-user',
    description: 'Xoá user khỏi ticket',
    options: [
      {
        name: 'user',
        description: 'User muốn xoá',
        type: 6,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Đang đăng ký slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Đăng ký thành công!');
  } catch (error) {
    console.error(error);
  }
})();