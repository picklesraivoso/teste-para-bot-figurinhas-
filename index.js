const { Client, LocalAuth } = require('whatsapp-web.js');
const sharp = require('sharp');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

let qrCodeTexto = '';
let statusBot = 'Iniciando o sistema...';

// 🔄 Armazena temporariamente as preferências de nome e autor por usuário
const metadadosPersonalizados = new Map();

// 🌐 Rota principal protegida por senha
app.get('/', (req, res) => {
    const senhaUsuario = req.query.senha;
    const senhaCorreta = process.env.PAINEL_SENHA;

    if (!senhaUsuario || senhaUsuario !== senhaCorreta) {
        return res.status(403).send('<h1>🚫 Acesso negado: Senha incorreta ou não fornecida.</h1>');
    }

    if (statusBot === 'Conectado') {
        res.send('<h1>🎉 Bot conectado com sucesso no WhatsApp!</h1>');
    } else if (qrCodeTexto) {
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

app.listen(port, () => {
    console.log(`Servidor web rodando na porta ${port}`);
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('QR CODE RECEBIDO! Escaneie para conectar:');
    qrCodeTexto = qr;
    statusBot = 'Aguardando leitura do QR Code';
});

client.on('ready', () => {
    console.log('Bot conectado com sucesso no WhatsApp!');
    statusBot = 'Conectado';
    qrCodeTexto = '';
});

client.on('message', async (msg) => {
    const chat_id = msg.from;

    // 📋 COMANDO 1: Menu Principal
    if (msg.body.toLowerCase() === '!menu') {
        const textoMenu = `🤖 *Bem-vindo ao NAKKA-BOT!* 💲\n\n` +
                          `Aqui estão os comandos disponíveis para você:\n\n` +
                          `📸 *Como fazer uma figurinha:*\n` +
                          `1. Envie uma foto no chat.\n` +
                          `2. Digite */f* na legenda da foto (ou responda a foto com */f*).\n\n` +
                          `✏️ *Como personalizar o nome da figurinha:*\n` +
                          `Use o comando abaixo *antes* de enviar a foto:\n` +
                          `👉 \`/rename: Nome da Figurinha - Nome do Autor\`\n\n` +
                          `💡 _Exemplo:_ \`/rename: Meme do Ano - Nakka\``;
        
        await client.sendMessage(chat_id, textoMenu);
        return;
    }

    // ✏️ COMANDO 2: Configurar o Rename
    if (msg.body.startsWith('/rename:')) {
        const conteudo = msg.body.replace('/rename:', '').trim();
        const partes = conteudo.split('-');

        if (partes.length < 2) {
            await client.sendMessage(chat_id, '❌ *Formato inválido!* Use exatamente o modelo:\n`/rename: Nome - Autor`');
            return;
        }

        const nomeConfigurado = partes[0].trim();
        const autorConfigurado = partes[1].trim();

        metadadosPersonalizados.set(chat_id, {
            nome: nomeConfigurado,
            autor: autorConfigurado
        });

        await client.sendMessage(chat_id, `✅ *Configurado com sucesso!*\n\n📦 *Pacote:* ${nomeConfigurado}\n✍️ *Autor:* ${autorConfigurado}\n\nAgora você já pode enviar a sua foto com */f*!`);
        return;
    }

    // 🖼️ COMANDO 3: Criação da Figurinha
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

                const preferencia = metadadosPersonalizados.get(chat_id);
                
                let nomeFinal = 'NAKKA-BOT💲';
                let autorFinal = 'Amigo';

                if (preferencia) {
                    nomeFinal = preferencia.nome;
                    autorFinal = preferencia.autor;
                } else {
                    const contact = await msg.getContact();
                    autorFinal = contact.pushname || 'Amigo';
                }

                await client.sendMessage(chat_id, media, { 
                    sendMediaAsSticker: true,
                    stickerName: nomeFinal, 
                    stickerAuthor: autorFinal     
                });

                // Limpa as preferências após o uso para que a próxima figurinha volte ao padrão
                metadadosPersonalizados.delete(chat_id);

            } catch (error) {
                console.error('Ih, travei aqui! Tente novamente.:', error);
            }
        }
    }
});

client.initialize();
