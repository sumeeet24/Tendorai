import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY is missing')
}

const genAI = new GoogleGenerativeAI(apiKey!)

// Use a known valid model.
const MODEL_NAME = 'gemini-3-flash-preview'

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

    // Logging for debugging
    console.log(`[Gemini] Model: ${MODEL_NAME}`)
    console.log(`[Gemini] Status: Success`)
    console.log(`[Gemini] Response Length: ${text.length}`)
    console.log(`[Gemini] Response Preview: ${text.substring(0, 200)}`)

    if (!text) {
        throw new Error('Gemini returned empty response')
    }

    try {
        return JSON.parse(text)
    } catch (parseError) {
        console.error('[Gemini] JSON Parse Error. Raw text:', text)
        throw new Error('Failed to parse Gemini JSON response: ' + parseError)
    }
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
