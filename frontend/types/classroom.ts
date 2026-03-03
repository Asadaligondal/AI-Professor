export interface Classroom {
  id?: string;
  teacher_id: string;
  name: string;
  subject?: string;
  section?: string;
  description?: string;
  created_at?: any;
  updated_at?: any;
}

export interface NewClassroom {
  name: string;
  subject?: string;
  section?: string;
  description?: string;
}

export default Classroom;
