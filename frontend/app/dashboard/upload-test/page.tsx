"use client";

import { useState } from "react";
import { saveAnswerKeyFile, saveStudentPaperFile } from "@/lib/firestore-client";

export default function UploadTestPage() {
  const [studentUrl, setStudentUrl] = useState<string | null>(null);
  const [answerUrl, setAnswerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const upload = async (file: File, route: string, setter: (v: string) => void) => {
    setLoading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(route, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      console.log("upload response", data);
      // UploadThing typically returns an array of files; adjust as needed
      const url = data?.[0]?.fileUrl || data?.file?.url || data?.fileUrl || data?.url || null;
      setter(url);
      return { url, name: file.name, size: file.size };
    } catch (err) {
      console.error(err);
      alert("Upload failed, check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">UploadThing Test</h2>

      <div className="mb-6">
        <label className="block mb-2">Exam ID</label>
        <input className="mb-2 p-2 border" placeholder="examId" value={examId} onChange={(e) => setExamId(e.target.value)} />

        <label className="block mb-2">Submission ID (student)</label>
        <input className="mb-2 p-2 border" placeholder="submissionId" value={submissionId} onChange={(e) => setSubmissionId(e.target.value)} />

        <label className="block mb-2">Upload Student PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const res = await upload(f, "/api/uploadthing", (v) => setStudentUrl(v));
              if (res?.url) {
                console.log("Uploaded student url", res.url);
                if (examId && submissionId) {
                  await saveStudentPaperFile(examId, submissionId, { url: res.url, name: res.name, size: res.size });
                  setStudentSaved(true);
                  console.log(`Saved studentPaperFile for submissionId=${submissionId}`);
                }
              }
            }
          }}
        />
        {loading && <div className="text-sm text-zinc-500">Uploading...</div>}
        {studentUrl && (
          <div className="mt-2">
            <div className="text-sm">URL:</div>
            <a href={studentUrl} target="_blank" rel="noreferrer" className="text-blue-600">{studentUrl}</a>
            {studentSaved && <div className="text-sm text-green-600">Saved to Firestore ✅</div>}
          </div>
        )}
      </div>

      <div>
        <label className="block mb-2">Upload Answer Key PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const res = await upload(f, "/api/uploadthing", (v) => setAnswerUrl(v));
              if (res?.url) {
                console.log("Uploaded answer key url", res.url);
                if (examId) {
                  await saveAnswerKeyFile(examId, { url: res.url, name: res.name, size: res.size });
                  setAnswerSaved(true);
                  console.log(`Saved answerKeyFile for examId=${examId}`);
                }
              }
            }
          }}
        />
        {loading && <div className="text-sm text-zinc-500">Uploading...</div>}
        {answerUrl && (
          <div className="mt-2">
            <div className="text-sm">URL:</div>
            <a href={answerUrl} target="_blank" rel="noreferrer" className="text-blue-600">{answerUrl}</a>
          </div>
        )}
      </div>
    </div>
  );
}
