/**
 * Score & aggregation utilities — Performance v1
 */

/** Safe percentage: returns 0 when divisor is 0 or falsy */
export function percent(earned: number, max: number): number {
  if (!max || max <= 0) return 0;
  return (earned / max) * 100;
}

/** Average of an array of numbers, returns 0 for an empty array */
export function safeAvg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export interface StudentStat {
  studentId: string;       // roster student id (or "unassigned")
  studentName: string;
  rollNo: string;
  examsTaken: number;
  avgPercent: number;
  bestPercent: number;
  worstPercent: number;
}

/**
 * Build a per-student leaderboard from graded submissions and roster students.
 *
 * Matching strategy (in order):
 *  1. match submission.roll_number === roster student.rollNo  (case-insensitive trim)
 *  2. match submission.student_name === roster student.name   (case-insensitive trim)
 *  3. bucket as "Unassigned" if no roster match
 */
export function aggregateStudentStats(
  /** flat array: every submission across all classroom exams */
  submissions: Array<{
    student_name: string;
    roll_number?: string;
    total_score?: number | null;
    percentage?: number | null;
    grade_status?: string;
    grade_json?: Record<string, any> | null;
  }>,
  /** roster students from the classroom */
  rosterStudents: Array<{ id?: string; name: string; rollNo?: string }>,
): StudentStat[] {
  // Build lookup maps for roster
  const rollMap = new Map<string, { id: string; name: string; rollNo: string }>();
  const nameMap = new Map<string, { id: string; name: string; rollNo: string }>();

  for (const s of rosterStudents) {
    const entry = { id: s.id ?? "", name: s.name, rollNo: s.rollNo ?? "" };
    if (s.rollNo) rollMap.set(s.rollNo.trim().toLowerCase(), entry);
    if (s.name) nameMap.set(s.name.trim().toLowerCase(), entry);
  }

  // bucket submissions → roster student id
  const buckets = new Map<string, { name: string; rollNo: string; percents: number[] }>();

  for (const sub of submissions) {
    // Only count graded submissions
    if (sub.grade_status !== "graded" && sub.grade_status !== "completed") continue;

    const pct = sub.percentage ?? 0;
    const rollKey = (sub.roll_number ?? "").trim().toLowerCase();
    const nameKey = (sub.student_name ?? "").trim().toLowerCase();

    let matchId = "unassigned";
    let matchName = sub.student_name || "Unknown";
    let matchRoll = sub.roll_number || "";

    if (rollKey && rollMap.has(rollKey)) {
      const r = rollMap.get(rollKey)!;
      matchId = r.id;
      matchName = r.name;
      matchRoll = r.rollNo;
    } else if (nameKey && nameMap.has(nameKey)) {
      const r = nameMap.get(nameKey)!;
      matchId = r.id;
      matchName = r.name;
      matchRoll = r.rollNo;
    }

    if (!buckets.has(matchId)) {
      buckets.set(matchId, { name: matchName, rollNo: matchRoll, percents: [] });
    }
    buckets.get(matchId)!.percents.push(pct);
  }

  // Convert to stats array
  const stats: StudentStat[] = [];
  for (const [id, { name, rollNo, percents }] of buckets) {
    stats.push({
      studentId: id,
      studentName: name,
      rollNo,
      examsTaken: percents.length,
      avgPercent: safeAvg(percents),
      bestPercent: Math.max(...percents),
      worstPercent: Math.min(...percents),
    });
  }

  // Sort by avgPercent desc
  stats.sort((a, b) => b.avgPercent - a.avgPercent);
  return stats;
}

/**
 * Count questions flagged for review across all submissions of an exam.
 * Looks for needsReview === true or confidence < 0.6 in grade_json.results[].
 */
export function countNeedsReview(
  submissions: Array<{ grade_json?: Record<string, any> | null }>,
): number {
  let count = 0;
  for (const sub of submissions) {
    const questions: any[] = sub.grade_json?.results || sub.grade_json?.questions || [];
    for (const q of questions) {
      if (q.needsReview === true || (typeof q.confidence === "number" && q.confidence < 0.6)) {
        count++;
      }
    }
  }
  return count;
}
