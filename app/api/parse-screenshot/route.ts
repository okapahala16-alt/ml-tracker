import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('screenshot') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              {
                type: 'text',
                text: `This is a Mobile Legends: Bang Bang end-of-match scoreboard screenshot.

Extract ALL players from BOTH teams and return their data.

For emblem per player, look at the COLOR of the badge/medal icon shown next to their rating number:
- YELLOW or GOLD colored badge/icon → "gold"
- GREY or WHITE or SILVER colored badge/icon → "silver"
- BROWN or BRONZE colored badge/icon → "bronze"
- Special badge with a crown icon OR text "MVP" → "mvp"

The winning team typically has GOLD (yellow) badges. The losing team typically has SILVER (grey) or BRONZE badges. Use the actual color you see, not assumptions.

Return ONLY a valid JSON object (no markdown, no explanation):

{
  "result": "win",
  "players": [
    {
      "inGameName": "player name exactly as shown",
      "heroName": "official Mobile Legends hero name from the portrait",
      "kills": 0,
      "deaths": 0,
      "assists": 0,
      "rating": 0.0,
      "emblem": "gold"
    }
  ]
}

Rules:
- "result": "win" if VICTORY shown, "loss" if DEFEAT
- IMPORTANT: Return LEFT column players FIRST (positions 1-5 on left side), then RIGHT column players (positions 1-5 on right side). The left column is always the first team listed regardless of win/loss.
- K/D/A: three numbers per row (e.g. "6 0 8" = 6 kills, 0 deaths, 8 assists)
- "rating": decimal number near the rank badge (e.g. 10.4)
- "emblem": "mvp", "gold", "silver", or "bronze" — default "silver" if unclear
- Return ONLY the raw JSON, nothing else`,
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    })

    const json = await response.json()

    if (!response.ok) {
      throw new Error(json.error?.message ?? 'Groq API error')
    }

    const text = json.choices?.[0]?.message?.content?.trim() ?? ''

    // Strip markdown fences
    let cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    // Extract JSON object if there's surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) cleaned = jsonMatch[0]

    // Remove control characters that break JSON parsing
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch: string) =>
      ch === '\n' || ch === '\r' || ch === '\t' ? ch : ''
    )

    const data = JSON.parse(cleaned)
    return NextResponse.json(data)
  } catch (err) {
    console.error('parse-screenshot error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse screenshot' },
      { status: 500 },
    )
  }
}
