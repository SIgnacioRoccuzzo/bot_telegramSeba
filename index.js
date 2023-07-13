const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const { chatGPT, chatGPTV2 } = require('./utils');
const goolgeTTS = require('google-tts-api');

const User = require('./models/user.model')

//config .env(fichero de entorno)
require('dotenv').config();


//Config DB
require('./config/db');


const app = express()
const bot = new Telegraf(process.env.BOT_TOKEN);

//Configurar Telegram
app.use(bot.webhookCallback('/telegram-bot'));
bot.telegram.setWebhook(`${process.env.BOT_URL}/telegram-bot`);


//PETICION POST
app.post('/telegram-bot', (req, res) => {
    res.send('chichi chacha')
});

//MIDDLEWARE
bot.use(async (ctx, next) => {
    ctx.from.telegram_id = ctx.from.id;

    const user = await User.findOne({ telegram_id: ctx.from.id });//filtro para recuperar un elemento y se le pasa como parametro campo y valor
    if (!user) await User.create(ctx.from);//en un IF DE UNA SOLA SENTENCIA NO NECESITA LAS LLAVES
    next();

})


// COMANDOS
bot.command('test', async (ctx) => {
    console.log(ctx.message)
    await ctx.reply(`Hola ${ctx.from.first_name}.Quien es quien? `);
    await ctx.replyWithDice();

})
//destructuring a response con {data}
bot.command('tiempo', async (ctx) => {
    const city = ctx.message.text.slice(8)

    try {
        const { data } = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OWM_API_KEY}&units=metric`);


        await ctx.reply(`El tiempo en ${city}
    Temperatura: ${data.main.temp}
    Máxima: ${data.main.temp_max}
    Mínima: ${data.main.temp_min}
    Humedad: ${data.main.humidity}
    `);

        await ctx.replyWithLocation(data.coord.lat, data.coord.lon);
    } catch (error) {
        ctx.reply('Ha ocurrido un error vuelva a intentarlo.')
    }

})

bot.command('receta', async ctx => {
    try {
        const ingredientes = ctx.message.text.slice(8);
        const respuesta = await chatGPT(ingredientes);
        ctx.reply(respuesta);
        const response = await chatGPT('jalapeños, carne vacuna, tortillas, cebolla, aji rojo, salsa, tomate, cilantro, aguacate')
        ctx.reply(response);
    } catch (error) {
        ctx.reply('Ha ocurrido un error vuelve a enviar tus ingredientes');
    }


});
bot.command('chat', async ctx => {
    const mensaje = ctx.message.text.slice(6);

    const count = await User.countDocuments()
    const randomNum = Math.floor(Math.random() * count);

    const user = await User.findOne().skip(randomNum);
    bot.telegram.sendMessage(user.telegram_id, mensaje);
    ctx.reply(`Mensaje enviado a ${user.first_name}`)
});

//EVENTOS
bot.on('text', async ctx => {
    //const response = await chatGPTV2(ctx.message.text);
    const response = ctx.message.text;
    const url = goolgeTTS.getAudioUrl(response, {
        lang: 'es', slow: false, host: 'https://translate.google.com'
    });
    await ctx.reply(response);
    await ctx.replyWithAudio(url);
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`)
});