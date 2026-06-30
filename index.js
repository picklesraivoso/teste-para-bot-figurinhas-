const { Client, LocalAuth } = require('whatsapp-web.js');
const sharp = require('sharp');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('QR CODE RECEBIDO! Escaneie para conectar:');
});

client.on('ready', () => {
    console.log('Bot conectado com sucesso no WhatsApp!');
});

client.on('message', async (msg) => {
    if (msg.hasMedia && msg.body === '/f') {
        const media = await msg.downloadMedia();
        if (media && media.mimetype.includes('image')) {
            try {
                const buffer = Buffer.from(media.data, 'base64');
                const webpBuffer = await sharp(buffer)
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .webp()
                    .toBuffer();
                
                media.data = webpBuffer.toString('base64');
                media.mimetype = 'image/webp';
                media.filename = 'sticker.webp';
                
                // Busca as informações de quem enviou a mensagem
                const contact = await msg.getContact();
                const nomeDoUsuario = contact.pushname || 'Amigo';
                
                await client.sendMessage(msg.from, media, { 
                    sendMediaAsSticker: true,
                    stickerName: 'NAKKA-BOT💲', // Nome que você quer dar ao seu Bot
                    stickerAuthor: nomeDoUsuario     // Nome de quem enviou a foto
                });
            } catch (error) {
                console.error('Ih, travei aqui! Tente novamente.:', error);
            }
        }
    }
});

client.initialize();
