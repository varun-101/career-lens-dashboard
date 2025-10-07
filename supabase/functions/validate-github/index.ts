import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GitHubRepo {
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  fork: boolean;
}

interface GitHubUser {
  login: string;
  created_at: string;
  public_repos: number;
  followers: number;
  following: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { githubUsername, applicantName } = await req.json();
    
    if (!githubUsername || !applicantName) {
      return new Response(
        JSON.stringify({ error: "GitHub username and applicant name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Validating GitHub profile for: ${githubUsername}`);

    // Fetch GitHub user data
    const userResponse = await fetch(`https://api.github.com/users/${githubUsername}`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Resume-Analyzer"
      }
    });

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: "GitHub user not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`GitHub API error: ${userResponse.status}`);
    }

    const userData: GitHubUser = await userResponse.json();
    
    // Fetch repositories
    const reposResponse = await fetch(
      `https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`,
      {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Resume-Analyzer"
        }
      }
    );

    if (!reposResponse.ok) {
      throw new Error(`Failed to fetch repositories: ${reposResponse.status}`);
    }

    const repos: GitHubRepo[] = await reposResponse.json();

    // Calculate account age
    const accountCreated = new Date(userData.created_at);
    const now = new Date();
    const accountAgeDays = Math.floor((now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));

    // Analyze repositories
    const originalRepos = repos.filter(r => !r.fork);
    const forkedRepos = repos.filter(r => r.fork);
    
    // Get recent activity (repos with commits in last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentlyActive = repos.filter(r => new Date(r.pushed_at) > sixMonthsAgo).length;

    // Detect suspicious patterns
    const suspiciouslyNewAccount = accountAgeDays < 30 && repos.length > 10;
    const tooManyForks = forkedRepos.length > originalRepos.length * 2;
    const noRecentActivity = recentlyActive === 0 && repos.length > 0;
    const lowStarRatio = repos.length > 5 && repos.reduce((sum, r) => sum + r.stargazers_count, 0) < 3;

    // Prepare data for AI analysis
    const analysisContext = {
      username: githubUsername,
      accountAgeDays,
      totalRepos: repos.length,
      originalRepos: originalRepos.length,
      forkedRepos: forkedRepos.length,
      followers: userData.followers,
      following: userData.following,
      recentlyActive,
      languages: [...new Set(repos.map(r => r.language).filter(Boolean))],
      suspiciousPatterns: {
        newAccountHighRepos: suspiciouslyNewAccount,
        highForkRatio: tooManyForks,
        noRecentActivity,
        lowEngagement: lowStarRatio
      }
    };

    console.log("Analysis context:", JSON.stringify(analysisContext));

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiPrompt = `You are a technical recruiter analyzing a GitHub profile for authenticity. 

Profile Data:
- Username: ${githubUsername}
- Account Age: ${accountAgeDays} days
- Total Repositories: ${repos.length}
- Original Repos: ${originalRepos.length}
- Forked Repos: ${forkedRepos.length}
- Followers: ${userData.followers}
- Following: ${userData.following}
- Recently Active Repos (last 6 months): ${recentlyActive}
- Programming Languages: ${analysisContext.languages.join(", ") || "None detected"}

Suspicious Indicators:
- New account with many repos: ${suspiciouslyNewAccount}
- High fork ratio: ${tooManyForks}
- No recent activity: ${noRecentActivity}
- Low engagement: ${lowStarRatio}

Analyze this profile and provide:
1. An authenticity score (0-100) where 100 is most authentic
2. List of red flags (concerns about authenticity)
3. List of positive indicators (signs of genuine developer)
4. A brief summary (2-3 sentences)

Focus on detecting:
- Copy-paste portfolios (all forks, no commits)
- Inactive accounts suddenly active before job application
- Fake contributions or plagiarized projects
- Genuine developers with consistent contribution history

Respond in JSON format:
{
  "score": <number 0-100>,
  "redFlags": [<string>, ...],
  "positiveIndicators": [<string>, ...],
  "summary": "<string>"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a technical recruiter expert at analyzing GitHub profiles for authenticity. Always respond with valid JSON."
          },
          {
            role: "user",
            content: aiPrompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error("No response from AI");
    }

    // Parse AI response
    let analysisResult;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : aiContent;
      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Failed to parse AI analysis");
    }

    // Estimate total commits (simplified - would need GitHub API v4 GraphQL for accurate count)
    const estimatedCommits = originalRepos.length * 10; // Rough estimate

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: validationData, error: dbError } = await supabase
      .from("github_validations")
      .insert({
        applicant_name: applicantName,
        github_username: githubUsername,
        authenticity_score: analysisResult.score,
        total_repos: repos.length,
        total_commits: estimatedCommits,
        account_age_days: accountAgeDays,
        copied_projects_detected: forkedRepos.length,
        analysis_summary: analysisResult.summary,
        red_flags: analysisResult.redFlags || [],
        positive_indicators: analysisResult.positiveIndicators || []
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save validation: ${dbError.message}`);
    }

    console.log("Validation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        validation: validationData,
        githubData: {
          accountAge: accountAgeDays,
          totalRepos: repos.length,
          originalRepos: originalRepos.length,
          forkedRepos: forkedRepos.length,
          languages: analysisContext.languages
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in validate-github function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
