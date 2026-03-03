export interface Student {
  id?: string;
  name: string;
  rollNo?: string;
  email?: string;
  created_at?: any;
  updated_at?: any;
}

export interface NewStudent {
  name: string;
  rollNo?: string;
  email?: string;
}

export interface StudentUpdate {
  name?: string;
  rollNo?: string;
  email?: string;
}

export default Student;