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

interface EffortClaim {
  skill: string;
  evidence_score: number;
  evidence_text: string;
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
  effort_vs_claim: EffortClaim[];
}

/**
 * Extract a GitHub *profile* username from a raw URL string.
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
  // Handle preflight CORS request
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

    const textExtractedGithub = extractGithubFromText(resumeText);

    // Validate environment configuration
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    // USE_DEEPSEEK flag: when "true", DeepSeek is used as primary; otherwise it's only a fallback
    const USE_DEEPSEEK = (Deno.env.get("USE_DEEPSEEK") || "").toLowerCase() === "true";

    if (!LOVABLE_API_KEY && !DEEPSEEK_API_KEY) {
      console.error("Neither LOVABLE_API_KEY nor DEEPSEEK_API_KEY is configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format job requirements for the AI prompt
    const requirementsText = Array.isArray(jobRequirements) && jobRequirements.length > 0
      ? `\nJob Requirements:\n${jobRequirements.map((r: string) => `- ${r}`).join("\n")}`
      : "";

    // Helper to call AI API with DeepSeek fallback
    async function callProvider(provider: "lovable" | "deepseek", systemMsg: string, userMsg: string) {
      const isLovable = provider === "lovable";
      const url = isLovable
        ? "https://ai.gateway.lovable.dev/v1/chat/completions"
        : "https://api.deepseek.com/v1/chat/completions";
      const apiKey = isLovable ? LOVABLE_API_KEY : DEEPSEEK_API_KEY;
      const model = isLovable ? "google/gemini-2.5-flash" : "deepseek-chat";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: userMsg },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
        if (response.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
        const errText = await response.text();
        throw new Error(`${provider} AI error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No analysis generated");

      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
        content.match(/```\n?([\s\S]*?)\n?```/) ||
        [null, content];
      const jsonStr = jsonMatch[1] || content;
      return JSON.parse(jsonStr.trim());
    }

    async function callAI(systemMsg: string, userMsg: string) {
      // Determine primary provider based on USE_DEEPSEEK flag and key availability
      const primary: "lovable" | "deepseek" =
        USE_DEEPSEEK && DEEPSEEK_API_KEY ? "deepseek" : (LOVABLE_API_KEY ? "lovable" : "deepseek");
      const fallback: "lovable" | "deepseek" = primary === "lovable" ? "deepseek" : "lovable";
      const fallbackKey = fallback === "lovable" ? LOVABLE_API_KEY : DEEPSEEK_API_KEY;

      try {
        return await callProvider(primary, systemMsg, userMsg);
      } catch (err) {
        console.error(`Primary provider (${primary}) failed:`, err);
        if (!fallbackKey) throw err;
        console.log(`Falling back to ${fallback}...`);
        return await callProvider(fallback, systemMsg, userMsg);
      }
    }

    // 1. General Analysis Prompt
    const generalSystem = `You are an expert HR analyst and resume evaluator. Analyze the provided document and return a detailed JSON analysis.

CRITICAL STEP 1 — DOCUMENT VALIDATION:
First, determine if this document is actually a resume or CV. A genuine resume/CV contains:
- Personal details (name, contact info)
- Education history
- Work experience
- Skills relevant to employment

If the document is NOT a resume (e.g., research papers, textbooks, marketing documents), immediately return:
{
  "is_resume": false,
  "score": 0,
  "status": "poor",
  "experience": "N/A",
  "skills": [],
  "summary": "This document does not appear to be a resume or CV.",
  "strengths": [],
  "weaknesses": ["This document is not a resume."],
  "recommendations": ["Ask the applicant to submit a proper resume."],
  "extracted_github_username": null
}

CRITICAL STEP 2 — IF IT IS A RESUME:
- Be brutally honest. Do not fabricate strengths. Score based only on evidence.
- Strengths must cite specific evidence from the text.
- Weaknesses must be real skill gaps.

Return JSON EXACTLY:
{
  "is_resume": true | false,
  "score": number (0-100),
  "status": "excellent" | "good" | "average" | "poor",
  "experience": "X years",
  "skills": ["skill1", "skill2"],
  "summary": "Honest summary",
  "strengths": ["evidence-backed strength1", ...],
  "weaknesses": ["real weakness1", ...],
  "recommendations": ["recommendation1", ...],
  "extracted_github_username": "username" | null
}${requirementsText}`;

    // 2. Effort vs Claim Prompt
    const effortSystem = `You are an expert technical evaluator. Analyze the resume specifically for "Effort vs Claim" regarding the applicant's skills.
    
Task:
1. Identify the core skills claimed by the applicant.
2. Search the resume for HARD EVIDENCE of each skill (e.g., specific projects, years of use, complex outcomes).
3. Compute an evidence_score from 0 to 100 representing how strongly evidenced the claim is. (100 = thoroughly proven, 0 = just a keyword drop with zero elaboration).
4. Provide a brief evidence_text summarizing the proof found (or lack thereof).

Return JSON EXACTLY:
{
  "effort_vs_claim": [
    {
      "skill": "Skill Name",
      "evidence_score": 85,
      "evidence_text": "Brief one sentence summary of evidence"
    }
  ]
}`;

    // 3. Timeline Extraction Prompt
    const timelineSystem = `You are a temporal parsing expert. Extract the chronological timeline of the applicant's career, education, and projects from the resume.

Task:
Read the resume and build a comprehensive timeline array. Order from oldest to newest OR newest to oldest (as long as it covers their history). Catch overlaps and gaps.

Return JSON EXACTLY:
{
  "timeline": [
    {
      "type": "education" | "job" | "project",
      "title": "Degree / Job title / Project name",
      "start": "YYYY-MM",
      "end": "YYYY-MM" | "present",
      "description": "Brief 1-2 sentence description"
    }
  ]
}`;

    const userPrompt = `Applicant Name: ${applicantName}
Target Position: ${position || "General Application"}

Document Content:
${resumeText}`;

    console.log("Dispatching 3 parallel AI calls...");

    // Execute all three AI analyses in parallel with graceful error handling
    const [generalResult, effortResult, timelineResult] = await Promise.all([
      callAI(generalSystem, userPrompt),
      callAI(effortSystem, userPrompt).catch(err => {
        console.error("Effort API failed:", err);
        return { effort_vs_claim: [] };
      }),
      callAI(timelineSystem, userPrompt).catch(err => {
        console.error("Timeline API failed:", err);
        return { timeline: [] };
      })
    ]);

    console.log("General Result: ", generalResult);
    console.log("Effort Result: ", effortResult);
    console.log("Timeline Result: ", timelineResult);

    // ── Non-resume rejection gate ──
    if (generalResult.is_resume === false) {
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
        effort_vs_claim: []
      };
      return new Response(
        JSON.stringify({ success: true, analysis: rejectedAnalysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer AI-extracted username; fall back to regex extraction
    const finalGithubUsername = generalResult.extracted_github_username || textExtractedGithub || null;

    // Normalize and validate the AI response
    const score = Math.min(100, Math.max(0, generalResult.score || 0));
    const status = generalResult.status || (score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "average" : "poor");

    const normalizedAnalysis: ResumeAnalysis = {
      is_resume: true,
      score,
      status,
      experience: generalResult.experience || "Not specified",
      skills: Array.isArray(generalResult.skills) ? generalResult.skills : [],
      summary: generalResult.summary || "No summary available",
      strengths: Array.isArray(generalResult.strengths) ? generalResult.strengths : [],
      weaknesses: Array.isArray(generalResult.weaknesses) ? generalResult.weaknesses : [],
      recommendations: Array.isArray(generalResult.recommendations) ? generalResult.recommendations : [],
      extracted_github_username: finalGithubUsername,
      timeline: Array.isArray(timelineResult.timeline) ? timelineResult.timeline : [],
      effort_vs_claim: Array.isArray(effortResult.effort_vs_claim) ? effortResult.effort_vs_claim : []
    };

    console.log("Resume analysis complete:", {
      score: normalizedAnalysis.score,
      timeline_entries: normalizedAnalysis.timeline.length,
      effort_claims: normalizedAnalysis.effort_vs_claim.length
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