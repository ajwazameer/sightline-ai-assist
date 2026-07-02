import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, mode } = await req.json();

    if (!image) {
      throw new Error('No image data provided');
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    console.log('Analyzing image with mode:', mode);

    // Prepare the prompt based on mode
    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'obstacle') {
      systemPrompt = `You are an AI vision assistant for blind users. Analyze the image and identify potential obstacles, their approximate distances, and positions. Focus on:
- Objects that could be obstacles (people, furniture, walls, doors, stairs, vehicles, etc.)
- Their approximate distance (use terms: "very close" < 1m, "close" 1-3m, "moderate distance" 3-5m, "far" > 5m)
- Their position relative to the camera (ahead, left, right, above, below)
- Confidence level in detection

Return ONLY a valid JSON array of detected obstacles with this exact structure:
[{"object": "person", "distance": "2 meters ahead", "confidence": 0.92, "priority": "high"}]

Priority should be "high" if distance is very close or close, "medium" if moderate distance, "low" if far.`;
      userPrompt = 'Detect obstacles in this image and return them as JSON array.';
    } else if (mode === 'scene') {
      systemPrompt = `You are an AI vision assistant for blind users. Provide a clear, concise description of the entire scene. Focus on:
- Overall environment (indoor/outdoor, type of space)
- Key objects and their locations
- Potential hazards or obstacles
- Navigation suggestions

Be descriptive but concise. Maximum 3-4 sentences.`;
      userPrompt = 'Describe this scene in detail for a blind user.';
    } else if (mode === 'text') {
      systemPrompt = `You are an AI vision assistant for blind users. Read and transcribe any visible text in the image. This includes:
- Signs
- Labels
- Documents
- Street names
- Product information
- Any readable text

If no text is visible, say "No text detected in the image."`;
      userPrompt = 'Read all text visible in this image.';
    }

    // Call Groq's vision model (OpenAI-compatible chat completions endpoint)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        max_tokens: mode === 'obstacle' ? 500 : 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Groq API key issue. Check that GROQ_API_KEY is set and valid.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Parse response based on mode
    if (mode === 'obstacle') {
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const detections = JSON.parse(jsonMatch[0]);
          return new Response(
            JSON.stringify({ detections }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // If no JSON found, return empty array
          console.warn('No JSON array found in response');
          return new Response(
            JSON.stringify({ detections: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (parseError) {
        console.error('Error parsing detections:', parseError);
        return new Response(
          JSON.stringify({ detections: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // For scene and text modes, return the text content
      return new Response(
        JSON.stringify({ text: content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in analyze-scene function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze scene';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
