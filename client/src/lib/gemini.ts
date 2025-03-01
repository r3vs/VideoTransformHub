import { Material } from "@shared/schema";

export async function analyzeContent(content: string, type: string): Promise<{
  analysis: string;
  summary: string;
}> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type })
    });

    if (!res.ok) throw new Error("Analysis failed");
    return await res.json();
  } catch (error) {
    console.error("Content analysis error:", error);
    return {
      analysis: "Analysis failed",
      summary: "Summary not available"
    };
  }
}

export function extractKeyPoints(material: Material): string[] {
  if (!material.analysis) return [];
  // Simple extraction of bullet points from analysis
  return material.analysis
    .split("\n")
    .filter(line => line.startsWith("- "))
    .map(line => line.substring(2));
}
