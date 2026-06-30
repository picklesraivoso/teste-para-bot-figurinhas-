const { Client, LocalAuth } = require('whatsapp-web.js');
const sharp = require('sharp');
const express = require('express'); // ➕ Importa o Express

const app = express();
const port = process.env.PORT || 3000; // 🌐 Usa a porta fornecida pelo Render

let qrCodeTexto = ''; // 📝 Variável para guardar o QR Code temporariamente
let statusBot = 'Iniciando o sistema...';

// 🌐 Rota principal: Acesse o link do Render para ver esta página
app.get('/', (req, res) => {
    if (statusBot === 'Conectado') {
        res.send('<h1>🎉 Bot conectado com sucesso no WhatsApp!</h1>');
    } else if (qrCodeTexto) {
        // Gera uma página simples com o QR Code usando uma API pública de imagens
        res.send(`
            <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
                <h1>📱 Escaneie o QR Code abaixo:</h1>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeTexto)}" alt="QR Code WhatsApp" />
                <p>Atualize a página se o código expirar.</p>
            </div>
        `);
    } else {
        res.send(`<h1>⏳ ${statusBot}</h1><p>Aguardando o QR Code ser gerado...</p>`);
    }
});

// 🚀 Inicializa o servidor web na porta correta
app.listen(port, () => {
    console.log(`Servidor web rodando na porta ${port}`);
});

// 🤖 Configuração do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Configurações necessárias para rodar em servidores Linux como o Render
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('QR CODE RECEBIDO! Escaneie para conectar:');
    qrCodeTexto = qr; // 💾 Salva o código para exibir na página web
    statusBot = 'Aguardando leitura do QR Code';
});

client.on('ready', () => {
    console.log('Bot conectado com sucesso no WhatsApp!');
    statusBot = 'Conectado';
    qrCodeTexto = ''; // Limpa o QR Code após conectar
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

                const contact = await msg.getContact();
                const nomeDoUsuario = contact.pushname || 'Amigo';

                await client.sendMessage(msg.from, media, { 
                    sendMediaAsSticker: true,
                    stickerName: 'NAKKA-BOT💲', 
                    stickerAuthor: nomeDoUsuario     
                });
            } catch (error) {
                console.error('Ih, travei aqui! Tente novamente.:', error);
            }
        }
    }
});

client.initialize();
