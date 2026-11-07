import { GoogleGenAI } from '@google/genai';

// Initialize Gemini SDK with process.env.GEMINI_API_KEY if present
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateGeminiDanceReview(
  songTitle: string,
  artist: string,
  score: number,
  stars: number,
  perfectCount: number,
  playerNames: string[]
): Promise<string> {
  if (!ai) {
    // High quality fallback review if API key is not populated in client
    if (score > 10000) {
      return `🌟 OUTSTANDING PERFORMANCE! You completely owned the stage on "${songTitle}" by ${artist}! With ${perfectCount} PERFECT moves, you've earned a Megastar rating! Keep up this incredible energy!`;
    } else if (score > 6000) {
      return `🔥 GREAT RHYTHM! Solid performance on "${songTitle}"! Your timing on side-steps and raised hands was super clean. Practice the fast spins to lock in those extra stars!`;
    } else {
      return `💃 NICE TRY! Dancing to "${songTitle}" takes serious stamina! Focus on matching the pictogram cues on time to boost your combo multiplier!`;
    }
  }

  try {
    const prompt = `You are the iconic ColeDance AI Dance Coach. Provide an energetic, encouraging, 2-3 sentence personalized review for a dance session.
Song: "${songTitle}" by ${artist}
Dancers: ${playerNames.join(', ')}
Total Score: ${score} points
Star Rank: ${stars} / 5 stars
Perfect Moves: ${perfectCount}
Write an enthusiastic review with dance tips for their next song!`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || `Awesome dance session on ${songTitle}!`;
  } catch (err) {
    console.error('Gemini Dance Review Error:', err);
    return `Incredible energy on "${songTitle}"! You brought high excitement and great rhythm to the floor!`;
  }
}
