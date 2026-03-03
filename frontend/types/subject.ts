export interface Subject {
  id?: string;
  name: string;
  code?: string;
  created_at?: any;
  updated_at?: any;
}

export interface NewSubject {
  name: string;
  code?: string;
}

export default Subject;