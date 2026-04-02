import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResumeAnalysis {
  score: number;
  status: "excellent" | "good" | "average" | "poor";
  experience: string;
  skills: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  extracted_github_username: string | null;
}

/**
 * Extract a GitHub *profile* username from a raw URL string.
 * - Profile URL:    github.com/username          → returns "username"
 * - Repo URL:       github.com/username/repo     → returns null (repo, not profile)
 * - Other URLs / paths with 3+ segments → null
 */
function extractGithubProfileUsername(url: string): string | null {
  try {
    // Normalise: add scheme if missing so URL() can parse it
    const normalised = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(normalised);
    if (!parsed.hostname.replace("www.", "").startsWith("github.com")) return null;

    // pathname is like "/username" or "/username/repo" or "/username/repo/..."
    const segments = parsed.pathname.split("/").filter(Boolean);

    // Only a single segment → profile page
    if (segments.length === 1) return segments[0];

    return null; // repo or deeper link
  } catch {
    return null;
  }
}

/**
 * Extract any GitHub URL mentions from raw resume text using regex,
 * then filter down to profile-level URLs only.
 */
function extractGithubFromText(text: string): string | null {
  // Match any github.com/... token in text
  const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)/gi;
  const matches = [...text.matchAll(regex)];

  for (const match of matches) {
    const fullUrl = match[0];
    const username = extractGithubProfileUsername(fullUrl);
    if (username) return username;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, position, applicantName, jobRequirements } = await req.json();

    if (!resumeText) {
      return new Response(
        JSON.stringify({ error: "Resume text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fast path: extract GitHub from raw text before sending to AI ──
    const textExtractedGithub = extractGithubFromText(resumeText);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requirementsText = Array.isArray(jobRequirements) && jobRequirements.length > 0
      ? `\nJob Requirements:\n${jobRequirements.map((r: string) => `- ${r}`).join("\n")}`
      : "";

    const systemPrompt = `You are an expert HR analyst and resume evaluator. Analyze the provided resume and return a detailed JSON analysis.

Your analysis should include:
1. Overall score (0-100) based on qualifications, experience, and presentation
2. Status classification: "excellent" (85+), "good" (70-84), "average" (50-69), "poor" (<50)
3. Years of experience extracted from the resume
4. Key skills identified (return as array)
5. Brief summary of the candidate
6. Strengths (array of 3-5 points)
7. Weaknesses or areas for improvement (array of 2-4 points)
8. Hiring recommendations (array of 2-3 actionable suggestions)
9. extracted_github_username: scan the resume text for any GitHub profile URL (github.com/<username> with NO further path segments — repository links like github.com/user/repo should NOT be treated as a profile). Return only the username string, or null if nothing is found.

Consider the target position when evaluating relevance of skills and experience.${requirementsText}`;

    const userPrompt = `Analyze this resume for the position of "${position || "General Application"}".

Applicant Name: ${applicantName}

Resume Content:
${resumeText}

Return your analysis as a valid JSON object with this exact structure:
{
  "score": number,
  "status": "excellent" | "good" | "average" | "poor",
  "experience": "X years",
  "skills": ["skill1", "skill2", ...],
  "summary": "Brief summary of candidate",
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "extracted_github_username": "username" | null
}`;

    console.log("Calling AI gateway for resume analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to analyze resume" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No analysis generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the AI response
    let analysis: ResumeAnalysis;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(
        JSON.stringify({ error: "Failed to parse analysis results" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer AI-extracted username; fall back to regex extraction
    const finalGithubUsername = analysis.extracted_github_username || textExtractedGithub || null;

    const normalizedAnalysis: ResumeAnalysis = {
      score: Math.min(100, Math.max(0, analysis.score || 50)),
      status: analysis.status || (analysis.score >= 85 ? "excellent" : analysis.score >= 70 ? "good" : analysis.score >= 50 ? "average" : "poor"),
      experience: analysis.experience || "Not specified",
      skills: Array.isArray(analysis.skills) ? analysis.skills : [],
      summary: analysis.summary || "No summary available",
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      extracted_github_username: finalGithubUsername,
    };

    console.log("Resume analysis complete:", {
      score: normalizedAnalysis.score,
      status: normalizedAnalysis.status,
      extracted_github: normalizedAnalysis.extracted_github_username,
    });

    return new Response(
      JSON.stringify({ success: true, analysis: normalizedAnalysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Resume analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
