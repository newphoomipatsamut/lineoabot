require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { Groq } = require('groq-sdk');

const app = express();
const port = process.env.PORT || 3000;

const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/webhook', line.middleware({ channelAccessToken: process.env.LINE_ACCESS_TOKEN }), async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(handleEvent));
  res.status(200).send('OK');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const userText = event.message.text.trim();
  if (!userText) return;

  try {
    // AI Prompt optimized for Thai customer service
    const systemPrompt = `คุณเป็นผู้ช่วยตอบแชทลูกค้ามืออาชีพ ใช้ภาษาไทยสุภาพ มีหาง "ครับ/ค่ะ" ตามความเหมาะสม ตอบสั้น กระชับ ไม่เกิน 3 บรรทัด หากไม่แน่ใจให้ตอบว่า "เดี๋ยวขอตรวจสอบและแจ้งกลับอีกครั้งนะครับ" ห้ามตอบเรื่องการเงิน การแพทย์ หรือข้อมูลส่วนตัวโดยไม่มีแหล่งอ้างอิง`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ],
      model: "llama-3.1-8b-instant", // Free, fast, good Thai
      max_tokens: 150,
      temperature: 0.3
    });

    const replyText = completion.choices[0]?.message?.content || "ขออภัยครับ ระบบขัดข้องชั่วคราว";

    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });
  } catch (err) {
    console.error(err);
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ขออภัยครับ เกิดข้อขัดข้องชั่วคราว รบกวนสอบถามอีกครั้งหรือติดต่อแอดมินโดยตรงครับ'
    });
  }
}

app.listen(port, () => console.log(`Bot running on port ${port}`));