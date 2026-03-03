"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Student, NewStudent } from "@/types/student";

interface StudentFormDialogProps {
  children: React.ReactNode;
  student?: Student | null;
  onSubmit: (data: NewStudent) => Promise<void>;
  existingRollNumbers: string[];
}

export default function StudentFormDialog({
  children,
  student,
  onSubmit,
  existingRollNumbers
}: StudentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!student;

  useEffect(() => {
    if (open) {
      // Reset or populate form when dialog opens
      if (student) {
        setName(student.name || "");
        setRollNo(student.rollNo || "");
        setEmail(student.email || "");
      } else {
        setName("");
        setRollNo("");
        setEmail("");
      }
    }
  }, [open, student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Check for duplicate roll number (excluding current student in edit mode)
    if (rollNo.trim()) {
      const isDuplicate = existingRollNumbers.some(existing => 
        existing === rollNo.trim() && (!student || student.rollNo !== rollNo.trim())
      );
      if (isDuplicate) {
        toast.error("Roll No already exists in this classroom");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        rollNo: rollNo.trim() || undefined,
        email: email.trim() || undefined,
      });
      setOpen(false);
    } catch (err) {
      console.error("Failed to save student:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Add New Student"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter student name"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Roll Number</Label>
            <Input
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="Enter roll number (optional)"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email (optional)"
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEdit ? "Update" : "Add"} Student
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}