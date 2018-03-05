//#region constants
const telegraf = require('telegraf')
    , session = require('telegraf/session')
    , Stage = require('telegraf/stage')
    , Scene = require('telegraf/scenes/base')
    , { enter, leave } = Stage
    , Token = process.env.TOKEN || ''
    , adminID = process.env.adminID
    , markup = require('telegraf/markup')
    , extra = require('telegraf/extra')
    , bot = new telegraf(Token)
    , stage = new Stage()
    , PORT = process.envenv.PORT || 3000;
    , URL = process.envenv.URL || 'https://mysterious-hollows-52337.herokuapp.com';

//#region constant messages
const joinMessage = `برای عضویت در مجموعه فرهنگی **هیئت شهدای گمنام دانشگاه اصفهان**، ابتدا نام خود را بفرستید.`
    , startMessage = `سلام. خوش آمدید.
    برای پر کردن فرم عضویت در هیئت، /join را ارسال فرمایید.
    برای بیان انتقادات و پیشنهادات، /contact را ارسال فرمایید.
    برای لغو هر مرحله /cancel را ارسال کنید.
    **هیئت شهدای گمنام دانشگاه اصفهان**
    @heiat_uisf`
    , stopMessage = 'عملیات متوقف شد.'
//#endregion constant messages
//#region http
bot.telegram.setWebhook(`${URL}/bot${API_TOKEN}`);
bot.startWebhook(`/bot${API_TOKEN}`, null, PORT)
//#endregion http
//#endregion constants

//#region bot setting
bot.use(session())
bot.use(stage.middleware())
bot.start(({reply})=>{
    return reply(startMessage);
})
bot.catch((err) => {
    console.log('Ooops you see this error : ', err)
})
//#endregion bot setting

//#region functions
function done(mem){
    return `نام : ${mem.name}
    نام خانوادگی : ${mem.family}
    زمینه‌ی تحصیلی : ${mem.teach} ترم ${mem.term}
    زمینه‌ی فعالیت : ${mem.work}
    اطلاعات تماس : ${mem.contact}`
}
//#endregion functions

//#region join scene setting
const join = new Scene('join');
stage.register(join)
bot.command('join', (ctx) => ctx.scene.enter('join'))
join.enter((ctx) => ctx.replyWithMarkdown(joinMessage));
join.on('text',(ctx)=>{
    let session = ctx.session, message = ctx.message, reply = ctx.reply, from = ctx.from;
    if(message.text == '/cancel'){
        ctx.scene.leave();
        return reply(stopMessage);
    }
    if(message.entities){
        return reply(`لطفا محتوای غیر مرتبط (هشتگ،دستور،لینک و...) ارسال نکنید. برای توقف دستور /cancel را ارسال فرمایید.`);
    }
    if(!session.mem){
        session.mem={};
    }
    let mem = session.mem;
    if(!mem.name){
        mem.name = message.text;
        return reply(`لطفا نام خانوادگی خود را ارسال کنید.`);
    }
    if(!mem.family){
        mem.family = message.text;
        return reply(`لطفا رشته تحصیلی خود را ارسال کنید.`);
    }
    if(!mem.teach){
        mem.teach = message.text;
        return reply(`مشغول به تحصیل در چه ترمی هستید؟`);
    }
    if(!mem.term){
        let term = parseInt(message.text);
        if(isNaN(term))
            return reply('لطفا یک عدد بفرستید.');
        mem.term = term;
        if(from.username == undefined){
            return reply(`لطفا با کمک دکمه های زیر شماره همراه خود را به اشتراک بگذارید.(شما ID تلگرام برای تماس ندارید)`,
            extra.markup((markup) => {
                return markup
                  .keyboard([
                    markup.contactRequestButton('اشتراک شماره همراه'),
                    'شماره همراه خود را به اشتراک نمیگذارم.'
                  ])
              }))
        }
        else{
            return reply(`لطفا با کمک دکمه های زیر اطلاعات تماس خود را به اشتراک بگذارید.`,
            extra.markup((markup) => {
                return markup
                  .keyboard([
                    markup.contactRequestButton('اشتراک شماره همراه'),
                    'شماره همراه خود را به اشتراک نمیگذارم.',
                    'اشتراک ID.'
                  ])
              }))
        }
    }
    if(!mem.contact){
        if(message.text == 'اشتراک ID.'){
            mem.contact = '@'+from.username;
        }
        else{
            mem.contact = 'کاربر تمایلی به اشتراک اطلاعات تماس خود نداشت.'
        }
        return reply(` زمینه فعالیتی خود را بنویسید (پشتیبانی،گرافیست،ساخت کلیپ و ...)`,extra.markup(markup.removeKeyboard()));
    }
    if(!mem.work){
        mem.work = message.text;
        bot.telegram.sendMessage(adminID,done(mem));
        session.mem = {};
        if(ctx.scene.leave('join'))
        return reply(`ممنون، اطلاعات شما برای ما ارسال شد، دراسرع وقت با شما تماس گرفته خواهد شد!`);
    }
});
join.on('message', ({message,session,reply}) => {
    if(message.contact){
        session.mem.contact = message.contact.phone_number;
        return reply(` زمینه فعالیتی خود را بنویسید (پشتیبانی،گرافیست،ساخت کلیپ و ...)`,extra.markup(markup.removeKeyboard()));
    }
    else{
        reply(`لطفا فایل ارسال نکنید.`)
    }
});
//#endregion join scene setting

//#region contact scene setting
const contact = new Scene('contact');
stage.register(contact);
bot.command('contact',(ctx) => ctx.scene.enter('contact'))
contact.enter(({reply}) => reply(`پیام خود را وارد کنید.`));
contact.command('cancel',(ctx)=>{
    ctx.scene.leave();
    return ctx.reply(stopMessage)
});
contact.on('message',(ctx)=>{
    let message = ctx.message;
    bot.telegram.forwardMessage(adminID,message.from.id,message.message_id);
    ctx.scene.leave('contact');
    return ctx.reply('پیام فرستاده شد.')
})
//#endregion contact scene setting

