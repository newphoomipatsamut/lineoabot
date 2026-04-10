const express = require('express');
const { Client } = require('@line/bot-sdk'); // ✅ Changed this line
const { Groq } = require('groq-sdk');

const app = express();
const port = process.env.PORT || 3000;

// Validate environment variables
if (!process.env.LINE_ACCESS_TOKEN) {
  console.error('ERROR: LINE_ACCESS_TOKEN is not set');
}
if (!process.env.GROQ_API_KEY) {
  console.error('ERROR: GROQ_API_KEY is not set');
}

// ✅ Use Client directly instead of line.Client
const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
});

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY 
});

app.get('/', (req, res) => {
  res.json({ status: 'LINE AI Bot is running! 🤖' });
});

app.post('/webhook', express.json(), async (req, res) => {
  const events = req.body.events;
  
  if (!events || events.length === 0) {
    return res.status(200).send('OK');
  }
  
  await Promise.all(events.map(handleEvent));
  res.status(200).send('OK');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const userText = event.message.text.trim();
  if (!userText) return;

  try {
    const systemPrompt = `คุณเป็นผู้ช่วยตอบแชทลูกค้ามืออาชีพ ใช้ภาษาไทยสุภาพ มีหาง "ครับ/ค่ะ" ตามความเหมาะสม ตอบสั้น กระชับ ไม่เกิน 3 บรรทัด หากไม่แน่ใจให้ตอบว่า "เดี๋ยวขอตรวจสอบและแจ้งกลับอีกครั้งนะครับ" ห้ามตอบเรื่องการเงิน การแพทย์ หรือข้อมูลส่วนตัวโดยไม่มีแหล่งอ้างอิง`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ],
      model: "llama-3.1-8b-instant",
      max_tokens: 150,
      temperature: 0.3
    });

    const replyText = completion.choices[0]?.message?.content || "ขออภัยครับ ระบบขัดข้องชั่วคราว";

    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });
  } catch (err) {
    console.error('Error:', err);
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ขออภัยครับ เกิดข้อขัดข้องชั่วคราว รบกวนสอบถามอีกครั้งครับ'
    });
  }
}

// For Vercel serverless
module.exports = app;

// For local development
if (require.main === module) {
  app.listen(port, () => console.log(`Bot running on port ${port}`));
}
