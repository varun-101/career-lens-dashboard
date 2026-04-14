import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimelineEntry {
  type: "education" | "job" | "project";
  title: string;
  start: string;
  end: string;
  description: string;
}

interface ResumeAnalysis {
  is_resume: boolean;
  score: number;
  status: "excellent" | "good" | "average" | "poor";
  experience: string;
  skills: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  extracted_github_username: string | null;
  timeline: TimelineEntry[];
}

/**
 * Extract a GitHub *profile* username from a raw URL string.
 * - Profile URL:    github.com/username          → returns "username"
 * - Repo URL:       github.com/username/repo     → returns null (repo, not profile)
 */
function extractGithubProfileUsername(url: string): string | null {
  try {
    const normalised = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(normalised);
    if (!parsed.hostname.replace("www.", "").startsWith("github.com")) return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 1) return segments[0];
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract any GitHub URL mentions from raw resume text using regex,
 * then filter down to profile-level URLs only.
 */
function extractGithubFromText(text: string): string | null {
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

    const systemPrompt = `You are an expert HR analyst and resume evaluator. Analyze the provided document and return a detailed JSON analysis.

CRITICAL STEP 1 — DOCUMENT VALIDATION:
First, determine if this document is actually a resume or CV. A genuine resume/CV contains:
- Personal details (name, contact info)
- Education history
- Work experience
- Skills relevant to employment

If the document is NOT a resume (e.g., research papers, academic reports, textbooks, social media analytics, marketing documents, product documentation, unrelated articles, or any non-resume content), you MUST immediately return:
{
  "is_resume": false,
  "score": 0,
  "status": "poor",
  "experience": "N/A",
  "skills": [],
  "summary": "This document does not appear to be a resume or CV. It cannot be evaluated as a job application.",
  "strengths": [],
  "weaknesses": ["This document is not a resume and cannot be evaluated for hiring purposes."],
  "recommendations": ["Ask the applicant to submit a proper resume or CV."],
  "extracted_github_username": null,
  "timeline": []
}

CRITICAL STEP 2 — IF IT IS A RESUME, BE BRUTALLY HONEST:
- Set "is_resume": true
- Score based ONLY on what is actually in the document. Do NOT be generous.
- NEVER fabricate strengths. Only list strengths that are DIRECTLY SUPPORTED BY EVIDENCE in the resume text.
- NEVER fabricate weaknesses. Only list real gaps or concerns clearly visible in the resume.
- If you cannot find genuine strengths, return "strengths": []
- If you cannot find genuine weaknesses, return "weaknesses": []
- Strengths must cite specific evidence (e.g., "Led a team of 5 — demonstrated leadership")
- A poor resume with no real strengths should get "strengths": []
- Score generously only for well-documented, relevant, quantified achievements

Your analysis should include:
1. is_resume: true or false (ALWAYS include this)
2. Overall score (0-100) — only high if resume is genuinely strong
3. Status: "excellent" (85+), "good" (70-84), "average" (50-69), "poor" (<50)
4. Years of experience extracted from resume
5. Key skills — only if explicitly mentioned or clearly evidenced
6. Brief honest summary of the candidate
7. Strengths — only evidence-backed, can be empty []
8. Weaknesses/areas for improvement — only real gaps, can be empty []
9. Hiring recommendations — 0-3 actionable items
10. extracted_github_username — github.com/<username> profile only (not repo links), or null
11. timeline — array of career/education/project entries in chronological order

Consider the target position when evaluating.${requirementsText}`;

    const userPrompt = `Analyze this document for the position of "${position || "General Application"}".

Applicant Name: ${applicantName}

Document Content:
${resumeText}

Return your analysis as a valid JSON object with this EXACT structure:
{
  "is_resume": true | false,
  "score": number,
  "status": "excellent" | "good" | "average" | "poor",
  "experience": "X years",
  "skills": ["skill1", "skill2"],
  "summary": "Honest summary",
  "strengths": ["evidence-backed strength1"],
  "weaknesses": ["real weakness1"],
  "recommendations": ["recommendation1"],
  "extracted_github_username": "username" | null,
  "timeline": [
    {
      "type": "education" | "job" | "project",
      "title": "Degree / Job title / Project name",
      "start": "YYYY-MM",
      "end": "YYYY-MM" | "present",
      "description": "Brief description"
    }
  ]
}

REMINDER: If not a resume → is_resume: false, score: 0, all arrays empty.
REMINDER: Only include strengths/weaknesses that are DIRECTLY EVIDENCED in the text.`;

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
        temperature: 0.2,
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

    // ── Non-resume rejection gate ──
    if (analysis.is_resume === false) {
      console.log("Document rejected: not a resume.");
      const rejectedAnalysis: ResumeAnalysis = {
        is_resume: false,
        score: 0,
        status: "poor",
        experience: "N/A",
        skills: [],
        summary: "This document does not appear to be a resume or CV and cannot be evaluated for hiring purposes.",
        strengths: [],
        weaknesses: ["Document is not a resume — cannot be used for hiring evaluation."],
        recommendations: ["Request a proper resume or CV from the applicant."],
        extracted_github_username: null,
        timeline: [],
      };
      return new Response(
        JSON.stringify({ success: true, analysis: rejectedAnalysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer AI-extracted username; fall back to regex extraction
    const finalGithubUsername = analysis.extracted_github_username || textExtractedGithub || null;

    const score = Math.min(100, Math.max(0, analysis.score || 0));
    const status = analysis.status || (score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "average" : "poor");

    const normalizedAnalysis: ResumeAnalysis = {
      is_resume: true,
      score,
      status,
      experience: analysis.experience || "Not specified",
      skills: Array.isArray(analysis.skills) ? analysis.skills : [],
      summary: analysis.summary || "No summary available",
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      extracted_github_username: finalGithubUsername,
      timeline: Array.isArray(analysis.timeline) ? analysis.timeline : [],
    };

    console.log("Resume analysis complete:", {
      is_resume: normalizedAnalysis.is_resume,
      score: normalizedAnalysis.score,
      status: normalizedAnalysis.status,
      extracted_github: normalizedAnalysis.extracted_github_username,
      timeline_entries: normalizedAnalysis.timeline.length,
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
