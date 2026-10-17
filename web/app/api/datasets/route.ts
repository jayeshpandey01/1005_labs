import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface DatasetFileInfo {
  name: string;
  category: "master" | "pipeline" | "simulation" | "results";
  description: string;
  sizeBytes: number;
  rowCount: number;
  downloadUrl: string;
}

const METADATA_DESCRIPTIONS: Record<string, { category: "master" | "pipeline" | "simulation" | "results"; desc: string }> = {
  "dealers.csv": { category: "master", desc: "677 registered commercial dealers with GPS, territory, and club tier" },
  "officers.csv": { category: "master", desc: "3 Sales Officers (SO-A, SO-B, SO-C) headquarters & coverage boundaries" },
  "dealer_features.csv": { category: "pipeline", desc: "Calculated annual purchases, headroom potential, and de-growth alerts" },
  "ranked_dealers.csv": { category: "pipeline", desc: "Composite scoring (headroom, de-growth, visits) ranking focus dealers" },
  "plan_november.csv": { category: "pipeline", desc: "Sequenced 425 visits for November 2026 with arrival times & TSP routes" },
  "plan_SO-A.csv": { category: "pipeline", desc: "Officer SO-A daily beat schedule & travel minutes" },
  "plan_SO-B.csv": { category: "pipeline", desc: "Officer SO-B daily beat schedule & travel minutes" },
  "plan_SO-C.csv": { category: "pipeline", desc: "Officer SO-C daily beat schedule & travel minutes" },
  "sales_daily.csv": { category: "master", desc: "Historical daily sales transactions across all outlets" },
  "GST_filings.csv": { category: "master", desc: "Monthly GST outward supplies used for dealer revenue proxies" },
  "SFDC_Activities.csv": { category: "master", desc: "Historical Salesforce check-in telemetry" },
  "Baseline_metrics.csv": { category: "master", desc: "Coverage and adherence baseline benchmarks" },
  "Planning_Calendar.csv": { category: "master", desc: "Working days & holiday schedule for November 2026" },
  "product_tiers.csv": { category: "master", desc: "Commercial margin & product hierarchy definitions" },
  "scheme_targets.csv": { category: "master", desc: "Loyalty point thresholds for dealer bonus schemes" },
  "scheme_rules_nonclub.csv": { category: "master", desc: "Incentive scheme rules for Non-Club tier outlets" },
  "visits.csv": { category: "simulation", desc: "Simulation executed visits and adherence status" },
  "cancellations.csv": { category: "simulation", desc: "Cancellation records and dynamic replanning logs" },
  "events_revealed.csv": { category: "simulation", desc: "Dynamic field drop/hike anomalies revealed in real time" },
  "daily.csv": { category: "simulation", desc: "Daily aggregate performance telemetry" },
  "summary.json": { category: "results", desc: "Full simulation summary KPI metrics JSON" },
};

export async function GET() {
  try {
    const datasetList: DatasetFileInfo[] = [];
    const publicCandidates = [
      path.join(process.cwd(), "public"),
      path.join(process.cwd(), "web", "public"),
      path.join(__dirname, "..", "..", "..", "public"),
      path.join(__dirname, "..", "..", "..", "web", "public"),
    ];
    const publicDir = publicCandidates.find((p) => fs.existsSync(p)) || path.join(process.cwd(), "public");

    // 1. Scan public/data/csv
    const csvDir = path.join(publicDir, "data", "csv");
    if (fs.existsSync(csvDir)) {
      const files = fs.readdirSync(csvDir).filter((f) => f.endsWith(".csv"));
      for (const file of files) {
        const filePath = path.join(csvDir, file);
        const stat = fs.statSync(filePath);
        let lineCount = 0;
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          lineCount = content.split("\n").filter((l) => l.trim().length > 0).length - 1;
          if (lineCount < 0) lineCount = 0;
        } catch {
          lineCount = 0;
        }

        const meta = METADATA_DESCRIPTIONS[file] || {
          category: "master" as const,
          desc: "Raw CSV dataset table",
        };

        datasetList.push({
          name: file,
          category: meta.category,
          description: meta.desc,
          sizeBytes: stat.size,
          rowCount: lineCount,
          downloadUrl: `/data/csv/${file}`,
        });
      }
    }

    // 2. Scan public/data/results subdirectories (seed_1, seed_2, seed_3, seed_1_static)
    const resultsDir = path.join(publicDir, "data", "results");
    if (fs.existsSync(resultsDir)) {
      const seedDirs = fs.readdirSync(resultsDir).filter((d) => {
        const full = path.join(resultsDir, d);
        return fs.statSync(full).isDirectory();
      });

      for (const seedDir of seedDirs) {
        const fullSeedDir = path.join(resultsDir, seedDir);
        const files = fs.readdirSync(fullSeedDir);

        for (const file of files) {
          const filePath = path.join(fullSeedDir, file);
          const stat = fs.statSync(filePath);
          let rowCount = 0;

          if (file.endsWith(".csv")) {
            try {
              const content = fs.readFileSync(filePath, "utf-8");
              rowCount = content.split("\n").filter((l) => l.trim().length > 0).length - 1;
              if (rowCount < 0) rowCount = 0;
            } catch {
              rowCount = 0;
            }
          }

          datasetList.push({
            name: `${seedDir}/${file}`,
            category: "results",
            description: `Simulation ${seedDir.replace(/_/g, " ")} execution record (${file})`,
            sizeBytes: stat.size,
            rowCount,
            downloadUrl: `/data/results/${seedDir}/${file}`,
          });
        }
      }
    }

    // Sort order: master -> pipeline -> simulation -> results
    const categoryOrder = { master: 1, pipeline: 2, simulation: 3, results: 4 };
    datasetList.sort((a, b) => {
      const catA = categoryOrder[a.category] || 9;
      const catB = categoryOrder[b.category] || 9;
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ files: datasetList }, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/datasets] Error listing datasets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
