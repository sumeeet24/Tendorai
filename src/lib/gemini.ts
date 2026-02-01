import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY is missing')
}

const genAI = new GoogleGenerativeAI(apiKey!)

// Use a known valid model.
// "gemini-2.0-flash" is the current stable fast model.
const MODEL_NAME = 'gemini-2.0-flash'

const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
})

export async function generateJSON(prompt: string, images: string[] = []): Promise<any> {
  try {
    const parts: any[] = [{ text: prompt }]

    for (const img of images) {
        parts.push({
            inlineData: {
                data: img,
                mimeType: "image/jpeg"
            }
        })
    }

    const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    })

    const text = result.response.text()
    return JSON.parse(text)
  } catch (error) {
    console.error('Gemini API Error:', error)
    throw error
  }
}

export async function generateText(prompt: string): Promise<string> {
    try {
      const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })

      return result.response.text()
    } catch (error) {
      console.error('Gemini API Error:', error)
      throw error
    }
  }
